import { initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  QueryDocumentSnapshot,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DateTime } from 'luxon';
import Twilio from 'twilio';

initializeApp();

const db = getFirestore();

const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = defineSecret('TWILIO_FROM_NUMBER');

type ReminderStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

interface ReminderConfig {
  enabled?: boolean;
  hoursBefore?: number;
  sendTime?: string;
  messageTemplate?: string;
}

interface ServiceEventDoc {
  topic: string;
  description?: string;
  location?: string;
  startAt: Timestamp;
  status?: string;
  timeZone?: string;
  assignedVolunteerIds?: string[];
  reminderConfig?: ReminderConfig;
}

interface VolunteerDoc {
  name?: string;
  phoneNumber?: string;
  email?: string;
}

interface ReminderDoc {
  eventId: string;
  volunteerId: string;
  phoneNumber: string;
  message: string;
  reminderTime: Timestamp;
  status: ReminderStatus;
  twilioSid?: string;
  sentAt?: Timestamp;
  errorMessage?: string;
}

let twilioClient: ReturnType<typeof Twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = Twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
  }

  return twilioClient;
}

function buildReminderId(eventId: string, volunteerId: string) {
  return `${eventId}_${volunteerId}`;
}

function renderTemplate(template: string, context: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '');
}

function calculateReminderTime(serviceEvent: ServiceEventDoc) {
  const timeZone = serviceEvent.timeZone || 'America/New_York';
  const eventStart = DateTime.fromJSDate(serviceEvent.startAt.toDate(), { zone: timeZone });
  const hoursBefore = Math.max(0, Number(serviceEvent.reminderConfig?.hoursBefore || 0));
  const baseReminderTime = eventStart.minus({ hours: hoursBefore });
  const sendTime = serviceEvent.reminderConfig?.sendTime || '';

  if (!sendTime) {
    return baseReminderTime.toJSDate();
  }

  const [hour, minute] = sendTime.split(':').map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return baseReminderTime.toJSDate();
  }

  const scheduledReminder = baseReminderTime.set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });

  return (scheduledReminder <= eventStart ? scheduledReminder : baseReminderTime).toJSDate();
}

function buildReminderMessage(serviceEvent: ServiceEventDoc, volunteer: VolunteerDoc) {
  const timeZone = serviceEvent.timeZone || 'America/New_York';
  const eventStart = DateTime.fromJSDate(serviceEvent.startAt.toDate(), { zone: timeZone });
  const template =
    serviceEvent.reminderConfig?.messageTemplate ||
    'Hi {{name}}, this is a reminder for {{topic}} on {{date}} at {{time}}.';

  return renderTemplate(template, {
    name: volunteer.name || 'Volunteer',
    topic: serviceEvent.topic || 'service event',
    date: eventStart.toLocaleString(DateTime.DATE_MED),
    time: eventStart.toLocaleString(DateTime.TIME_SIMPLE),
    location: serviceEvent.location || '',
  });
}

async function cancelPendingReminders(eventId: string, reason: string) {
  const snapshot = await db.collection('reminders').where('eventId', '==', eventId).get();
  const cancellableStatuses = new Set<ReminderStatus>(['pending', 'failed', 'processing']);

  await Promise.all(
    snapshot.docs
      .filter((entry) => cancellableStatuses.has((entry.data() as ReminderDoc).status))
      .map((entry) =>
        entry.ref.set(
          {
            status: 'cancelled',
            cancelReason: reason,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      ),
  );
}

export const syncEventReminders = onDocumentWritten(
  {
    document: 'serviceEvents/{eventId}',
    region: 'us-central1',
  },
  async (event) => {
    const eventId = event.params.eventId;
    const afterSnapshot = event.data?.after;

    if (!afterSnapshot?.exists) {
      await cancelPendingReminders(eventId, 'Service event deleted');
      return;
    }

    const serviceEvent = afterSnapshot.data() as ServiceEventDoc;
    const assignedVolunteerIds = serviceEvent.assignedVolunteerIds || [];
    const remindersEnabled =
      serviceEvent.reminderConfig?.enabled &&
      assignedVolunteerIds.length > 0 &&
      !['cancelled', 'completed'].includes(serviceEvent.status || '');

    if (!remindersEnabled) {
      await cancelPendingReminders(eventId, 'Reminders disabled or event closed');
      return;
    }

    const reminderSnapshot = await db.collection('reminders').where('eventId', '==', eventId).get();
    const existingReminderIds = new Set(reminderSnapshot.docs.map((entry) => entry.id));
    const existingReminderMap = new Map(
      reminderSnapshot.docs.map((entry) => [entry.id, entry.data() as ReminderDoc]),
    );
    const assignedVolunteerSet = new Set(assignedVolunteerIds);

    const volunteerSnapshots = await Promise.all(
      assignedVolunteerIds.map((volunteerId) => db.collection('volunteers').doc(volunteerId).get()),
    );

    await Promise.all(
      volunteerSnapshots.map(async (volunteerSnapshot) => {
        const volunteerId = volunteerSnapshot.id;
        const volunteer = (volunteerSnapshot.data() || {}) as VolunteerDoc;
        const reminderId = buildReminderId(eventId, volunteerId);
        const reminderRef = db.collection('reminders').doc(reminderId);
        const existingReminder = existingReminderMap.get(reminderId);

        existingReminderIds.delete(reminderId);

        await reminderRef.set(
          {
            eventId,
            volunteerId,
            phoneNumber: String(volunteer.phoneNumber || '').trim(),
            message: buildReminderMessage(serviceEvent, volunteer),
            reminderTime: Timestamp.fromDate(calculateReminderTime(serviceEvent)),
            status: existingReminder?.status === 'sent' ? 'sent' : 'pending',
            updatedAt: FieldValue.serverTimestamp(),
            ...(existingReminder ? {} : { createdAt: FieldValue.serverTimestamp() }),
          },
          { merge: true },
        );
      }),
    );

    await Promise.all(
      reminderSnapshot.docs
        .filter((entry) => {
          const reminder = entry.data() as ReminderDoc;
          return (
            reminder.status !== 'sent' &&
            (existingReminderIds.has(entry.id) || !assignedVolunteerSet.has(reminder.volunteerId))
          );
        })
        .map((entry) =>
          entry.ref.set(
            {
              status: 'cancelled',
              cancelReason: 'Volunteer unassigned from event',
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        ),
    );

    logger.info('Reminder documents synced', {
      eventId,
      volunteerCount: assignedVolunteerIds.length,
    });
  },
);

async function claimReminder(snapshot: QueryDocumentSnapshot) {
  return db.runTransaction(async (transaction) => {
    const freshSnapshot = await transaction.get(snapshot.ref);

    if (!freshSnapshot.exists) {
      return null;
    }

    const reminder = freshSnapshot.data() as ReminderDoc;

    if (reminder.status !== 'pending') {
      return null;
    }

    transaction.set(
      snapshot.ref,
      {
        status: 'processing',
        processingAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return reminder;
  });
}

export const sendDueReminders = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/New_York',
    region: 'us-central1',
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER],
  },
  async () => {
    const dueSnapshot = await db
      .collection('reminders')
      .where('status', '==', 'pending')
      .where('reminderTime', '<=', Timestamp.now())
      .limit(50)
      .get();

    if (dueSnapshot.empty) {
      logger.info('No pending reminders were due.');
      return;
    }

    const client = getTwilioClient();

    for (const reminderSnapshot of dueSnapshot.docs) {
      const reminder = (await claimReminder(reminderSnapshot)) as ReminderDoc | null;

      if (!reminder) {
        continue;
      }

      try {
        if (!reminder.phoneNumber) {
          throw new Error('Volunteer is missing a phone number.');
        }

        const sms = await client.messages.create({
          to: reminder.phoneNumber,
          from: TWILIO_FROM_NUMBER.value(),
          body: reminder.message,
        });

        await Promise.all([
          reminderSnapshot.ref.set(
            {
              status: 'sent',
              sentAt: FieldValue.serverTimestamp(),
              twilioSid: sms.sid,
              errorMessage: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
          db.collection('sentMessages').add({
            reminderId: reminderSnapshot.id,
            eventId: reminder.eventId,
            volunteerId: reminder.volunteerId,
            phoneNumber: reminder.phoneNumber,
            message: reminder.message,
            status: 'sent',
            twilioSid: sms.sid,
            twilioStatus: sms.status,
            processedAt: FieldValue.serverTimestamp(),
          }),
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Twilio error';

        logger.error('Reminder send failed', {
          reminderId: reminderSnapshot.id,
          errorMessage,
        });

        await Promise.all([
          reminderSnapshot.ref.set(
            {
              status: 'failed',
              errorMessage,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
          db.collection('sentMessages').add({
            reminderId: reminderSnapshot.id,
            eventId: reminder.eventId,
            volunteerId: reminder.volunteerId,
            phoneNumber: reminder.phoneNumber,
            message: reminder.message,
            status: 'failed',
            errorMessage,
            processedAt: FieldValue.serverTimestamp(),
          }),
        ]);
      }
    }
  },
);

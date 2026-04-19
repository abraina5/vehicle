import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { EventList } from '../components/EventList';
import { db } from '../firebase/client';
import {
  calculateReminderPreview,
  createDateFromInputs,
  splitDateTime,
} from '../helpers/date';
import {
  DEFAULT_REMINDER_TEMPLATE,
  renderReminderPreview,
} from '../helpers/reminders';

const initialFormState = {
  id: null,
  topic: '',
  description: '',
  location: '',
  date: '',
  time: '',
  status: 'scheduled',
  assignedVolunteerIds: [],
  reminderEnabled: true,
  hoursBefore: 24,
  sendTime: '09:00',
  messageTemplate: DEFAULT_REMINDER_TEMPLATE,
};

export function AdminDashboard({ user }) {
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribeVolunteers = onSnapshot(
      query(collection(db, 'volunteers'), orderBy('name')),
      (snapshot) => {
        const volunteerRecords = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        setVolunteers(volunteerRecords);
      },
      (snapshotError) => setError(snapshotError.message),
    );

    const unsubscribeEvents = onSnapshot(
      query(collection(db, 'serviceEvents'), orderBy('startAt')),
      (snapshot) => {
        const serviceEvents = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        setEvents(serviceEvents);
      },
      (snapshotError) => setError(snapshotError.message),
    );

    return () => {
      unsubscribeVolunteers();
      unsubscribeEvents();
    };
  }, []);

  const volunteersById = useMemo(
    () => Object.fromEntries(volunteers.map((volunteer) => [volunteer.id, volunteer])),
    [volunteers],
  );

  const reminderPreview = calculateReminderPreview(
    form.date,
    form.time,
    form.hoursBefore,
    form.sendTime,
  );

  const sampleMessage = renderReminderPreview(form.messageTemplate, {
    name: 'Alex',
    topic: form.topic || 'Community Service',
    date: form.date || '2026-05-01',
    time: form.time || '10:00',
  });

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function toggleVolunteer(volunteerId) {
    setForm((current) => {
      const alreadySelected = current.assignedVolunteerIds.includes(volunteerId);

      return {
        ...current,
        assignedVolunteerIds: alreadySelected
          ? current.assignedVolunteerIds.filter((id) => id !== volunteerId)
          : [...current.assignedVolunteerIds, volunteerId],
      };
    });
  }

  function startEditing(eventRecord) {
    const { date, time } = splitDateTime(eventRecord.startAt);

    setForm({
      id: eventRecord.id,
      topic: eventRecord.topic ?? '',
      description: eventRecord.description ?? '',
      location: eventRecord.location ?? '',
      date,
      time,
      status: eventRecord.status ?? 'scheduled',
      assignedVolunteerIds: eventRecord.assignedVolunteerIds ?? [],
      reminderEnabled: eventRecord.reminderConfig?.enabled ?? true,
      hoursBefore: eventRecord.reminderConfig?.hoursBefore ?? 24,
      sendTime: eventRecord.reminderConfig?.sendTime ?? '09:00',
      messageTemplate:
        eventRecord.reminderConfig?.messageTemplate ?? DEFAULT_REMINDER_TEMPLATE,
    });
  }

  function resetForm() {
    setForm(initialFormState);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const startAt = createDateFromInputs(form.date, form.time);

      if (!startAt) {
        throw new Error('Choose both a service date and time.');
      }

      const payload = {
        topic: form.topic.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startAt,
        status: form.status,
        assignedVolunteerIds: form.assignedVolunteerIds,
        reminderConfig: {
          enabled: form.reminderEnabled,
          hoursBefore: Number(form.hoursBefore || 0),
          sendTime: form.sendTime,
          messageTemplate: form.messageTemplate.trim(),
        },
        timeZone: 'America/New_York',
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (form.id) {
        await setDoc(doc(db, 'serviceEvents', form.id), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'serviceEvents'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
      }

      resetForm();
    } catch (submitError) {
      setError(submitError.message || 'Unable to save the service event.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card form-card">
        <div className="card-header-row">
          <div>
            <p className="eyebrow">Admin Tools</p>
            <h2>{form.id ? 'Edit service event' : 'Create service event'}</h2>
          </div>
          {form.id && (
            <button className="secondary-button" type="button" onClick={resetForm}>
              New event
            </button>
          )}
        </div>

        {error && <p className="error-banner">{error}</p>}

        <form className="stacked-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Topic</span>
            <input
              name="topic"
              placeholder="Sunday meal service"
              required
              value={form.topic}
              onChange={updateField}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              placeholder="Light volunteer briefing and meal packaging"
              rows="3"
              value={form.description}
              onChange={updateField}
            />
          </label>

          <label className="field">
            <span>Location</span>
            <input
              name="location"
              placeholder="Community kitchen"
              value={form.location}
              onChange={updateField}
            />
          </label>

          <div className="split-fields">
            <label className="field">
              <span>Date</span>
              <input name="date" required type="date" value={form.date} onChange={updateField} />
            </label>

            <label className="field">
              <span>Time</span>
              <input name="time" required type="time" value={form.time} onChange={updateField} />
            </label>
          </div>

          <label className="field">
            <span>Status</span>
            <select name="status" value={form.status} onChange={updateField}>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <fieldset className="selection-group">
            <legend>Assign volunteers</legend>
            <div className="checkbox-grid">
              {volunteers.map((volunteer) => (
                <label className="checkbox-row" key={volunteer.id}>
                  <input
                    checked={form.assignedVolunteerIds.includes(volunteer.id)}
                    type="checkbox"
                    onChange={() => toggleVolunteer(volunteer.id)}
                  />
                  <span>
                    {volunteer.name || volunteer.email}
                    <small>{volunteer.phoneNumber || 'No phone yet'}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="selection-group">
            <legend>Reminder rule</legend>

            <label className="checkbox-row">
              <input
                checked={form.reminderEnabled}
                name="reminderEnabled"
                type="checkbox"
                onChange={updateField}
              />
              <span>
                Send SMS reminders
                <small>Cloud Functions turns this rule into reminder documents.</small>
              </span>
            </label>

            <div className="split-fields">
              <label className="field">
                <span>Hours before event</span>
                <input
                  min="0"
                  name="hoursBefore"
                  type="number"
                  value={form.hoursBefore}
                  onChange={updateField}
                />
              </label>

              <label className="field">
                <span>Preferred send time</span>
                <input name="sendTime" type="time" value={form.sendTime} onChange={updateField} />
              </label>
            </div>

            <label className="field">
              <span>SMS message template</span>
              <textarea
                name="messageTemplate"
                rows="4"
                value={form.messageTemplate}
                onChange={updateField}
              />
            </label>

            <p className="helper-text">
              Reminder preview: {reminderPreview || 'Select an event date and time'}
            </p>
            <p className="helper-text">
              Sample SMS: <span className="sample-message">{sampleMessage}</span>
            </p>
          </fieldset>

          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : form.id ? 'Update event' : 'Create event'}
          </button>
        </form>
      </section>

      <section className="dashboard-card">
        <p className="eyebrow">Volunteer Directory</p>
        <h2>Volunteer profiles</h2>
        <div className="card-grid">
          {volunteers.map((volunteer) => (
            <article className="mini-card" key={volunteer.id}>
              <h3>{volunteer.name || 'Unnamed volunteer'}</h3>
              <p>{volunteer.email}</p>
              <p>{volunteer.phoneNumber || 'No phone number yet'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-card">
        <p className="eyebrow">Upcoming Work</p>
        <h2>All service events</h2>
        <EventList
          emptyMessage="No service events have been created yet."
          events={events}
          onEdit={startEditing}
          showAssignments
          showReminder
          volunteersById={volunteersById}
        />
      </section>
    </div>
  );
}

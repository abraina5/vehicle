"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const ALLOWED_ORIGIN = process.env.MESSAGE_ALLOWED_ORIGIN || "*";
const LOCAL_SMS_MODE = String(process.env.LOCAL_SMS_MODE || "").trim().toLowerCase();
const IS_FUNCTIONS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";

let twilioClient = null;

function applyCors(response) {
  response.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
}

function normalizePhoneNumber(phoneNumber) {
  const rawPhoneNumber = String(phoneNumber || "").trim();

  if (!rawPhoneNumber) {
    return "";
  }

  const digitsOnly = rawPhoneNumber.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (rawPhoneNumber.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  if (rawPhoneNumber.startsWith("00")) {
    return `+${digitsOnly.replace(/^00/, "")}`;
  }

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return digitsOnly;
}

function maskPhoneNumber(phoneNumber) {
  const digitsOnly = String(phoneNumber || "").replace(/\D/g, "");

  if (digitsOnly.length <= 4) {
    return digitsOnly ? `***${digitsOnly}` : "unknown";
  }

  return `***${digitsOnly.slice(-4)}`;
}

async function getPhoneNumberFromRecord(recordId) {
  const snapshot = await admin.database().ref(`records/${recordId}`).once("value");

  if (!snapshot.exists()) {
    throw new Error("The selected vehicle record could not be found.");
  }

  const record = snapshot.val() || {};
  const phoneNumber = normalizePhoneNumber(record.phoneNumber);

  if (!phoneNumber) {
    throw new Error("No contact phone number is available for this vehicle.");
  }

  return {
    phoneNumber,
    plateNumber: String(record.plateNumber || "").trim(),
  };
}

function validatePayload(body) {
  const recordId = String(body?.recordId || "").trim();
  const phoneNumber = normalizePhoneNumber(body?.phoneNumber);
  const plateNumber = String(body?.plateNumber || "").trim();
  const message = String(body?.message || "").trim();

  if (!recordId && !phoneNumber) {
    return { error: "A vehicle record or destination phone number is required." };
  }

  if (!message) {
    return { error: "Message text cannot be empty." };
  }

  if (message.length > 500) {
    return { error: "Message text is too long. Please keep it under 500 characters." };
  }

  return {
    recordId,
    phoneNumber,
    plateNumber,
    message,
  };
}

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
    );
  }

  if (!twilioClient) {
    const twilio = require("twilio");
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }

  return twilioClient;
}

function shouldMockSms() {
  if (!IS_FUNCTIONS_EMULATOR) {
    return false;
  }

  if (LOCAL_SMS_MODE === "live") {
    return false;
  }

  if (LOCAL_SMS_MODE === "mock") {
    return true;
  }

  return !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER;
}

async function sendSmsMessage(destinationPhoneNumber, messageBody) {
  if (shouldMockSms()) {
    const mockSid = `SM-MOCK-${Date.now()}`;
    logger.info("Vehicle message simulated in emulator", {
      sid: mockSid,
      to: maskPhoneNumber(destinationPhoneNumber),
      localSmsMode: LOCAL_SMS_MODE || "auto-mock",
    });

    return {
      sid: mockSid,
      status: "sent",
      mock: true,
      body: messageBody,
    };
  }

  const client = getTwilioClient();
  return client.messages.create({
    to: destinationPhoneNumber,
    from: TWILIO_FROM_NUMBER,
    body: messageBody,
  });
}

exports.sendVehicleMessage = onRequest({ region: "us-central1" }, async (request, response) => {
  applyCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Only POST requests are supported." });
    return;
  }

  const payload = validatePayload(request.body);
  if (payload.error) {
    response.status(400).json({ error: payload.error });
    return;
  }

  try {
    let destinationPhoneNumber = payload.phoneNumber;
    let plateNumber = payload.plateNumber;

    if (!destinationPhoneNumber && payload.recordId) {
      const recordContact = await getPhoneNumberFromRecord(payload.recordId);
      destinationPhoneNumber = recordContact.phoneNumber;
      plateNumber = plateNumber || recordContact.plateNumber;
    }

    const twilioMessage = await sendSmsMessage(
      destinationPhoneNumber,
      payload.message,
    );

    logger.info("Vehicle message sent", {
      sid: twilioMessage.sid,
      plateNumber: plateNumber || null,
      to: maskPhoneNumber(destinationPhoneNumber),
      mode: twilioMessage.mock ? "mock" : "twilio",
    });

    response.status(200).json({
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
      mock: Boolean(twilioMessage.mock),
    });
  } catch (error) {
    logger.error("Vehicle message send failed", error);
    response.status(500).json({
      error: error.message || "Failed to send the SMS message.",
    });
  }
});

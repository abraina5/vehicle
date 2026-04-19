"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const ALLOWED_ORIGIN = process.env.MESSAGE_ALLOWED_ORIGIN || "*";

let twilioClient = null;

function applyCors(response) {
  response.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
}

function normalizePhoneNumber(phoneNumber) {
  const normalized = String(phoneNumber || "").replace(/[^\d+]/g, "");
  return normalized;
}

function validatePayload(body) {
  const phoneNumber = normalizePhoneNumber(body?.phoneNumber);
  const plateNumber = String(body?.plateNumber || "").trim();
  const message = String(body?.message || "").trim();

  if (!phoneNumber) {
    return { error: "A destination phone number is required." };
  }

  if (!message) {
    return { error: "Message text cannot be empty." };
  }

  if (message.length > 500) {
    return { error: "Message text is too long. Please keep it under 500 characters." };
  }

  return {
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
    const client = getTwilioClient();
    const twilioMessage = await client.messages.create({
      to: payload.phoneNumber,
      from: TWILIO_FROM_NUMBER,
      body: payload.message,
    });

    logger.info("Vehicle message sent", {
      sid: twilioMessage.sid,
      plateNumber: payload.plateNumber || null,
      to: payload.phoneNumber,
    });

    response.status(200).json({
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status,
    });
  } catch (error) {
    logger.error("Vehicle message send failed", error);
    response.status(500).json({
      error: error.message || "Failed to send the SMS message.",
    });
  }
});

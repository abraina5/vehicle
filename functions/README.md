# Messaging Backend

This folder contains a Firebase Cloud Function for sending SMS messages through Twilio.

## Environment Variables

Set these before deploying:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `MESSAGE_ALLOWED_ORIGIN` (optional)

## Local Install

```bash
cd functions
npm install
```

## Deploy

```bash
firebase deploy --only functions
```

## Frontend Endpoint

The frontend is configured to call:

```text
https://us-central1-templecars.cloudfunctions.net/sendVehicleMessage
```

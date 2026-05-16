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

## Local End-to-End Testing

Use the Firebase Local Emulator Suite from the repo root:

```bash
firebase emulators:start --config firebase.local.json --project templecars
```

On Windows PowerShell, the simplest option is:

```powershell
.\start-vehicle-local.cmd
```

That helper script:

- avoids the PowerShell `firebase.ps1` execution-policy problem by calling `firebase.cmd`
- keeps Firebase CLI config in a repo-local `.firebase-config` folder
- starts the fullest local mode your machine supports:
- with Java installed: full local hosting + functions + Realtime Database + Auth
- without Java: hybrid mode with local hosting + local functions and live Firebase auth/database

This starts:

- Hosting emulator on `http://127.0.0.1:5000`
- Auth emulator on `127.0.0.1:9099`
- Realtime Database emulator on `127.0.0.1:9000`
- Functions emulator on `127.0.0.1:5001`
- Emulator UI on `http://127.0.0.1:4000`

The frontend automatically switches to emulator mode when served from the hosting emulator. If you serve the app some other way on localhost, add `?emulators=1` to the URL once and it will remember the preference.

### Local SMS Behavior

When the Functions emulator is running, SMS behaves like this:

- If `LOCAL_SMS_MODE=mock`, the function simulates success and logs the message instead of contacting Twilio.
- If `LOCAL_SMS_MODE=live` and valid Twilio credentials are present, the local function sends real SMS through Twilio.
- If `LOCAL_SMS_MODE` is not set, the emulator auto-mocks when Twilio credentials are missing.

Create `functions/.env.local` from `functions/.env.local.example` to control this behavior for local runs.

In hybrid mode, the starter uses `firebase.hybrid.local.json`, which skips the Emulator UI and Java-based emulators so you can still run a realistic local loop without installing Java first.

## Deploy

```bash
firebase deploy --only functions
```

## Frontend Endpoint

The frontend is configured to call:

```text
https://us-central1-templecars.cloudfunctions.net/sendVehicleMessage
```

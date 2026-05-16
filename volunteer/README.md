# Volunteer Management App

A small Firebase-based volunteer management app for nonprofits. It uses:

- Firebase Auth for volunteer/admin sign-in
- Firestore for profiles, events, reminders, and message logs
- Firebase Hosting for the React UI
- Cloud Functions for reminder generation and scheduled Twilio SMS sending

## Folder Structure

```text
volunteer/
  functions/
    index.ts              # reminder sync trigger + scheduled Twilio sender
    package.json
    tsconfig.json
  src/
    components/
      AuthForm.jsx
      EventList.jsx
      ProfileForm.jsx
    firebase/
      auth.js
      client.js
    helpers/
      date.js
      reminders.js
    pages/
      AdminDashboard.jsx
      LoginPage.jsx
      VolunteerDashboard.jsx
    App.jsx
    main.jsx
    styles.css
  .env.example
  firebase.json
  firestore.indexes.json
  firestore.rules
  index.html
  package.json
```

## Data Model

- `users/{uid}`
  - `role`: `admin` or `volunteer`
- `volunteers/{uid}`
  - volunteer-facing profile fields like `name`, `phoneNumber`, `emergencyContact`, `notes`
- `serviceEvents/{eventId}`
  - `topic`, `startAt`, `status`, `assignedVolunteerIds`, `reminderConfig`
- `reminders/{eventId}_{volunteerId}`
  - `eventId`, `volunteerId`, `phoneNumber`, `message`, `reminderTime`, `status`, `sentAt`
- `sentMessages/{messageId}`
  - audit log for successful and failed SMS attempts

## Local Setup

1. Install frontend dependencies:

   ```bash
   cd volunteer
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Firebase web config.

3. Install Cloud Function dependencies:

   ```bash
   cd functions
   npm install
   ```

4. Assign your first admin by updating `users/{uid}.role` to `admin` in Firestore or with the Admin SDK.

## Twilio Secrets

Use Firebase Secret Manager for Twilio credentials:

```bash
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_FROM_NUMBER
```

Then deploy from inside `volunteer/`:

```bash
firebase deploy
```

## Important Firebase Config Note

If you have older examples that use `firebase functions:config:set twilio.account_sid=...`, treat that as historical only. Firebase documents that `functions.config()` was deprecated and that new deployments using it fail after **December 2025**, so this app uses secret-backed config instead.

References:

- Firebase environment config: https://firebase.google.com/docs/functions/config-env
- Firebase scheduled functions: https://firebase.google.com/docs/functions/schedule-functions
- Firestore rules conditions: https://firebase.google.com/docs/firestore/security/rules-conditions

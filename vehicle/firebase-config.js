/**
 * Firebase Configuration
 * Replace this with your actual Firebase project configuration
 * Get this from: Firebase Console → Project Settings → Your apps → Web app
 */

const firebaseConfig = {
  apiKey: "AIzaSyCzH4KR3mLY_NDEeLv9NgItT0bU3I89F5g",
  authDomain: "templecars.firebaseapp.com",
  databaseURL: "https://templecars-default-rtdb.firebaseio.com",
  projectId: "templecars",
  storageBucket: "templecars.appspot.com",
  messagingSenderId: "146550051456",
  appId: "1:146550051456:web:7994c5002493bcfd2d8c65",
};

const runtimeSearchParams = new URLSearchParams(window.location.search);
const runtimeOverrides = window.VEHICLE_LOCAL_RUNTIME_CONFIG || {};

const emulatorConfig = {
  authUrl: "http://127.0.0.1:9099",
  databaseHost: "127.0.0.1",
  databasePort: 9000,
};

function parseBooleanFlag(value) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }

  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }

  return null;
}

const useDatabaseEmulator =
  parseBooleanFlag(runtimeSearchParams.get("databaseEmulator")) ??
  parseBooleanFlag(runtimeOverrides.useDatabaseEmulator) ??
  false;

const useAuthEmulator =
  parseBooleanFlag(runtimeSearchParams.get("authEmulator")) ??
  parseBooleanFlag(runtimeOverrides.useAuthEmulator) ??
  false;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services (no Storage needed for base64)
const database = firebase.database();
const auth = firebase.auth();

if (useDatabaseEmulator) {
  database.useEmulator(emulatorConfig.databaseHost, emulatorConfig.databasePort);
}

if (useAuthEmulator) {
  auth.useEmulator(emulatorConfig.authUrl);
}

// Sign in anonymously for write permissions
auth.signInAnonymously().catch((error) => {
  console.error("Firebase auth error:", error);
});

console.log(
  `Firebase initialized successfully (database emulator: ${useDatabaseEmulator}, auth emulator: ${useAuthEmulator})`
);

if (typeof window !== "undefined") {
  window.vehicleRuntimeConfig = {
    useDatabaseEmulator,
    useAuthEmulator,
    emulatorConfig,
  };
}

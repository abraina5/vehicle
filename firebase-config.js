/**
 * Firebase Configuration
 * Replace this with your actual Firebase project configuration
 * Get this from: Firebase Console → Project Settings → Your apps → Web app
 */

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCzH4KR3mLY_NDEeLv9NgItT0bU3I89F5g",
  authDomain: "templecars.firebaseapp.com",
  databaseURL: "https://templecars-default-rtdb.firebaseio.com",
  projectId: "templecars",
  storageBucket: "templecars.appspot.com",
  messagingSenderId: "146550051456",
  appId: "1:146550051456:web:7994c5002493bcfd2d8c65",
};

let database = null;
let auth = null;

if (typeof firebase !== 'undefined') {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    // Get references to Firebase services (no Storage needed for base64)
    database = firebase.database();
    auth = firebase.auth();

    // Sign in anonymously for write permissions
    auth.signInAnonymously().catch((error) => {
      console.error("Firebase auth error:", error);
    });

    console.log("Firebase initialized successfully (using base64 for images)");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase SDK is not available. Local storage fallback will be used.");
}

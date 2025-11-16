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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services (no Storage needed for base64)
const database = firebase.database();
const auth = firebase.auth();

// Sign in anonymously for write permissions
auth.signInAnonymously().catch((error) => {
  console.error("Firebase auth error:", error);
});

console.log("Firebase initialized successfully (using base64 for images)");

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvp59MfzswNjh2L_cLrZQ8Zr4dbVpFLdw",
  authDomain: "pathwise-62b7e.firebaseapp.com",
  projectId: "pathwise-62b7e",
  storageBucket: "pathwise-62b7e.firebasestorage.app",
  messagingSenderId: "413062626876",
  appId: "1:413062626876:web:321cccb312337b9dbacd39",
  measurementId: "G-T97SDGMG5W",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (with support check)
let analytics: any;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("Firebase Analytics initialized successfully.");
  } else {
    console.log("Firebase Analytics is not supported in this environment.");
  }
});

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Export Firebase services
export { app, auth, analytics, db }; // Export Firestore as `db`

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Export the app and auth objects
export { app, auth };

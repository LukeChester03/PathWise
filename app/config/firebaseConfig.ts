import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// import { GoogleSignin } from "@react-native-google-signin/google-signin";

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

// Initialize Firebase Auth without persistence
const auth = getAuth(app);

// Configure Google Sign-In
// GoogleSignin.configure({
//   webClientId: "AIzaSyCvp59MfzswNjh2L_cLrZQ8Zr4dbVpFLdw", // Get this from Firebase Console > Project Settings > Web SDK configuration
// });

// Export Firebase services
export { app, auth, analytics };

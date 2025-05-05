import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth } from "firebase/auth";
import * as firebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

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

// Initialize Firebase Analytics
let analytics: any;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("Firebase Analytics initialized successfully.");
  } else {
    console.log("Firebase Analytics is not supported in this environment.");
  }
});

// Initialize Firebase Auth persistence
const auth = initializeAuth(app, {
  persistence: reactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

export { app, auth, analytics, db };

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

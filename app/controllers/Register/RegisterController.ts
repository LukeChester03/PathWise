import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../config/firebaseConfig";
import { doc, setDoc, collection } from "firebase/firestore";
import { handleLogin } from "../Login/LoginController";

export const handleRegister = async (
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  onSuccess: () => void,
  onError: (errorMessage: string) => void
) => {
  // validate inputs
  if (!name || !email || !password || !confirmPassword) {
    onError("Please fill in all fields");
    return;
  }
  if (password !== confirmPassword) {
    onError("Passwords do not match");
    return;
  }

  try {
    // create user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (user) {
      const createdAt = new Date();

      // initialise user profile
      const userData = {
        name,
        email,
        isNewUser: true,
        createdAt,

        // initialise stats
        stats: {
          placesDiscovered: 0,
          countriesVisited: 0,
          dayStreak: 0,
          achievementsEarned: 0,
          distanceTraveled: 0,
          topCity: "",
          topCityCount: 0,
          explorationScore: 0,
          localExpertArea: "",
          localExpertCount: 0,
          avgVisitsPerWeek: 0,
          photosTaken: 0,
          favoriteCategory: "",
          favoriteCategoryCount: 0,
          peakExplorationHour: 12,
          explorationLevel: 1,
          totalTime: 0,
          weekendExplorerScore: 0,
          longestJourney: 0,
          continentsVisited: 0,
          lastUpdated: createdAt,
          visitedCountries: [],
          processedPlaceIds: [],
          visitedCities: {},
          visitedCategories: {},
          weekdayVisits: [0, 0, 0, 0, 0, 0, 0],
          hourVisits: Array(24).fill(0),
        },

        // preferences
        settings: {
          notificationsEnabled: true,
          darkMode: false,
          language: "en",
          measurementUnit: "metric",
          autoCheckIn: true,
        },

        // data
        profile: {
          displayName: name,
          photoURL: null,
          bio: "",
          isProfileComplete: false,
        },
      };

      // save user to Firestore
      await setDoc(doc(db, "users", user.uid), userData);

      const visitedPlacesRef = doc(collection(db, "users", user.uid, "visitedPlaces"), "_init");
      await setDoc(visitedPlacesRef, {
        _isInitDocument: true,
        createdAt,
        note: "Initialization document for visitedPlaces collection",
      });

      // wait for Firestore
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Log in the user after registration
      handleLogin(email, password, onSuccess, onError);
    }
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use") {
      onError("Email already in use. Please login.");
    } else if (error.code === "auth/weak-password") {
      onError("Password is too weak. Please use a stronger password.");
    } else if (error.code === "auth/invalid-email") {
      onError("Invalid email address format.");
    } else {
      console.error("Registration error:", error);
      const errorMessage = error.message || "Something went wrong during registration.";
      onError(errorMessage);
    }
  }
};

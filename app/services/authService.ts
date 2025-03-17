// services/authService.ts
import { onAuthStateChanged, User, getIdToken } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthStateListener = (user: User | null) => void;
const authStateListeners: AuthStateListener[] = [];

// Keys for AsyncStorage
const AUTH_USER_KEY = "@pathwise_auth_user";
const AUTH_TOKEN_KEY = "@pathwise_auth_token";

/**
 * Saves user authentication data to AsyncStorage as a backup mechanism
 */
const saveUserToStorage = async (user: User | null) => {
  try {
    if (user) {
      const token = await getIdToken(user, true);
      await AsyncStorage.setItem(
        AUTH_USER_KEY,
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        })
      );
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      console.log("🔐 User authentication data saved to AsyncStorage");
    } else {
      // Clear storage on logout
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      console.log("🔐 User authentication data cleared from AsyncStorage");
    }
  } catch (error) {
    console.error("Error saving auth data to AsyncStorage:", error);
  }
};

/**
 * Initializes the authentication service and returns a promise that resolves
 * when the initial auth state is determined
 */
export const initAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    console.log("🔐 Starting authentication initialization...");

    // First check if the user is already authenticated
    if (auth.currentUser) {
      console.log(`🔐 User already authenticated: ${auth.currentUser.uid}`);

      // Save user data as backup
      saveUserToStorage(auth.currentUser);

      // Notify listeners
      authStateListeners.forEach((listener) => listener(auth.currentUser));

      // Resolve with current user
      resolve(auth.currentUser);

      // Still set up the auth state listener for future changes
      onAuthStateChanged(auth, handleAuthStateChange);
      return;
    }

    // Set up auth state change listener
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    // Function to handle auth state changes
    function handleAuthStateChange(user: User | null) {
      console.log(`🔐 Auth state change detected: User ${user ? "signed in" : "signed out"}`);

      // Save user data for backup purposes
      saveUserToStorage(user);

      // Notify all listeners about the auth state
      authStateListeners.forEach((listener) => listener(user));

      // Resolve the promise (only on first call)
      resolve(user);
    }

    // Check AsyncStorage as fallback after a short delay
    // This helps in Expo Go where Firebase persistence might be inconsistent
    setTimeout(async () => {
      try {
        // If auth state hasn't been determined by Firebase after a delay
        if (!auth.currentUser) {
          console.log("🔐 Checking AsyncStorage as fallback for auth state...");
          const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

          if (storedUser) {
            console.log(
              "🔐 Found user data in AsyncStorage, app should treat user as authenticated"
            );
            // We still resolve with null since we don't have a full Firebase User object
            // But this information can be used to know that we should treat the user as authenticated
          }
        }
      } catch (error) {
        console.error("Error checking AsyncStorage for auth state:", error);
      }
    }, 1000);

    // Return the unsubscribe function for cleanup
    return unsubscribe;
  });
};

/**
 * Register a listener for authentication state changes
 * @param listener Function to call when auth state changes
 * @returns Function to unregister the listener
 */
export const subscribeToAuthState = (listener: AuthStateListener): (() => void) => {
  console.log("🔐 Adding new auth state listener");
  authStateListeners.push(listener);

  // If auth is already initialized, immediately call the listener with current state
  if (auth.currentUser !== undefined) {
    listener(auth.currentUser);
  }

  // Return function to unsubscribe
  return () => {
    const index = authStateListeners.indexOf(listener);
    if (index !== -1) {
      authStateListeners.splice(index, 1);
    }
  };
};

/**
 * Get the current authentication state synchronously
 * @returns The current user or null if not authenticated
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Check if user is authenticated, including checking AsyncStorage as fallback
 */
export const isAuthenticated = async (): Promise<boolean> => {
  // First check Firebase auth state
  if (auth.currentUser) {
    return true;
  }

  // Fallback to AsyncStorage for Expo Go environment
  try {
    const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
    return storedUser !== null;
  } catch (error) {
    console.error("Error checking authentication state:", error);
    return false;
  }
};

/**
 * Check if user is authenticated synchronously (just Firebase check)
 * Used for quick checks where AsyncStorage fallback isn't needed
 */
export const isAuthenticatedSync = (): boolean => {
  return auth.currentUser !== null;
};

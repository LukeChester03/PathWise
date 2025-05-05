import { onAuthStateChanged, User, getIdToken } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthStateListener = (user: User | null) => void;
const authStateListeners: AuthStateListener[] = [];

const AUTH_USER_KEY = "@pathwise_auth_user";
const AUTH_TOKEN_KEY = "@pathwise_auth_token";

/**
 * Saves user authentication data to AsyncStorage as a backup
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
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      console.log("🔐 User authentication data cleared from AsyncStorage");
    }
  } catch (error) {
    console.error("Error saving auth data to AsyncStorage:", error);
  }
};

/**
 * Initializes the authentication service
 */
export const initAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    console.log("🔐 Starting authentication initialization...");
    if (auth.currentUser) {
      console.log(`🔐 User already authenticated: ${auth.currentUser.uid}`);
      saveUserToStorage(auth.currentUser);
      authStateListeners.forEach((listener) => listener(auth.currentUser));
      resolve(auth.currentUser);
      onAuthStateChanged(auth, handleAuthStateChange);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    function handleAuthStateChange(user: User | null) {
      console.log(`Auth state change detected: User ${user ? "signed in" : "signed out"}`);
      saveUserToStorage(user);
      authStateListeners.forEach((listener) => listener(user));
      resolve(user);
    }

    setTimeout(async () => {
      try {
        if (!auth.currentUser) {
          console.log("🔐 Checking AsyncStorage as fallback for auth state...");
          const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);

          if (storedUser) {
            console.log("Found user data in AsyncStorage, app should treat user as authenticated");
          }
        }
      } catch (error) {
        console.error("Error checking AsyncStorage for auth state:", error);
      }
    }, 1000);
    return unsubscribe;
  });
};

export const subscribeToAuthState = (listener: AuthStateListener): (() => void) => {
  console.log("Adding new auth state listener");
  authStateListeners.push(listener);
  if (auth.currentUser !== undefined) {
    listener(auth.currentUser);
  }
  return () => {
    const index = authStateListeners.indexOf(listener);
    if (index !== -1) {
      authStateListeners.splice(index, 1);
    }
  };
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const isAuthenticated = async (): Promise<boolean> => {
  if (auth.currentUser) {
    return true;
  }

  try {
    const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
    return storedUser !== null;
  } catch (error) {
    console.error("Error checking authentication state:", error);
    return false;
  }
};

export const isAuthenticatedSync = (): boolean => {
  return auth.currentUser !== null;
};

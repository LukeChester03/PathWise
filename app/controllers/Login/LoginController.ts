// controllers/Login/LoginController.ts
import { signInWithEmailAndPassword, setPersistence } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import { initializeMap } from "../Map/mapController";

export const handleLogin = async (
  email: string,
  password: string,
  onSuccess: () => void,
  onError: (errorMessage: string) => void
) => {
  if (!email || !password) {
    onError("Please fill in all fields");
    return;
  }

  try {
    // Sign in the user
    // Note: Persistence is already set up in firebaseConfig.ts
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(email, "email");
    console.log(`🔐 User logged in successfully: ${userCredential.user.uid}`);

    // Initialize map as needed
    initializeMap();

    // Call success callback
    onSuccess();
  } catch (error: any) {
    console.error("❌ Login error:", error);

    // Provide user-friendly error messages
    let errorMessage = "Something went wrong";

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      errorMessage = "Invalid email or password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed login attempts. Please try again later";
    } else if (error.code === "auth/user-disabled") {
      errorMessage = "This account has been disabled";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage = "Network error. Please check your connection";
    }

    onError(errorMessage);
  }
};

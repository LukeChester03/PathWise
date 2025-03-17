// services/userService.ts
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";

// Define the structure of a user profile
export interface UserProfile {
  name?: string;
  email?: string;
  profileImage?: string;
  isNewUser?: boolean;
}

export const updateUserOnboardingStatus = async (
  userId: string,
  isNewUser: boolean = false
): Promise<boolean> => {
  try {
    if (!userId) {
      console.error("No user ID provided for updating onboarding status");
      return false;
    }

    // Reference to the user's profile document
    const profileDocRef = doc(db, "users", userId);

    // Update only the isNewUser field
    await updateDoc(profileDocRef, {
      isNewUser: isNewUser,
    });

    console.log(`User onboarding status updated: isNewUser = ${isNewUser}`);
    return true;
  } catch (error) {
    console.error("Error updating user onboarding status:", error);
    return false;
  }
};

// Function to handle automatic logout
export const handleAutoLogout = async (navigation?: any) => {
  try {
    await signOut(auth);

    // If navigation is provided, reset the navigation stack to login
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Landing" }],
      });
    }
  } catch (error) {
    console.error("Error during auto logout:", error);
  }
};

export const fetchUserProfile = async (navigation?: any): Promise<UserProfile> => {
  try {
    // Get the current user
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No user detected. Logging out.");
      await handleAutoLogout(navigation);
      return { name: "User" };
    }

    // Reference to the user's profile document
    const profileDocRef = doc(db, "users", currentUser.uid);

    // Fetch the document
    const profileDoc = await getDoc(profileDocRef);

    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log("Raw profile data from Firestore:", profileData);

      // Ensure isNewUser is explicitly a boolean
      const isNewUser = profileData.isNewUser === true;
      console.log("Processed isNewUser value:", isNewUser);

      return {
        name: profileData.name || currentUser.displayName || "User",
        email: profileData.email || currentUser.email || "",
        profileImage: profileData.profileImage || "",
        isNewUser: isNewUser, // Explicitly boolean
      };
    }

    // Return default profile if no document exists
    return {
      name: currentUser.displayName || "User",
      email: currentUser.email || "",
      isNewUser: false, // Default to false if no document
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);

    // Attempt to log out if there's an error
    await handleAutoLogout(navigation);

    return { name: "User", isNewUser: false };
  }
};

// Optional utility function to check user authentication status
export const checkUserAuthentication = async (navigation?: any): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      await handleAutoLogout(navigation);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Authentication check failed:", error);
    await handleAutoLogout(navigation);
    return false;
  }
};

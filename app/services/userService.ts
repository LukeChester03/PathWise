// services/userService.ts
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

// Define the structure of a user profile
export interface UserProfile {
  name?: string;
  email?: string;
  profileImage?: string;
}

export const fetchUserProfile = async (): Promise<UserProfile> => {
  try {
    // Get the current user
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No user logged in");
      return { name: "User" };
    }

    // Reference to the user's profile document
    const profileDocRef = doc(db, "userProfiles", currentUser.uid);

    // Fetch the document
    const profileDoc = await getDoc(profileDocRef);

    if (profileDoc.exists()) {
      const profileData = profileDoc.data() as UserProfile;
      return {
        name: profileData.name || currentUser.displayName || "User",
        email: profileData.email || currentUser.email || "",
        profileImage: profileData.profileImage || "",
      };
    }

    // Return default profile if no document exists
    return {
      name: currentUser.displayName || "User",
      email: currentUser.email || "",
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { name: "User" };
  }
};

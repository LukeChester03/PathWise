import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";

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

    const profileDocRef = doc(db, "users", userId);

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

export const handleAutoLogout = async (navigation?: any) => {
  try {
    await signOut(auth);

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
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No user detected. Logging out.");
      await handleAutoLogout(navigation);
      return { name: "User" };
    }

    const profileDocRef = doc(db, "users", currentUser.uid);

    const profileDoc = await getDoc(profileDocRef);

    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log("Raw profile data from Firestore:", profileData);

      const isNewUser = profileData.isNewUser === true;
      console.log("Processed isNewUser value:", isNewUser);

      return {
        name: profileData.name || currentUser.displayName || "User",
        email: profileData.email || currentUser.email || "",
        profileImage: profileData.profileImage || "",
        isNewUser: isNewUser,
      };
    }

    return {
      name: currentUser.displayName || "User",
      email: currentUser.email || "",
      isNewUser: false,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);

    await handleAutoLogout(navigation);

    return { name: "User", isNewUser: false };
  }
};

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

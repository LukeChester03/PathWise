import { Alert } from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";

export const resetPassword = async (email: string, setLoading?: (loading: boolean) => void) => {
  if (!email) {
    Alert.alert("Error", "Please enter your email address");
    return;
  }

  if (setLoading) setLoading(true);

  try {
    await sendPasswordResetEmail(auth, email);
    Alert.alert("Success", "Password reset email sent. Please check your inbox.");
  } catch (error: any) {
    Alert.alert("Error", error.message || "Something went wrong");
  } finally {
    if (setLoading) setLoading(false);
  }
};

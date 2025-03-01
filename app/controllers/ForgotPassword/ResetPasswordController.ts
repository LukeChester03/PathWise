// app/controllers/ResetPassword/ResetPasswordController.ts
import { auth } from "../../config/firebaseConfig";

export const handleResetPassword = async (
  email: string,
  onSuccess: () => void,
  onError: (errorMessage: string) => void
) => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email address.");
    }

    // Send password reset email using Firebase

    // Trigger success callback
    onSuccess();
  } catch (error: any) {
    // Handle errors and trigger the error callback
    const errorMessage =
      error.message || "An unexpected error occurred while sending the reset link.";
    onError(errorMessage);
  }
};

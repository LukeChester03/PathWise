import { auth } from "../../config/firebaseConfig";

export const handleResetPassword = async (
  email: string,
  onSuccess: () => void,
  onError: (errorMessage: string) => void
) => {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email address.");
    }

    onSuccess();
  } catch (error: any) {
    const errorMessage =
      error.message || "An unexpected error occurred while sending the reset link.";
    onError(errorMessage);
  }
};

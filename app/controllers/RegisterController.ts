// app/controllers/RegisterController.ts
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

export const handleRegister = async (
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  onSuccess: () => void,
  onError: (errorMessage: string) => void
) => {
  if (!name || !email || !password || !confirmPassword) {
    onError("Please fill in all fields");
    return;
  }

  if (password !== confirmPassword) {
    onError("Passwords do not match");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    onSuccess();
  } catch (error: any) {
    onError(error.message || "Something went wrong");
  }
};

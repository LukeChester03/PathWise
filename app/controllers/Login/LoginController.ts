import { signInWithEmailAndPassword } from "firebase/auth";
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
    await signInWithEmailAndPassword(auth, email, password);
    initializeMap;
    onSuccess();
  } catch (error: any) {
    onError(error.message || "Something went wrong");
  }
};

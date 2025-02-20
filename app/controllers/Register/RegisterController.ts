// app/controllers/RegisterController.ts
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../config/firebaseConfig"; // Import Firestore
import { doc, setDoc } from "firebase/firestore"; // Import Firestore methods

export const handleRegister = async (
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  onSuccess: () => void,
  onError: (errorMessage: string) => void
) => {
  // Validate inputs
  if (!name || !email || !password || !confirmPassword) {
    console.log("HERE");
    onError("Please fill in all fields");
    return;
  }
  if (password !== confirmPassword) {
    onError("Passwords do not match");
    return;
  }

  try {
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log(email, password, name);
    console.log("PHASE 1");
    if (user) {
      // Save additional user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date(),
      });

      // Trigger success callback
      onSuccess();
    }
  } catch (error: any) {
    console.log("NOT GOOD");
    // Handle errors
    const errorMessage = error.message || "Something went wrong during registration.";
    onError(errorMessage);
  }
};

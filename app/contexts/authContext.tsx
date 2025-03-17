// contexts/authContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "firebase/auth";
import { subscribeToAuthState } from "../services/authService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component to wrap the app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("🔐 Setting up auth context subscription");

    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthState((currentUser) => {
      console.log(
        `👤 Auth context received state update: User ${currentUser ? "signed in" : "signed out"}`
      );
      setUser(currentUser);
      setIsLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

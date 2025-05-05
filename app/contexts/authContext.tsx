import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "firebase/auth";
import { subscribeToAuthState } from "../services/authService";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("🔐 Setting up auth context subscription");

    const unsubscribe = subscribeToAuthState((currentUser) => {
      console.log(
        `👤 Auth context received state update: User ${currentUser ? "signed in" : "signed out"}`
      );
      setUser(currentUser);
      setIsLoading(false);
    });

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

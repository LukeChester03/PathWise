import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { fetchUserLevelInfo } from "../../services/statsService";
import { auth } from "../../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

interface XPContextType {
  currentLevel: number;
  previousLevel: number;
  totalXP: number;
  xpProgress: number;
  xpForNextLevel: number;
  levelTitle: string;
  showLevelUp: boolean;
  progress: number; // Progress percentage (0-100)
  refreshXP: () => Promise<void>;
  dismissLevelUp: () => void;
}

const XPContext = createContext<XPContextType>({
  currentLevel: 1,
  previousLevel: 1,
  totalXP: 0,
  xpProgress: 0,
  xpForNextLevel: 100,
  levelTitle: "Beginner Explorer",
  showLevelUp: false,
  progress: 0,
  refreshXP: async () => {},
  dismissLevelUp: () => {},
});

export const useXP = () => useContext(XPContext);

interface XPProviderProps {
  children: ReactNode;
}

export const XPProvider: React.FC<XPProviderProps> = ({ children }) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [previousLevel, setPreviousLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);
  const [xpProgress, setXPProgress] = useState(0);
  const [xpForNextLevel, setXPForNextLevel] = useState(100);
  const [levelTitle, setLevelTitle] = useState("Beginner Explorer");
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      if (user) {
        refreshXP();
      }
    });

    return () => unsubscribe();
  }, []);

  // refresh info from Firebase
  const refreshXP = async () => {
    try {
      if (!isAuthenticated) return;

      const levelInfo = await fetchUserLevelInfo();

      if (levelInfo) {
        // check if user leveled up since last check
        if (levelInfo.level > currentLevel && currentLevel > 0) {
          setPreviousLevel(currentLevel);
          setShowLevelUp(true);
        }

        setCurrentLevel(levelInfo.level);
        setTotalXP(levelInfo.xp);
        setLevelTitle(levelInfo.title);
        setXPProgress(levelInfo.xpProgress || 0);
        setXPForNextLevel(levelInfo.xpNeeded || 100);
        setProgress(levelInfo.progress || 0);
      }
    } catch (error) {
      console.error("Error refreshing XP:", error);
    }
  };

  const dismissLevelUp = () => {
    setShowLevelUp(false);
  };

  const value = {
    currentLevel,
    previousLevel,
    totalXP,
    xpProgress,
    xpForNextLevel,
    levelTitle,
    showLevelUp,
    progress,
    refreshXP,
    dismissLevelUp,
  };

  return <XPContext.Provider value={value}>{children}</XPContext.Provider>;
};

export default XPProvider;

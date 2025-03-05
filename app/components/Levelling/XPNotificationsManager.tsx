// components/Levelling/XPNotificationsManager.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, AppState } from "react-native";
import LevelUpNotification from "./LevelUpNotification";
import XPAwardAnimation from "./XPAwardAnimation";
import { useXP } from "../../contexts/Levelling/xpContext";

// Structure for XP award queue items
interface XPAward {
  id: string;
  amount: number;
  activity: string;
  timestamp: number;
}

// Global queue for XP awards - persists even if component unmounts
const globalXPAwardQueue: XPAward[] = [];
let isComponentMounted = false;
let isInitialized = false;

// Function to show XP awards from anywhere in the app
export const showXPAward = (amount: number, activity: string) => {
  const awardItem: XPAward = {
    id: Date.now().toString(),
    amount,
    activity,
    timestamp: Date.now(),
  };

  if (isComponentMounted) {
    // If component is mounted, the global reference will pick up the award
    globalXPAwardQueue.push(awardItem);
  } else {
    // If component isn't mounted yet, queue it for later
    globalXPAwardQueue.push(awardItem);
    console.log(`Queued XP award: ${amount} XP for ${activity}`);
  }
};

// Legacy function for backward compatibility
export const registerXPAwardFunction = (fn: (amount: number, activity: string) => void) => {
  // This function is kept for backward compatibility
  console.log("Using direct showXPAward is now recommended over registerXPAwardFunction");
};

const XPNotificationsManager: React.FC = () => {
  const { currentLevel, previousLevel, showLevelUp, dismissLevelUp } = useXP();
  const [xpAwards, setXpAwards] = useState<XPAward[]>([]);
  const [currentXPAward, setCurrentXPAward] = useState<XPAward | null>(null);
  const appState = useRef(AppState.currentState);
  const queueCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize the manager and set up periodic queue checking
  useEffect(() => {
    isComponentMounted = true;
    isInitialized = true;

    console.log("XP Notifications Manager mounted");

    // Process any pending awards in the global queue
    if (globalXPAwardQueue.length > 0) {
      console.log(`Processing ${globalXPAwardQueue.length} queued XP awards`);
      setXpAwards((prev) => [...prev, ...globalXPAwardQueue]);
      globalXPAwardQueue.length = 0;
    }

    // Set up interval to check the global queue periodically
    queueCheckIntervalRef.current = setInterval(() => {
      if (globalXPAwardQueue.length > 0) {
        setXpAwards((prev) => [...prev, ...globalXPAwardQueue]);
        globalXPAwardQueue.length = 0;
      }
    }, 500);

    // Monitor app state changes to handle background/foreground transitions
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground - check queue
        if (globalXPAwardQueue.length > 0) {
          setXpAwards((prev) => [...prev, ...globalXPAwardQueue]);
          globalXPAwardQueue.length = 0;
        }
      }

      appState.current = nextAppState;
    });

    // Cleanup on unmount
    return () => {
      isComponentMounted = false;

      if (queueCheckIntervalRef.current) {
        clearInterval(queueCheckIntervalRef.current);
      }

      subscription.remove();

      console.log("XP Notifications Manager unmounted");
    };
  }, []);

  // Manage the queue of XP awards
  useEffect(() => {
    if (xpAwards.length > 0 && !currentXPAward) {
      // Sort by timestamp to ensure order
      const sortedAwards = [...xpAwards].sort((a, b) => a.timestamp - b.timestamp);

      // Take the first award from the queue
      setCurrentXPAward(sortedAwards[0]);

      // Remove it from the queue
      setXpAwards(sortedAwards.slice(1));
    }
  }, [xpAwards, currentXPAward]);

  // Handle when an XP award animation completes
  const handleXPAnimationComplete = () => {
    setCurrentXPAward(null);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Level Up Notification */}
      <LevelUpNotification visible={showLevelUp} level={currentLevel} onClose={dismissLevelUp} />

      {/* XP Award Animation - only show one at a time */}
      {currentXPAward && (
        <XPAwardAnimation
          amount={currentXPAward.amount}
          activity={currentXPAward.activity}
          onComplete={handleXPAnimationComplete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // Make sure it's above other UI elements
    pointerEvents: "none", // Let touches pass through to components underneath
  },
});

// Initialize the system immediately to accept awards before mounting
if (!isInitialized) {
  isInitialized = true;
  console.log("XP Notification system initialized");
}

export default XPNotificationsManager;

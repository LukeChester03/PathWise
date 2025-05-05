import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, AppState } from "react-native";
import LevelUpNotification from "./LevelUpNotification";
import XPAwardAnimation from "./XPAwardAnimation";
import { useXP } from "../../contexts/Levelling/xpContext";

interface XPAward {
  id: string;
  amount: number;
  activity: string;
  timestamp: number;
}

const globalXPAwardQueue: XPAward[] = [];
let isComponentMounted = false;
let isInitialized = false;

export const showXPAward = (amount: number, activity: string) => {
  const awardItem: XPAward = {
    id: Date.now().toString(),
    amount,
    activity,
    timestamp: Date.now(),
  };

  if (isComponentMounted) {
    globalXPAwardQueue.push(awardItem);
  } else {
    globalXPAwardQueue.push(awardItem);
    console.log(`Queued XP award: ${amount} XP for ${activity}`);
  }
};

const XPNotificationsManager: React.FC = () => {
  const { currentLevel, previousLevel, showLevelUp, dismissLevelUp } = useXP();
  const [xpAwards, setXpAwards] = useState<XPAward[]>([]);
  const [currentXPAward, setCurrentXPAward] = useState<XPAward | null>(null);
  const appState = useRef(AppState.currentState);
  const queueCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isComponentMounted = true;
    isInitialized = true;

    console.log("XP Notifications Manager mounted");

    if (globalXPAwardQueue.length > 0) {
      console.log(`Processing ${globalXPAwardQueue.length} queued XP awards`);
      setXpAwards((prev) => [...prev, ...globalXPAwardQueue]);
      globalXPAwardQueue.length = 0;
    }

    queueCheckIntervalRef.current = setInterval(() => {
      if (globalXPAwardQueue.length > 0) {
        setXpAwards((prev) => [...prev, ...globalXPAwardQueue]);
        globalXPAwardQueue.length = 0;
      }
    }, 500);

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        if (globalXPAwardQueue.length > 0) {
          setXpAwards((prev) => [...prev, ...globalXPAwardQueue]);
          globalXPAwardQueue.length = 0;
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      isComponentMounted = false;

      if (queueCheckIntervalRef.current) {
        clearInterval(queueCheckIntervalRef.current);
      }

      subscription.remove();

      console.log("XP Notifications Manager unmounted");
    };
  }, []);

  useEffect(() => {
    if (xpAwards.length > 0 && !currentXPAward) {
      const sortedAwards = [...xpAwards].sort((a, b) => a.timestamp - b.timestamp);
      setCurrentXPAward(sortedAwards[0]);
      setXpAwards(sortedAwards.slice(1));
    }
  }, [xpAwards, currentXPAward]);

  const handleXPAnimationComplete = () => {
    setCurrentXPAward(null);
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <LevelUpNotification visible={showLevelUp} level={currentLevel} onClose={dismissLevelUp} />
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
    zIndex: 1000,
    pointerEvents: "none",
  },
});

if (!isInitialized) {
  isInitialized = true;
  console.log("XP Notification system initialized");
}

export default XPNotificationsManager;

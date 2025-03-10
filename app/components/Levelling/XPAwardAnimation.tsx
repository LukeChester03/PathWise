// components/Notifications/XPAwardAnimation.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface XPAwardAnimationProps {
  amount: number;
  activity: string;
  onComplete: () => void;
}

const XPAwardAnimation: React.FC<XPAwardAnimationProps> = ({ amount, activity, onComplete }) => {
  // Animation refs
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Run the animation sequence
    Animated.sequence([
      // Start with a pop-in effect
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(1000),
      // Float upward while fading out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Call the onComplete callback when animation is done
      onComplete();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.xpText}>+{amount} XP</Text>
        <Text style={styles.activityText}>{activity}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: SCREEN_WIDTH,
    alignItems: "center",
    bottom: 150,
    zIndex: 1000,
    pointerEvents: "none",
  },
  content: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  xpText: {
    color: "#FFD700", // Gold color for XP
    fontWeight: "bold",
    fontSize: 24,
    marginBottom: 5,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  activityText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
});

export default XPAwardAnimation;

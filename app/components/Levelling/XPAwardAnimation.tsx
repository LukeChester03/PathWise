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
    Animated.sequence([
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
      Animated.delay(1000),
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
    color: "#FFD700",
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

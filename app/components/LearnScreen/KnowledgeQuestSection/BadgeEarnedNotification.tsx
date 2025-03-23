// components/LearnScreen/KnowledgeQuestSection/BadgeEarnedNotification.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TravelBadge } from "../../../types/LearnScreen/TravelProfileTypes";

interface BadgeEarnedNotificationProps {
  badge: TravelBadge;
  xpEarned: number;
  onDismiss: () => void;
  onViewAllBadges: () => void;
}

const BadgeEarnedNotification = ({
  badge,
  xpEarned,
  onDismiss,
  onViewAllBadges,
}: BadgeEarnedNotificationProps) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-20)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Create interpolation for rotation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Start glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Start rotation animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    }).start();
  }, []);

  const getIconName = () => {
    // Convert badge icon to Ionicons name
    switch (badge.icon) {
      case "ribbon":
        return "ribbon";
      case "trophy":
        return "trophy";
      case "star":
        return "star";
      case "medal":
        return "medal";
      case "globe":
        return "globe";
      case "earth":
        return "earth";
      case "map":
        return "map";
      case "compass":
        return "compass";
      case "leaf":
        return "leaf";
      case "footsteps":
        return "footsteps";
      case "walk":
        return "walk";
      case "time":
        return "time";
      case "calendar":
        return "calendar";
      case "business":
        return "business";
      case "flame":
        return "flame";
      case "school":
        return "school";
      default:
        return "ribbon";
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={["#8B5CF6", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Badge Earned!</Text>
      </LinearGradient>

      <View style={styles.badgeContent}>
        <Animated.View
          style={[
            styles.badgeIconContainer,
            {
              opacity: glowAnim,
              shadowOpacity: glowAnim,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <Ionicons name={getIconName()} size={60} color="#FFFFFF" />
        </Animated.View>

        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <Text style={styles.badgeDescription}>{badge.description}</Text>

          <View style={styles.xpContainer}>
            <Text style={styles.xpLabel}>XP Earned:</Text>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{Math.round(xpEarned)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.continueButton} onPress={onDismiss}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAllBadges}>
          <Text style={styles.viewAllText}>View All Badges</Text>
          <Ionicons name="arrow-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  header: {
    paddingVertical: 24,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badgeContent: {
    padding: 24,
    alignItems: "center",
  },
  badgeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  badgeInfo: {
    alignItems: "center",
  },
  badgeName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  badgeDescription: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  xpContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  xpLabel: {
    fontSize: 16,
    color: "#4B5563",
    marginRight: 8,
  },
  xpBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  xpText: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  buttonContainer: {
    padding: 24,
    paddingTop: 0,
  },
  continueButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
    marginRight: 6,
  },
});

export default BadgeEarnedNotification;

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface XPEarnedNotificationProps {
  totalXP: number;
  breakdown: { reason: string; amount: number }[];
  onDismiss: () => void;
}

const XPEarnedNotification = ({ totalXP, breakdown, onDismiss }: XPEarnedNotificationProps) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(-20)).current;
  const xpCountAnim = useRef(new Animated.Value(0)).current;
  const formattedXP = xpCountAnim.interpolate({
    inputRange: [0, totalXP],
    outputRange: ["0", totalXP.toString()],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(xpCountAnim, {
      toValue: totalXP,
      duration: 1500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  const renderBreakdownItems = () => {
    return breakdown.map((item, index) => (
      <React.Fragment key={`xp-reason-${index}`}>
        {index > 0 && <View style={styles.breakdownSeparator} />}
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownReason}>{item.reason}</Text>
          <Text style={styles.breakdownAmount}>+{item.amount}</Text>
        </View>
      </React.Fragment>
    ));
  };

  return (
    <View style={styles.outerContainer}>
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
          <View style={styles.headerContent}>
            <Text style={styles.title}>XP Earned!</Text>
            <Animated.Text style={styles.xpAmount}>+{formattedXP}</Animated.Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.xpTotalContainer}>
            <View style={styles.xpIconContainer}>
              <Ionicons name="flash" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.xpTextContainer}>
              <Text style={styles.xpLabel}>Total XP Earned</Text>
              <View style={styles.xpAmountContainer}>
                <Animated.Text style={styles.contentXpAmount}>+{formattedXP}</Animated.Text>
              </View>
            </View>
          </View>

          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>XP Breakdown</Text>

            <View style={[styles.breakdownList, breakdown.length > 4 && styles.scrollableList]}>
              {renderBreakdownItems()}
            </View>
          </View>

          <TouchableOpacity style={styles.continueButton} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    paddingVertical: 32,
    alignItems: "center",
  },
  headerContent: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  xpAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  content: {
    padding: 24,
  },
  xpTotalContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  xpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  xpTextContainer: {
    flex: 1,
  },
  xpLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  xpAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentXpAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10B981",
  },
  breakdownContainer: {
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  breakdownList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 8,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  breakdownReason: {
    fontSize: 15,
    color: "#4B5563",
    flex: 1,
    marginRight: 8,
  },
  breakdownAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
  },
  breakdownSeparator: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  scrollableList: {
    maxHeight: 240,
  },
  continueButton: {
    backgroundColor: "#6366F1",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default XPEarnedNotification;

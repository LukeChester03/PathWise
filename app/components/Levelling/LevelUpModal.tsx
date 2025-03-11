// components/Modals/LevelUpModal.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { EXPLORATION_LEVELS } from "../../types/StatTypes";
import Confetti from "react-native-confetti";

const { width } = Dimensions.get("window");

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ visible, level, onClose }) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const badgeSpinAnim = useRef(new Animated.Value(0)).current;

  // Confetti reference
  const confettiRef = useRef<any>(null);

  // Get level data
  const levelData = EXPLORATION_LEVELS.find((l) => l.level === level) || EXPLORATION_LEVELS[0];
  const nextLevelData = EXPLORATION_LEVELS.find((l) => l.level === level + 1);

  // Create animations when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Start confetti
      if (confettiRef.current) {
        confettiRef.current.startConfetti();
      }

      // Entry animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Continuous badge rotation
      Animated.loop(
        Animated.timing(badgeSpinAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Pulsing animation for the badge
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animations when modal closes
      if (confettiRef.current) {
        confettiRef.current.stopConfetti();
      }
    }
  }, [visible]);

  // Handler for closing the modal with animation
  const handleClose = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Badge spin interpolation
  const spin = badgeSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Confetti ref={confettiRef} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["#4a6aff", "#5b3dff"]}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.congratsText}>CONGRATULATIONS!</Text>
            <Text style={styles.levelUpText}>You've Reached</Text>

            <View style={styles.levelBadgeContainer}>
              <Animated.View
                style={[
                  styles.levelBadge,
                  {
                    transform: [{ scale: pulseAnim }, { rotate: spin }],
                  },
                ]}
              >
                <Text style={styles.levelIcon}>{levelData.icon}</Text>
                <Text style={styles.levelNumber}>{level}</Text>
              </Animated.View>
            </View>

            <Text style={styles.levelTitle}>{levelData.title}</Text>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>New Abilities:</Text>
              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#4CD964"
                  style={styles.benefitIcon}
                />
                <Text style={styles.benefitText}>
                  {level === 2
                    ? "Special filter for country leaderboards"
                    : level === 3
                    ? "Enhanced discovery notifications"
                    : level === 4
                    ? "Rare place detection"
                    : level === 5
                    ? "Community challenges access"
                    : level === 6
                    ? "Custom journey planning tools"
                    : level === 7
                    ? "Hidden gem discovery boost"
                    : level === 8
                    ? "Advanced territory stats"
                    : level === 9
                    ? "VIP exploration badges"
                    : level === 10
                    ? "Ultimate explorer recognition"
                    : "Improved exploration tools"}
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color="#4CD964"
                  style={styles.benefitIcon}
                />
                <Text style={styles.benefitText}>Exclusive {levelData.title} profile badge</Text>
              </View>
            </View>

            {nextLevelData && (
              <View style={styles.nextLevelContainer}>
                <Text style={styles.nextLevelText}>
                  Next level: {nextLevelData.title} at {nextLevelData.requiredScore} XP
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
              <Text style={styles.continueButtonText}>Continue Exploring</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 360,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  modalContent: {
    padding: 24,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  levelUpText: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 20,
  },
  levelBadgeContainer: {
    marginVertical: 16,
    alignItems: "center",
  },
  levelBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  levelIcon: {
    fontSize: 40,
    marginBottom: 5,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4a6aff",
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  benefitsContainer: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitIcon: {
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  nextLevelContainer: {
    marginBottom: 20,
  },
  nextLevelText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  continueButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4a6aff",
    textAlign: "center",
  },
});

export default LevelUpModal;

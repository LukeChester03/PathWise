// components/NavigateButton.tsx
import React from "react";
import { TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";

interface NavigateButtonProps {
  fadeAnim: Animated.Value;
  translateY: Animated.Value;
  iconSize: {
    normal: number;
  };
  onPress: () => void;
}

const NavigateButton: React.FC<NavigateButtonProps> = ({
  fadeAnim,
  translateY,
  iconSize,
  onPress,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity style={styles.navigateButton} onPress={handlePress} activeOpacity={0.9}>
        <Ionicons name="navigate" size={iconSize.normal} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Navigate Here</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  navigateButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 64,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default NavigateButton;

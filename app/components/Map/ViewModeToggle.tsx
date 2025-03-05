// ViewModeToggle.tsx
import React, { useState, useEffect } from "react";
import { TouchableOpacity, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";

interface ViewModeToggleProps {
  viewMode: string;
  onToggle: () => void;
  isTransitioning?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onToggle,
  isTransitioning = false,
}) => {
  const [isDisabled, setIsDisabled] = useState(false);
  const rotation = new Animated.Value(viewMode === "follow" ? 0 : 1);

  // Animate rotation when viewMode changes
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: viewMode === "follow" ? 0 : 1,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [viewMode]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const handlePress = () => {
    if (isDisabled || isTransitioning) return;

    // Disable button temporarily to prevent multiple clicks
    setIsDisabled(true);
    onToggle();

    // Re-enable after transition (use a slightly longer timeout than the camera animation)
    setTimeout(() => {
      setIsDisabled(false);
    }, 1200); // This should be longer than your camera animation duration
  };

  return (
    <TouchableOpacity
      style={[styles.button, { opacity: isDisabled || isTransitioning ? 0.6 : 1 }]}
      onPress={handlePress}
      disabled={isDisabled || isTransitioning}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons
          name={viewMode === "follow" ? "eye-outline" : "navigate-outline"}
          size={24}
          color="white"
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 30,
    right: 16,
    backgroundColor: Colors.primary, // Changed to white as requested
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
});

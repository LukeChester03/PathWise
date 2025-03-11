import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { Colors } from "../../constants/colours";

interface TurnByTurnNavigationProps {
  navigationVisible: boolean;
  currentStep: any | null;
  journeyStarted: boolean;
  nextStepDistance: string | null;
  stepIndex: number;
  navigationSteps: any[];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setNavigationVisible: (visible: boolean) => void;
  getManeuverIcon: (maneuver: string) => React.ReactNode;
}

const TurnByTurnNavigation: React.FC<TurnByTurnNavigationProps> = ({
  navigationVisible,
  currentStep,
  journeyStarted,
  nextStepDistance,
  stepIndex,
  navigationSteps,
  soundEnabled,
  setSoundEnabled,
  setNavigationVisible,
  getManeuverIcon,
}) => {
  // Navigation Panel Component
  const NavigationPanel = useMemo(() => {
    if (!navigationVisible || !currentStep || !journeyStarted) return null;

    return (
      <View style={styles.navigationPanelContainer}>
        <View style={styles.navigationPanel}>
          <View style={styles.navigationIconContainer}>
            {getManeuverIcon(currentStep.maneuver)}
          </View>

          <View style={styles.navigationInstructionContainer}>
            <Text style={styles.navigationDistance}>
              {nextStepDistance || currentStep.distance.text}
            </Text>
            <Text style={styles.navigationInstruction}>{currentStep.instructions}</Text>
          </View>

          <View style={styles.navigationControls}>
            <TouchableOpacity
              style={styles.soundToggle}
              onPress={() => setSoundEnabled(!soundEnabled)}
            >
              <MaterialIcon
                name={soundEnabled ? "volume-up" : "volume-off"}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navigationMinimize}
              onPress={() => setNavigationVisible(false)}
            >
              <MaterialIcon name="keyboard-arrow-down" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Optional: Add upcoming steps preview */}
        {stepIndex < navigationSteps.length - 1 && (
          <View style={styles.upcomingStepContainer}>
            <View style={styles.upcomingStepIconContainer}>
              {getManeuverIcon(navigationSteps[stepIndex + 1].maneuver)}
            </View>
            <Text style={styles.upcomingStepText} numberOfLines={1}>
              Then {navigationSteps[stepIndex + 1].instructions}
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    currentStep,
    nextStepDistance,
    navigationVisible,
    journeyStarted,
    soundEnabled,
    stepIndex,
    navigationSteps,
  ]);

  // Minimized Navigation Button Component
  const MinimizedNavigation = useMemo(() => {
    if (navigationVisible || !journeyStarted || !currentStep) return null;

    return (
      <TouchableOpacity
        style={styles.minimizedNavigation}
        onPress={() => setNavigationVisible(true)}
      >
        <View style={styles.minimizedIconContainer}>{getManeuverIcon(currentStep.maneuver)}</View>
        <Text style={styles.minimizedDistance} numberOfLines={1}>
          {nextStepDistance || currentStep.distance.text}
        </Text>
      </TouchableOpacity>
    );
  }, [navigationVisible, journeyStarted, currentStep, nextStepDistance]);

  return (
    <>
      {NavigationPanel}
      {MinimizedNavigation}
    </>
  );
};

const styles = StyleSheet.create({
  // Navigation styles
  navigationPanelContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 45 : 15,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  navigationPanel: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  navigationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  navigationInstructionContainer: {
    flex: 1,
    paddingRight: 8,
  },
  navigationDistance: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  navigationInstruction: {
    color: "white",
    fontSize: 14,
  },
  navigationControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  soundToggle: {
    padding: 8,
    marginRight: 4,
  },
  navigationMinimize: {
    padding: 8,
  },
  upcomingStepContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  upcomingStepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  upcomingStepText: {
    color: "#333",
    fontSize: 14,
    flex: 1,
  },
  minimizedNavigation: {
    position: "absolute",
    top: Platform.OS === "ios" ? 45 : 15,
    right: 15,
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 1000,
  },
  minimizedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  minimizedDistance: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default TurnByTurnNavigation;

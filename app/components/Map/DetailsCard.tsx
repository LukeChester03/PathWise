import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { TravelMode } from "../../types/MapTypes";

interface DetailsCardProps {
  placeName: string;
  travelTime: string;
  distance: string;
  onSwipeOff: () => void;
  travelMode: TravelMode;
  onInfoPress?: () => void;

  // Navigation properties
  currentStep: any | null;
  nextStepDistance: string | null;
  navigationSteps: any[];
  stepIndex: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  getManeuverIcon: (maneuver: string) => React.ReactNode;
}

const DetailsCard: React.FC<DetailsCardProps> = ({
  placeName,
  travelTime,
  distance,
  onSwipeOff,
  travelMode,
  onInfoPress = () => {},

  // Navigation properties
  currentStep,
  nextStepDistance,
  navigationSteps,
  stepIndex,
  soundEnabled,
  setSoundEnabled,
  getManeuverIcon,
}) => {
  const [expanded, setExpanded] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const shadowAnim = useRef(new Animated.Value(0.25)).current;
  const cardHeightAnim = useRef(new Animated.Value(0)).current;

  // Track when travel mode changes
  const lastModeRef = useRef<TravelMode>(travelMode);
  useEffect(() => {
    if (lastModeRef.current !== travelMode) {
      lastModeRef.current = travelMode;
    }
  }, [travelMode]);

  // Animate card height on expansion/collapse
  useEffect(() => {
    Animated.timing(cardHeightAnim, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded, cardHeightAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Animated.timing(shadowAnim, {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        Animated.timing(shadowAnim, {
          toValue: 0.25,
          duration: 100,
          useNativeDriver: false,
        }).start();

        if (gestureState.dx < -100) {
          Animated.timing(pan, {
            toValue: { x: -500, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onSwipeOff();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Get appropriate asset based on travel mode
  const getTravelModeAsset = () => {
    if (travelMode === "driving") {
      try {
        return require("../../assets/driving.gif");
      } catch (e) {
        console.warn("driving.gif not found, using walking.gif as fallback");
        return require("../../assets/walking.gif");
      }
    } else {
      return require("../../assets/walking.gif");
    }
  };

  // Determine opacity for upcoming step (fade in when expanded)
  const upcomingStepOpacity = cardHeightAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ translateX: pan.x }],
          shadowOpacity: shadowAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Compact Info Section */}
      <View style={styles.compactHeader}>
        <Image source={getTravelModeAsset()} style={styles.gif} key={`travel-${travelMode}`} />

        <View style={styles.mainInfo}>
          <Text numberOfLines={1} style={styles.title}>
            {placeName}
          </Text>
          <View style={styles.metrics}>
            <Text style={styles.metric}>{distance}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.metric}>{travelTime}</Text>

            {/* Sound toggle is always visible but smaller */}
            <TouchableOpacity
              style={styles.soundToggle}
              onPress={() => setSoundEnabled(!soundEnabled)}
            >
              <MaterialIcon
                name={soundEnabled ? "volume-up" : "volume-off"}
                size={18}
                color={Colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expand/collapse button */}
        <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded(!expanded)}>
          <MaterialIcon
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Navigation section appears when expanded */}
      {currentStep && (
        <Animated.View
          style={[
            styles.navigationSection,
            {
              opacity: cardHeightAnim,
              maxHeight: cardHeightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 120],
              }),
              overflow: "hidden",
            },
          ]}
        >
          {/* Current direction */}
          <View style={styles.currentStep}>
            <View style={styles.iconContainer}>{getManeuverIcon(currentStep.maneuver)}</View>

            <View style={styles.directionContainer}>
              <Text style={styles.distance}>{nextStepDistance || currentStep.distance.text}</Text>
              <Text numberOfLines={2} style={styles.instruction}>
                {currentStep.instructions}
              </Text>
            </View>
          </View>

          {/* Upcoming direction */}
          {stepIndex < navigationSteps.length - 1 && (
            <Animated.View style={[styles.upcomingStep, { opacity: upcomingStepOpacity }]}>
              <View style={styles.upcomingIconContainer}>
                {getManeuverIcon(navigationSteps[stepIndex + 1].maneuver)}
              </View>
              <Text numberOfLines={1} style={styles.upcomingText}>
                Then {navigationSteps[stepIndex + 1].instructions}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: 12,
    // Center the card horizontally with these changes:
    alignSelf: "center",
    width: "65%", // Reduced from 80%
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 4,
    overflow: "hidden",
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  gif: {
    width: 38,
    height: 38,
    marginRight: 10,
  },
  mainInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 3,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  dotSeparator: {
    fontSize: 14,
    color: NeutralColors.gray400,
    marginHorizontal: 4,
  },
  soundToggle: {
    marginLeft: 8,
  },
  expandButton: {
    padding: 6,
  },
  navigationSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  currentStep: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  directionContainer: {
    flex: 1,
  },
  distance: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  instruction: {
    fontSize: 13,
    color: NeutralColors.gray700,
    lineHeight: 18,
  },
  upcomingStep: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 8,
    borderRadius: 8,
  },
  upcomingIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  upcomingText: {
    fontSize: 13,
    color: NeutralColors.gray600,
    flex: 1,
  },
});

export default DetailsCard;

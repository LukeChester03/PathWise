import React, { useRef, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { TravelMode } from "../../types/MapTypes";

interface DetailsCardProps {
  placeName: string;
  travelTime: string;
  distance: string;
  onSwipeOff: () => void;
  travelMode: TravelMode; // Make this required, not optional
  onInfoPress?: () => void;
}

const DetailsCard: React.FC<DetailsCardProps> = ({
  placeName,
  travelTime,
  distance,
  onSwipeOff,
  travelMode,
  onInfoPress = () => {},
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const shadowAnim = useRef(new Animated.Value(0.25)).current;

  // Use a ref to remember the last mode to detect changes
  const lastModeRef = useRef<TravelMode>(travelMode);

  // Track when travel mode changes
  useEffect(() => {
    if (lastModeRef.current !== travelMode) {
      console.log(`Travel mode changed from ${lastModeRef.current} to ${travelMode}`);
      lastModeRef.current = travelMode;
    }
  }, [travelMode]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Increase shadow opacity when dragging starts
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
        // Reset shadow opacity when dragging ends
        Animated.timing(shadowAnim, {
          toValue: 0.25,
          duration: 100,
          useNativeDriver: false,
        }).start();

        if (gestureState.dx < -100) {
          // Swipe left to dismiss
          Animated.timing(pan, {
            toValue: { x: -500, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onSwipeOff(); // Trigger the parent callback
            pan.setValue({ x: 0, y: 0 }); // Reset position for reuse
          });
        } else {
          // Snap back to original position
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
      <Image
        source={getTravelModeAsset()}
        style={styles.gif}
        key={`travel-${travelMode}`} // Force re-render when mode changes
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Travelling to {placeName}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.info}>Time left: {travelTime}</Text>
          <TouchableOpacity style={styles.infoIconButton} onPress={onInfoPress}>
            <Ionicons name="information-circle" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.info}>Distance: {distance}</Text>
          <View style={[styles.travelModeTag, { backgroundColor: Colors.primary }]}>
            <Ionicons
              name={travelMode === "driving" ? "car" : "walk"}
              size={14}
              color="white"
              style={styles.travelModeIcon}
            />
            <Text style={styles.travelModeText}>
              {travelMode === "driving" ? "Driving" : "Walking"}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 3.84,
    elevation: 6,
    alignItems: "center",
    width: "70%",
  },
  gif: {
    width: 50,
    height: 50,
    marginRight: 16,
    alignContent: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: Colors.primary,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  info: {
    fontSize: 14,
    color: NeutralColors.gray600,
    flex: 1,
  },
  infoIconButton: {
    padding: 4,
  },
  travelModeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  travelModeIcon: {
    marginRight: 4,
  },
  travelModeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default DetailsCard;

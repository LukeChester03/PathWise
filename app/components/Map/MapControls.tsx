// MapControls.tsx - UI components for map controls
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { Colors, NeutralColors } from "../../constants/colours";
import {
  ViewModeToggleProps,
  CardToggleArrowProps,
  EndJourneyButtonProps,
} from "../../types/MapTypes";

/**
 * Card toggle arrow
 */
export const CardToggleArrow: React.FC<CardToggleArrowProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.arrowContainer} onPress={onPress}>
      <FeatherIcon name={"more-horizontal"} size={22} color={NeutralColors.black} />
    </TouchableOpacity>
  );
};

/**
 * End journey button
 */
export const EndJourneyButton: React.FC<EndJourneyButtonProps> = ({ onPress }) => {
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity style={styles.cancelButton} onPress={onPress}>
        <Text style={styles.cancelButtonText}>End Journey</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * User direction indicator for the map
 */
export const DirectionIndicator: React.FC = () => {
  return (
    <View style={styles.directionIndicator}>
      <MaterialIcon name="navigation" size={24} color={Colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: "50%",
    backgroundColor: Colors.danger,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  arrowContainer: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: NeutralColors.white,
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  viewModeButton: {
    position: "absolute",
    bottom: 80,
    right: 15,
    backgroundColor: Colors.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.secondary,
  },
  directionIndicator: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

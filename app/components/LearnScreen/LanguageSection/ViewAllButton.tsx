import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ViewAllButtonProps {
  onPress: () => void;
}

const ViewAllButton: React.FC<ViewAllButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.viewAllPhrasesButton} onPress={onPress}>
      <Text style={styles.viewAllPhrasesText}>View Complete Phrasebook</Text>
      <Ionicons name="chevron-forward" size={16} color="#0284C7" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  viewAllPhrasesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FF",
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewAllPhrasesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0284C7",
    marginRight: 4,
  },
});

export default ViewAllButton;

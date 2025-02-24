// src/components/ExploreCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Button from "../Global/Button";
import { Colors } from "../../constants/colours";

interface ExploreCardProps {
  placeName: string;
  travelTime: string;
  onStartJourney: () => void;
  onCancel: () => void;
}

const ExploreCard: React.FC<ExploreCardProps> = ({
  placeName,
  travelTime,
  onStartJourney,
  onCancel,
}) => {
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.title}>Would you like to explore {placeName}?</Text>
      <Text style={styles.travelTimeText}>Estimated journey time: {travelTime}</Text>
      <View style={styles.buttonContainer}>
        <Button title="Cancel" onPress={onCancel} style={styles.cancelButton} />
        <Button title="Start Journey" onPress={onStartJourney} style={styles.button} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -150 }, { translateY: -100 }],
    width: 300,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  travelTimeText: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: Colors.danger,
  },
});

export default ExploreCard;

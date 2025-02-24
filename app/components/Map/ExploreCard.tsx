// src/components/ExploreCard.tsx
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
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
    <TouchableOpacity activeOpacity={1} onPress={onCancel} style={styles.overlay}>
      <View style={styles.cardContainer}>
        {/* <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity> */}
        <Image source={require("../../assets/logo.png")} style={styles.logo} />
        <Text style={styles.title}>
          You Have Not yet Discovered this Location! Would you like to visit it?
        </Text>
        <Text style={styles.placeName}>{placeName}</Text>
        <TouchableOpacity style={styles.discoverButton} onPress={onStartJourney}>
          <Text style={styles.discoverButtonText}>Start Journey</Text>
        </TouchableOpacity>
        <Text style={styles.travelTime}>Will take {travelTime}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: 360,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.primary,
  },
  logo: {
    height: 62,
    width: 62,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  placeName: {
    fontSize: 26,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  discoverButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 64,
    borderRadius: 5,
  },
  discoverButtonText: {
    color: "white",
    fontSize: 24,
    width: "80%",
    fontWeight: "bold",
  },
  travelTime: {
    marginTop: 8,
    fontSize: 20,
  },
});

export default ExploreCard;

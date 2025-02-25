// src/components/DetailsCard.tsx
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Colors } from "../../constants/colours";

interface DetailsCardProps {
  placeName: string;
  travelTime: string;
  distance: string;
}

const DetailsCard: React.FC<DetailsCardProps> = ({ placeName, travelTime, distance }) => {
  return (
    <View style={styles.cardContainer}>
      <Image source={require("../../assets/walking.gif")} style={styles.gif} />
      <Text style={styles.title}>Travelling to {placeName}</Text>
      <Text style={styles.info}>Time left: {travelTime}</Text>
      <Text style={styles.info}>Distance: {distance}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 200,
    height: 240,
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
  gif: {
    width: 50,
    height: 50,
    alignSelf: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "left",
  },
  info: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "left",
  },
});

export default DetailsCard;

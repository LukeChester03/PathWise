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
      {/* GIF on the left */}
      <Image source={require("../../assets/walking.gif")} style={styles.gif} />

      {/* Text in a column to the right of the GIF */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>Travelling to {placeName}</Text>
        <Text style={styles.info}>Time left: {travelTime}</Text>
        <Text style={styles.info}>Distance: {distance}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: 20, // Position at the top of the screen
    left: 20, // Position at the left of the screen
    flexDirection: "row", // Align GIF and text horizontally
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    width: "60%",
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 6,
    alignItems: "center",
  },
  gif: {
    width: 50,
    height: 50,
    marginRight: 16,
    alignContent: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1, // Take up remaining space
    justifyContent: "center", // Center text vertically
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8, // Add spacing between title and info
    color: Colors.primary, // Use a primary color for emphasis
  },
  info: {
    fontSize: 14,
    marginBottom: 6, // Add spacing between info lines
    color: Colors.text, // Use a neutral color for info
  },
});

export default DetailsCard;

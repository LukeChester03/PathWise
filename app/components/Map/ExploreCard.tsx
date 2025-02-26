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
    <View style={styles.overlay}>
      <View style={styles.cardContainer}>
        {/* Header Image */}
        <Image source={require("../../assets/discover.png")} style={styles.headerImage} />

        {/* Content Container */}
        <View style={styles.content}>
          {/* Title & Place Name */}
          <Text style={styles.title}>You have not yet discovered this place yet!</Text>
          <Text style={styles.placeName}>{placeName}</Text>

          {/* Travel Time */}
          <Text style={styles.travelTime}>Estimated travel time: {travelTime}</Text>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.discoverButton} onPress={onStartJourney}>
            <Text style={styles.discoverButtonText}>Start Journey</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onCancel}>
            <Text style={styles.dismissButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: 340,
    backgroundColor: "white",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  headerImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#334155",
    marginBottom: 8,
  },
  placeName: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.primary,
    marginBottom: 16,
  },
  travelTime: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 64,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  discoverButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  dismissButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  dismissButtonText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
});

export default ExploreCard;

import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "../../constants/colours";

const DestinationCard = ({ placeName, discoveryDate, onLearnMorePress, onDismiss }) => {
  // Format date nicely
  const formattedDate = discoveryDate
    ? new Date(discoveryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <View style={styles.modalContainer}>
      <View style={styles.container}>
        {/* Updated image with minimal city illustration */}
        <View style={styles.imageWrapper}>
          <Image
            source={require("../../assets/destination.jpg")}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* Content container */}
        <View style={styles.content}>
          <Text style={styles.title}>You have discovered a new Place! 🎉</Text>
          <Text style={styles.placeName}>{placeName}</Text>

          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Date discovered</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>

          <TouchableOpacity
            style={styles.learnButton}
            onPress={onLearnMorePress}
            activeOpacity={0.7}
          >
            <Text style={styles.learnButtonText}>Learn about this place</Text>
            <View style={styles.underline} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissButtonText}>Continue Exploring</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    width: "90%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 7,
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 150,
    elevation: 4,
  },
  confettiIcon: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 20,
  },
  content: {
    padding: 24,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  placeName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 20,
  },
  dateContainer: {
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
  },
  learnButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  learnButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  underline: {
    height: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  dismissButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  dismissButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default DestinationCard;

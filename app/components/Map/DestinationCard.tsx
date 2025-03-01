import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const DestinationCard = ({ placeName, placeImage, discoveryDate, onLearnMorePress, onDismiss }) => {
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
        {/* Hero Image with Gradient */}
        <View style={styles.imageWrapper}>
          <Image
            source={placeImage ? { uri: placeImage } : require("../../assets/destination.jpg")}
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
            style={styles.imageGradient}
          />

          {/* Achievement Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
            </View>
          </View>
        </View>

        {/* Content container */}
        <View style={styles.content}>
          {/* Celebration Icon */}
          <View style={styles.celebrationIconContainer}>
            <View style={styles.celebrationIcon}>
              <Text style={styles.celebrationEmoji}>🎉</Text>
            </View>
          </View>

          {/* Achievement Title */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>You have discovered</Text>
            <Text style={styles.placeName}>{placeName}</Text>
          </View>

          {/* Achievement Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.dateCard}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
                style={styles.dateIcon}
              />
              <View>
                <Text style={styles.dateLabel}>Date discovered</Text>
                <Text style={styles.date}>{formattedDate}</Text>
              </View>
            </View>
          </View>

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.learnButton}
              onPress={onLearnMorePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.learnButtonText}>Learn about this place</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.dismissButtonText}>Continue Exploring</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  container: {
    width: width * 0.85,
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  imageWrapper: {
    position: "relative",
    height: 180,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badgeContainer: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    padding: 24,
    paddingTop: 42, // Extra space for the overlapping celebration icon
  },
  celebrationIconContainer: {
    position: "absolute",
    top: -30, // Overlaps with the image
    left: 24,
  },
  celebrationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  celebrationEmoji: {
    fontSize: 30,
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  placeName: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
  },
  statsContainer: {
    marginBottom: 28,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderRadius: 16,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: NeutralColors.gray500,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
  },
  buttonsContainer: {
    gap: 12,
  },
  learnButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  learnButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  dismissButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NeutralColors.gray300,
    alignItems: "center",
  },
  dismissButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: NeutralColors.gray700,
  },
});

export default DestinationCard;

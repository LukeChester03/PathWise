import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

interface ExploreCardProps {
  placeName: string;
  placeDescription?: string;
  placeImage?: string;
  travelTime: string;
  onStartJourney: () => void;
  onCancel: () => void;
}

const { width, height } = Dimensions.get("window");

const ExploreCard: React.FC<ExploreCardProps> = ({
  placeName,
  placeDescription,
  placeImage,
  travelTime,
  onStartJourney,
  onCancel,
}) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.cardContainer}>
        {/* Header Image with Gradient Overlay */}
        <View style={styles.imageContainer}>
          <Image
            source={placeImage ? { uri: placeImage } : require("../../assets/discover.png")}
            style={styles.headerImage}
            defaultSource={require("../../assets/discover.png")}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.imageGradient}
          />
          <View style={styles.imageTitleContainer}>
            <Text style={styles.imageTitle}>{placeName}</Text>
          </View>
        </View>

        {/* Content Container */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Discovery Badge */}
            <View style={styles.badgeContainer}>
              <Ionicons name="compass" size={16} color="white" />
              <Text style={styles.badgeText}>New Discovery</Text>
            </View>

            {/* Place Description */}
            {placeDescription && <Text style={styles.description}>{placeDescription}</Text>}

            {/* Travel Info Card */}
            <View style={styles.travelInfoCard}>
              <Ionicons name="time-outline" size={22} color={Colors.primary} />
              <View style={styles.travelInfoTextContainer}>
                <Text style={styles.travelInfoLabel}>Travel time</Text>
                <Text style={styles.travelInfoValue}>{travelTime}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.discoverButton} onPress={onStartJourney}>
              <Ionicons name="navigate" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.discoverButtonText}>Start Journey</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissButton} onPress={onCancel}>
              <Text style={styles.dismissButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: width * 0.85,
    maxWidth: 380,
    maxHeight: height * 0.75,
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  imageTitleContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  imageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  scrollContainer: {
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    marginBottom: 20,
  },
  badgeText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: NeutralColors.gray600,
    marginBottom: 24,
  },
  travelInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  travelInfoTextContainer: {
    marginLeft: 12,
  },
  travelInfoLabel: {
    fontSize: 14,
    color: NeutralColors.gray500,
  },
  travelInfoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: NeutralColors.black,
  },
  discoverButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  discoverButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissButtonText: {
    fontSize: 16,
    color: NeutralColors.gray500,
    fontWeight: "500",
  },
});

export default ExploreCard;

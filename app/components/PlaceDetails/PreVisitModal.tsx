import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Place } from "../../types/MapTypes";
import { Colors } from "../../constants/colours";
import { GOOGLE_MAPS_APIKEY } from "../../constants/Map/mapConstants";
import { useNavigation } from "@react-navigation/native";
import NavigationService from "../../services/Map/navigationService";
import * as Haptics from "expo-haptics";

interface PreVisitModalProps {
  place: Place;
  onClose: () => void;
  onStartJourney: () => void;
  onViewDetails: () => void;
}

const PreVisitModal: React.FC<PreVisitModalProps> = ({
  place,
  onClose,
  onStartJourney,
  onViewDetails,
}) => {
  const navigation = useNavigation();

  // Get image for the place if available
  const placeImage =
    place.photos && place.photos.length > 0
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
      : null;

  // Use navigation service to show discover card for this place
  const handleStartJourney = () => {
    try {
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log(`PreVisitModal: Starting journey for place: ${place.name}`);

      // Make a deep copy of the place to avoid reference issues
      const placeToShow = JSON.parse(JSON.stringify(place));

      // First call the callback (which may have additional logic)
      onStartJourney();

      // Then use NavigationService to show discover card
      // Use a slight delay to make sure the modal is dismissed properly
      setTimeout(() => {
        NavigationService.showDiscoverCard(navigation, placeToShow);
      }, 100);
    } catch (error) {
      console.error("PreVisitModal: Error starting journey:", error);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header with image */}
          <View style={styles.modalHeader}>
            {placeImage ? (
              <Image source={{ uri: placeImage }} style={styles.headerImage} />
            ) : (
              <View style={[styles.headerImage, styles.placeholderImage]}>
                <Ionicons name="image-outline" size={40} color="#ddd" />
              </View>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalBody}>
            <Text style={styles.title}>{place.name}</Text>

            <View style={styles.discoveryBadge}>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.discoveryBadgeText}>Undiscovered</Text>
            </View>

            <Text style={styles.description}>
              You haven't visited this place yet. Start a journey to discover it and unlock all
              details.
            </Text>

            <View style={styles.benefitContainer}>
              <View style={styles.benefitItem}>
                <Ionicons name="trophy" size={24} color={Colors.primary} />
                <Text style={styles.benefitText}>Earn XP</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="book" size={24} color={Colors.primary} />
                <Text style={styles.benefitText}>Learn History</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="star" size={24} color={Colors.primary} />
                <Text style={styles.benefitText}>Complete Collection</Text>
              </View>
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={styles.secondaryButton} onPress={onViewDetails}>
                <Text style={styles.secondaryButtonText}>View Limited Info</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStartJourney}>
                <Ionicons name="navigate" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Start Journey</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    position: "relative",
    height: 160,
  },
  headerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f1f1",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  discoveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f44336",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  discoveryBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  benefitItem: {
    alignItems: "center",
    flex: 1,
  },
  benefitText: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },
  buttonsContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f1f1f1",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default PreVisitModal;

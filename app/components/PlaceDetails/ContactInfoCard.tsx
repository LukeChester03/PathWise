import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface ContactInfoCardProps {
  placeDetails: Place | VisitedPlaceDetails;
  fontSize: {
    body: number;
    subtitle: number;
  };
  iconSize: {
    small: number;
    normal: number;
  };
}

const ContactInfoCard: React.FC<ContactInfoCardProps> = ({ placeDetails, fontSize, iconSize }) => {
  // Check if contact info exists
  const hasPhone =
    placeDetails.formatted_phone_number && placeDetails.formatted_phone_number.length > 0;
  const hasWebsite = placeDetails.website && placeDetails.website.length > 0;

  // Handle phone call
  const handleCallPress = () => {
    if (placeDetails.formatted_phone_number) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${placeDetails.formatted_phone_number}`);
    }
  };

  // Handle website visit
  const handleWebsitePress = () => {
    if (placeDetails.website) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(placeDetails.website);
    }
  };

  if (!hasPhone && !hasWebsite) {
    return (
      <View style={styles.container}>
        <Text style={[styles.emptyText, { fontSize: fontSize.body }]}>
          No contact information available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={Colors.primary}
          style={styles.headerIcon}
        />
        <Text style={[styles.title, { fontSize: fontSize.subtitle }]}>Information</Text>
      </View>

      <View style={styles.contactButtonsContainer}>
        {hasPhone && (
          <TouchableOpacity
            style={[styles.contactButton, styles.phoneButton]}
            onPress={handleCallPress}
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.contactButtonText}>Call</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasPhone && (
        <View style={styles.detailRow}>
          <Ionicons
            name="call-outline"
            size={iconSize.small}
            color={Colors.primary}
            style={styles.detailIcon}
          />
          <Text style={[styles.detailText, { fontSize: fontSize.body }]}>
            {placeDetails.formatted_phone_number}
          </Text>
        </View>
      )}

      {hasWebsite && (
        <View style={styles.detailRow}>
          <Ionicons
            name="globe-outline"
            size={iconSize.small}
            color={Colors.primary}
            style={styles.detailIcon}
          />
          <Text
            style={[styles.detailText, styles.websiteText, { fontSize: fontSize.body }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {placeDetails.website}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: "600",
    color: "#333",
  },
  contactButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
  },
  phoneButton: {
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  websiteButton: {
    backgroundColor: "#4CAF50",
    marginLeft: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    color: "#444",
    flex: 1,
  },
  websiteText: {
    color: Colors.primary,
  },
  emptyText: {
    color: "#777",
    textAlign: "center",
    padding: 16,
  },
});

export default ContactInfoCard;

// components/ContactInfoSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface ContactInfoSectionProps {
  placeDetails: Place | VisitedPlaceDetails;
  fontSize: {
    body: number;
  };
  iconSize: {
    small: number;
  };
}

const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({
  placeDetails,
  fontSize,
  iconSize,
}) => {
  // Check if contact info exists
  const hasPhone = "formatted_phone_number" in placeDetails && placeDetails.formatted_phone_number;

  const hasWebsite = "website" in placeDetails && placeDetails.website;

  if (!hasPhone && !hasWebsite) {
    return null;
  }

  return (
    <>
      {hasPhone && (
        <View style={styles.contactContainer}>
          <Ionicons
            name="call"
            size={iconSize.small}
            color={Colors.primary}
            style={styles.contactIcon}
          />
          <Text style={[styles.contactText, { fontSize: fontSize.body }]}>
            {placeDetails.formatted_phone_number}
          </Text>
        </View>
      )}

      {hasWebsite && (
        <View style={styles.contactContainer}>
          <Ionicons
            name="globe"
            size={iconSize.small}
            color={Colors.primary}
            style={styles.contactIcon}
          />
          <Text style={[styles.contactText, { fontSize: fontSize.body }]} numberOfLines={1}>
            {placeDetails.website}
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  contactText: {
    color: "#444",
    flex: 1,
  },
  contactIcon: {
    marginRight: 8,
  },
});

export default ContactInfoSection;

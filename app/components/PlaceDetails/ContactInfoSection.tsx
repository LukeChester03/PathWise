// components/ContactInfoSection.tsx
import React from "react";
import { View, Text, StyleSheet, Linking, TouchableOpacity } from "react-native";
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
  const hasPhone =
    placeDetails.formatted_phone_number && placeDetails.formatted_phone_number.length > 0;
  const hasWebsite = placeDetails.website && placeDetails.website.length > 0;

  // Handle phone call
  const handleCallPress = () => {
    if (placeDetails.formatted_phone_number) {
      Linking.openURL(`tel:${placeDetails.formatted_phone_number}`);
    }
  };

  // Handle website visit
  const handleWebsitePress = () => {
    if (placeDetails.website) {
      Linking.openURL(placeDetails.website);
    }
  };

  if (!hasPhone && !hasWebsite) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { fontSize: fontSize.body }]}>
          No contact information available
        </Text>
      </View>
    );
  }

  return (
    <>
      {hasPhone && (
        <TouchableOpacity style={styles.contactContainer} onPress={handleCallPress}>
          <Ionicons
            name="call"
            size={iconSize.small}
            color={Colors.primary}
            style={styles.contactIcon}
          />
          <Text style={[styles.contactText, { fontSize: fontSize.body }]}>
            {placeDetails.formatted_phone_number}
          </Text>
        </TouchableOpacity>
      )}

      {hasWebsite && (
        <TouchableOpacity style={styles.contactContainer} onPress={handleWebsitePress}>
          <Ionicons
            name="globe"
            size={iconSize.small}
            color={Colors.primary}
            style={styles.contactIcon}
          />
          <Text
            style={[styles.contactText, styles.linkText, { fontSize: fontSize.body }]}
            numberOfLines={1}
          >
            {placeDetails.website}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 6,
  },
  contactText: {
    color: "#444",
    flex: 1,
  },
  contactIcon: {
    marginRight: 8,
  },
  linkText: {
    color: Colors.primary,
  },
  emptyContainer: {
    padding: 10,
    alignItems: "center",
  },
  emptyText: {
    color: "#777",
  },
});

export default ContactInfoSection;

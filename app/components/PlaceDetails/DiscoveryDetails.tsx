import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { VisitedPlaceDetails } from "../../types/MapTypes";

interface DiscoveryDetailsSectionProps {
  placeDetails: VisitedPlaceDetails;
  fontSize: {
    body: number;
  };
}

const DiscoveryDetailsSection: React.FC<DiscoveryDetailsSectionProps> = ({
  placeDetails,
  fontSize,
}) => {
  const formatVisitDate = () => {
    if (!placeDetails) return null;

    if ("visitedAt" in placeDetails && placeDetails.visitedAt) {
      const date = new Date(placeDetails.visitedAt);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return null;
  };

  const visitDate = formatVisitDate();

  if (!visitDate) {
    return null;
  }

  return (
    <View style={styles.visitContainer}>
      <Text style={[styles.visitText, { fontSize: fontSize.body }]}>Discovered on {visitDate}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  visitContainer: {
    paddingVertical: 6,
  },
  visitText: {
    color: "#444",
  },
});

export default DiscoveryDetailsSection;

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface AddressSectionProps {
  placeDetails: Place | VisitedPlaceDetails;
  fontSize: {
    body: number;
  };
}

const AddressSection: React.FC<AddressSectionProps> = ({ placeDetails, fontSize }) => {
  const getAddress = () => {
    if (!placeDetails) return "No address available";
    return placeDetails.formatted_address || placeDetails.vicinity || "No address available";
  };

  return (
    <View style={styles.addressContainer}>
      <Text style={[styles.addressText, { fontSize: fontSize.body }]}>{getAddress()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  addressContainer: {
    paddingVertical: 6,
  },
  addressText: {
    color: "#444",
    lineHeight: 20,
  },
});

export default AddressSection;

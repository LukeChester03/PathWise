// components/OpeningHoursSection.tsx
import React from "react";
import { Text, StyleSheet } from "react-native";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface OpeningHoursSectionProps {
  placeDetails: Place | VisitedPlaceDetails;
  fontSize: {
    body: number;
  };
}

const OpeningHoursSection: React.FC<OpeningHoursSectionProps> = ({ placeDetails, fontSize }) => {
  // Check if opening hours exist
  const hasOpeningHours =
    "opening_hours" in placeDetails &&
    placeDetails.opening_hours?.weekday_text &&
    Array.isArray(placeDetails.opening_hours.weekday_text);

  if (!hasOpeningHours) {
    return null;
  }

  return (
    <>
      {placeDetails.opening_hours.weekday_text.map((day, index) => (
        <Text key={index} style={[styles.hoursText, { fontSize: fontSize.body }]}>
          {day}
        </Text>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  hoursText: {
    color: "#444",
    marginBottom: 6,
  },
});

export default OpeningHoursSection;

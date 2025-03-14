import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";

// Import types but maintain compatibility with existing code
import { Place } from "../../types/MapTypes";

interface OpeningHoursCardProps {
  placeDetails: Place;
  fontSize: {
    small: number;
    body: number;
    subtitle: number;
    title: number;
    large: number;
  };
}

const OpeningHoursCard: React.FC<OpeningHoursCardProps> = ({ placeDetails, fontSize }) => {
  const [expanded, setExpanded] = useState(false);

  // Get current day of the week (0 is Sunday, 1 is Monday, etc.)
  const today = new Date().getDay();
  // Convert to match the format used in weekday_text (0 becomes Monday in some APIs)
  const adjustedToday = (today + 6) % 7; // This assumes weekday_text[0] is Monday

  // Check if the place is open now
  const isOpenNow = useMemo(() => {
    if (!placeDetails.opening_hours) return null;
    return placeDetails.opening_hours.open_now;
  }, [placeDetails]);

  // Format the hours text from "Monday: 9:00 AM – 10:00 PM" to just "9:00 AM – 10:00 PM"
  const formatHoursText = (text: string) => {
    const parts = text.split(": ");
    return parts.length > 1 ? parts[1] : text;
  };

  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // If we don't have the weekday_text, we should handle that case
  if (
    !placeDetails.opening_hours?.weekday_text ||
    placeDetails.opening_hours.weekday_text.length === 0
  ) {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: "#999" }]} />
          <Text style={[styles.statusText, { fontSize: fontSize.body }]}>Hours not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current status indicator */}
      <View style={styles.statusContainer}>
        <View
          style={[styles.statusIndicator, { backgroundColor: isOpenNow ? "#4CAF50" : "#F44336" }]}
        />
        <Text style={[styles.statusText, { fontSize: fontSize.body }]}>
          {isOpenNow ? "Open now" : "Closed now"}
        </Text>

        {/* Today's hours */}
        <Text style={[styles.todayHours, { fontSize: fontSize.body }]}>
          {formatHoursText(placeDetails.opening_hours.weekday_text[adjustedToday])}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Toggle button */}
      <TouchableOpacity style={styles.toggleButton} onPress={() => setExpanded(!expanded)}>
        <Text style={[styles.toggleText, { fontSize: fontSize.small }]}>
          {expanded ? "Hide full schedule" : "Show full schedule"}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.primary}
        />
      </TouchableOpacity>

      {/* Weekly schedule */}
      {expanded && (
        <View style={styles.scheduleContainer}>
          {placeDetails.opening_hours.weekday_text.map((dayText, index) => {
            const isToday = index === adjustedToday;

            return (
              <View key={index} style={[styles.dayRow, isToday && styles.todayRow]}>
                <Text
                  style={[
                    styles.dayName,
                    { fontSize: fontSize.body },
                    isToday && styles.highlightText,
                  ]}
                >
                  {weekdays[index]}
                </Text>
                <Text
                  style={[
                    styles.dayHours,
                    { fontSize: fontSize.body },
                    isToday && styles.highlightText,
                  ]}
                >
                  {formatHoursText(dayText)}
                </Text>
              </View>
            );
          })}
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
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontWeight: "600",
    color: "#333",
  },
  todayHours: {
    color: "#666",
    marginLeft: "auto",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 16,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  toggleText: {
    color: Colors.primary,
    fontWeight: "500",
    marginRight: 4,
  },
  scheduleContainer: {
    padding: 16,
    paddingTop: 0,
  },
  dayRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  todayRow: {
    backgroundColor: "rgba(0, 102, 204, 0.05)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  dayName: {
    width: 80,
    color: "#333",
    fontWeight: "500",
  },
  dayHours: {
    flex: 1,
    color: "#666",
  },
  highlightText: {
    fontWeight: "600",
    color: Colors.primary,
  },
});

export default OpeningHoursCard;

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors, AccentColors } from "../../constants/colours";

interface VisitStatsCardsComponentProps {
  averageDuration: string;
  averageDistance: string;
  mostVisitedCity: string;
}

const VisitStatsCardsComponent: React.FC<VisitStatsCardsComponentProps> = ({
  averageDuration,
  averageDistance,
  mostVisitedCity,
}) => {
  return (
    <View style={styles.statsCardContainer}>
      {/* Average Duration Card */}
      <LinearGradient
        colors={[Colors.primary, AccentColors.accent1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name="time-outline" size={24} color="white" />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsCardLabel}>Average Duration</Text>
            <Text style={styles.statsCardValue}>{averageDuration}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Average Distance Card */}
      <LinearGradient
        colors={[AccentColors.accent2, AccentColors.accent3]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name="navigate-outline" size={24} color="white" />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsCardLabel}>Average Distance</Text>
            <Text style={styles.statsCardValue}>{averageDistance}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Most Visited City Card */}
      <LinearGradient
        colors={[Colors.secondary, AccentColors.accent4 || "#9C27B0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name="location-outline" size={24} color="white" />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsCardLabel}>Top City</Text>
            <Text style={styles.statsCardValue}>{mostVisitedCity}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  statsCardContainer: {
    flexDirection: "column",
    gap: 12,
    marginVertical: 16,
  },
  statsCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statsTextContainer: {
    flex: 1,
  },
  statsCardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.white,
    marginTop: 4,
  },
  statsCardLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
  },
});

export default VisitStatsCardsComponent;

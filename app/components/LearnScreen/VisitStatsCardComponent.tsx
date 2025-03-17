// components/LearnScreen/VisitStatsCardsComponent.tsx
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
      <LinearGradient
        colors={[Colors.primary, AccentColors.accent1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name="time" size={24} color={NeutralColors.white} />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsCardLabel}>Average Duration</Text>
            <Text style={styles.statsCardValue} numberOfLines={2}>
              {averageDuration}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={[Colors.secondary, AccentColors.accent2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name="map" size={24} color={NeutralColors.white} />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsCardLabel}>Average Distance</Text>
            <Text style={styles.statsCardValue} numberOfLines={2}>
              {averageDistance}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={[AccentColors.accent3, Colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.cardContent}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name="location" size={24} color={NeutralColors.white} />
          </View>
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsCardLabel}>Top City</Text>
            <Text style={styles.statsCardValue} numberOfLines={2}>
              {mostVisitedCity}
            </Text>
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

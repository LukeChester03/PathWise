// components/LearnScreen/TravelerTraitsComponent.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelerTrait } from "../../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors } from "../../../constants/colours";
import GradientCard from "../../Global/GradientCard";

interface TravelerTraitsComponentProps {
  traits: TravelerTrait[] | undefined;
}

const TravelerTraitsComponent: React.FC<TravelerTraitsComponentProps> = ({ traits }) => {
  // Add logging to debug what's being received
  useEffect(() => {
    console.log(
      "TravelerTraitsComponent received traits:",
      traits ? `${traits.length} items` : "undefined"
    );
    if (traits && traits.length > 0) {
      console.log("First trait sample:", JSON.stringify(traits[0]));
    }
  }, [traits]);

  // Handle both undefined and empty arrays
  if (!traits || traits.length === 0) {
    return (
      <View style={styles.emptyTraitsContainer}>
        <Ionicons name="person-outline" size={24} color={Colors.primary} />
        <Text style={styles.emptyTraitsTitle}>Travel Traits Coming Soon</Text>
        <Text style={styles.emptyTraitsText}>
          Visit more places to reveal your unique traveler traits and tendencies
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.traitsContainer}>
      <Text style={styles.traitsDescription}>
        Based on your travel patterns, we've identified these unique traits that define your travel
        style:
      </Text>

      <ScrollView
        style={styles.traitsScrollView}
        contentContainerStyle={styles.traitsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {traits.map((trait, index) => {
          // Ensure we have all required properties with fallbacks
          const safeTraitId = trait.id || `trait-${index}`;
          const safeTraitTitle = trait.title || "Travel Trait";
          const safeTraitDescription = trait.description || "A unique aspect of your travel style";
          const safeTraitIcon = trait.icon || "person";
          const safeTraitColor = trait.color || Colors.primary;

          // Create a gradient using the trait color
          const traitGradient = [safeTraitColor, adjustColorBrightness(safeTraitColor, 30)];

          return (
            <GradientCard
              key={safeTraitId}
              gradientColors={traitGradient}
              icon={safeTraitIcon}
              title={safeTraitTitle}
              description={safeTraitDescription}
              cardStyle={[
                styles.traitCard,
                index < traits.length - 1 ? styles.traitCardWithMargin : null,
              ]}
              contentStyle={styles.customCardContent}
              iconContainerStyle={styles.customIconContainer}
              titleStyle={styles.customTitleStyle}
              descriptionStyle={styles.customDescriptionStyle}
              gradientStart={{ x: 0, y: 0 }}
              gradientEnd={{ x: 0, y: 1 }}
            />
          );
        })}
      </ScrollView>

      {traits.length > 3 && (
        <View style={styles.scrollIndicator}>
          <Ionicons
            name="chevron-down"
            size={16}
            color={Colors.primary}
            style={styles.scrollIndicatorIcon}
          />
          <Text style={styles.scrollIndicatorText}>Scroll to see more traits</Text>
        </View>
      )}
    </View>
  );
};

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, percent: number): string {
  // Validate hex color
  hex = hex.replace(/^\s*#|\s*$/g, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  const adjustR = Math.floor((r * (100 + percent)) / 100);
  const adjustG = Math.floor((g * (100 + percent)) / 100);
  const adjustB = Math.floor((b * (100 + percent)) / 100);

  // Ensure the values are within valid range
  const clampR = Math.min(255, Math.max(0, adjustR));
  const clampG = Math.min(255, Math.max(0, adjustG));
  const clampB = Math.min(255, Math.max(0, adjustB));

  // Convert back to hex
  return `#${clampR.toString(16).padStart(2, "0")}${clampG.toString(16).padStart(2, "0")}${clampB
    .toString(16)
    .padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  traitsContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  traitsDescription: {
    fontSize: 14,
    color: NeutralColors.gray700,
    marginBottom: 16,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  traitsScrollView: {
    maxHeight: 480, // Limit height to ensure it's scrollable
  },
  traitsScrollContent: {
    paddingBottom: 8,
  },
  traitCard: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  traitCardWithMargin: {
    marginBottom: 12,
  },
  customCardContent: {
    padding: 16,
  },
  customIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  customTitleStyle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  customDescriptionStyle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  emptyTraitsContainer: {
    padding: 16,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 8,
  },
  emptyTraitsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    marginVertical: 8,
  },
  emptyTraitsText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    textAlign: "center",
    lineHeight: 20,
  },
  scrollIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    opacity: 0.7,
  },
  scrollIndicatorIcon: {
    marginRight: 4,
  },
  scrollIndicatorText: {
    fontSize: 12,
    color: Colors.primary,
    fontStyle: "italic",
  },
});

export default TravelerTraitsComponent;

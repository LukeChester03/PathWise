// components/LearnScreen/TravelerTraitsComponent.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelerTrait } from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors } from "../../constants/colours";

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

          return (
            <View
              key={safeTraitId}
              style={[
                styles.traitCard,
                { borderLeftColor: safeTraitColor },
                index < traits.length - 1 ? styles.traitCardWithMargin : null,
              ]}
            >
              <View style={styles.traitCardContent}>
                <View style={[styles.traitIconContainer, { backgroundColor: safeTraitColor }]}>
                  <Ionicons name={safeTraitIcon as any} size={24} color="#FFFFFF" />
                </View>

                <View style={styles.traitTextContainer}>
                  <Text style={styles.traitTitle}>{safeTraitTitle}</Text>
                  <Text style={styles.traitDescription}>{safeTraitDescription}</Text>
                </View>
              </View>
            </View>
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
    maxHeight: 300, // Limit height to ensure it's scrollable
  },
  traitsScrollContent: {
    paddingBottom: 8,
  },
  traitCard: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  traitCardWithMargin: {
    marginBottom: 12,
  },
  traitCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  traitIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  traitTextContainer: {
    flex: 1,
  },
  traitTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  traitDescription: {
    fontSize: 14,
    color: NeutralColors.gray600,
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

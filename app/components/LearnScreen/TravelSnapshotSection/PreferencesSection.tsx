import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelProfile } from "../../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../../constants/colours";
import SectionHeader from "../SectionHeader";

interface PreferenceCategory {
  category?: string;
  name?: string;
  percentage: number;
  icon?: string;
}

interface PreferencesSectionProps {
  profile: TravelProfile;
  expanded: boolean;
  toggleExpanded: () => void;
}

const formatPercentage = (percentage: number | string | undefined): string => {
  if (percentage === undefined) return "0%";

  const numPercentage =
    typeof percentage === "string" ? parseFloat(percentage.replace(/%/g, "")) : percentage;

  return `${Math.round(numPercentage)}%`;
};

const getCategoryIcon = (category: string | undefined): string => {
  const iconMap: { [key: string]: string } = {
    "Historical Sites": "book-outline",
    "Natural Landscapes": "leaf",
    "Urban Exploration": "business",
    "Cultural Experiences": "color-palette",
    "Adventure Travel": "compass",
    "Food and Dining": "restaurant",
    "Beach Destinations": "beach",
    "Mountain Destinations": "mountain",
    "Art and Museums": "art",
    "Architecture Tours": "build",

    Classical: "book",
    Modern: "logo-react",
    Gothic: "document",
    Renaissance: "easel",
    Baroque: "flower",

    "Guided Tours": "people",
    Photography: "camera",
    Hiking: "walk",
    "Culinary Experiences": "restaurant",
    "Historical Walks": "time",

    default: "globe",
  };

  return category ? iconMap[category] || iconMap["default"] : iconMap["default"];
};

const getProgressBarColor = (index: number): string => {
  const colorOptions = [
    Colors.primary,
    Colors.secondary,
    AccentColors.accent1,
    AccentColors.accent2,
    AccentColors.accent3,
  ];

  return colorOptions[index % colorOptions.length];
};

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  profile,
  expanded,
  toggleExpanded,
}) => {
  const safePreferences = {
    categories: profile.preferences?.categories || [],
    architecturalStyles: profile.preferences?.architecturalStyles || [],
    activities: profile.preferences?.activities || [],
  };

  const hasPreferences =
    safePreferences.categories.length > 0 ||
    safePreferences.architecturalStyles.length > 0 ||
    safePreferences.activities.length > 0;

  if (!hasPreferences) {
    return (
      <TouchableOpacity style={styles.section} onPress={toggleExpanded} activeOpacity={0.7}>
        <SectionHeader
          title="Travel Preferences"
          icon="heart"
          color={Colors.primary}
          rightElement={
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={Colors.primary}
            />
          }
        />
        {expanded && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              Continue exploring to reveal your travel preferences
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.section} onPress={toggleExpanded} activeOpacity={0.7}>
      <SectionHeader
        title="Travel Preferences"
        icon="heart"
        color={Colors.primary}
        rightElement={
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={Colors.primary}
          />
        }
      />

      {expanded && (
        <View style={styles.preferencesContainer}>
          {safePreferences.categories.length > 0 && (
            <PreferencesSubsection
              title="Place Categories"
              preferences={safePreferences.categories}
            />
          )}

          {safePreferences.architecturalStyles.length > 0 && (
            <PreferencesSubsection
              title="Architectural Styles"
              preferences={safePreferences.architecturalStyles}
              style={{ marginTop: 20 }}
            />
          )}

          {safePreferences.activities.length > 0 && (
            <PreferencesSubsection
              title="Activities"
              preferences={safePreferences.activities}
              style={{ marginTop: 20 }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const PreferencesSubsection: React.FC<{
  title: string;
  preferences: PreferenceCategory[];
  style?: object;
}> = ({ title, preferences, style }) => {
  return (
    <>
      <Text style={[styles.subsectionTitle, style]}>{title}</Text>
      {preferences.map((preference, index) => (
        <View key={index} style={styles.preferenceItem}>
          <View style={styles.preferenceHeader}>
            {(preference.category || preference.icon) && (
              <View style={styles.preferenceIconContainer}>
                <Ionicons
                  name={getCategoryIcon(preference.category || preference.icon)}
                  size={18}
                  color={Colors.primary}
                />
              </View>
            )}
            <Text style={styles.preferenceLabel}>
              {preference.category || preference.name || "Unnamed Preference"}
            </Text>
            <Text style={styles.preferencePercentage}>
              {formatPercentage(preference.percentage)}
            </Text>
          </View>
          <View style={styles.preferenceBarContainer}>
            <View
              style={[
                styles.preferenceBar,
                {
                  width: `${Math.min(100, Number(preference.percentage) || 0)}%`,
                  backgroundColor: getProgressBarColor(index),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  preferencesContainer: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
    marginBottom: 12,
  },
  preferenceItem: {
    marginBottom: 12,
  },
  preferenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  preferenceIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NeutralColors.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  preferenceLabel: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.gray700,
  },
  preferencePercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  preferenceBarContainer: {
    height: 8,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 4,
  },
  preferenceBar: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  noDataContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default PreferencesSection;

// components/LearnScreen/PreferencesSection.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TravelProfile } from "../../types/LearnScreen/TravelProfileTypes";
import { Colors, NeutralColors, AccentColors } from "../../constants/colours";
import SectionHeader from "./SectionHeader";

interface PreferencesSectionProps {
  profile: TravelProfile;
  expanded: boolean;
  toggleExpanded: () => void;
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  profile,
  expanded,
  toggleExpanded,
}) => {
  return (
    <TouchableOpacity style={styles.section} onPress={toggleExpanded}>
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
          <Text style={styles.subsectionTitle}>Place Categories</Text>

          {profile.preferences.categories.map((category, index) => (
            <View key={index} style={styles.preferenceItem}>
              <View style={styles.preferenceHeader}>
                <View style={styles.preferenceIconContainer}>
                  <Ionicons name={category.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.preferenceLabel}>{category.category}</Text>
                <Text style={styles.preferencePercentage}>{category.percentage}%</Text>
              </View>
              <View style={styles.preferenceBarContainer}>
                <View
                  style={[
                    styles.preferenceBar,
                    {
                      width: `${category.percentage}%`,
                      backgroundColor:
                        index % 3 === 0
                          ? Colors.primary
                          : index % 3 === 1
                          ? Colors.secondary
                          : AccentColors.accent1,
                    },
                  ]}
                />
              </View>
            </View>
          ))}

          <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Architectural Styles</Text>

          {profile.preferences.architecturalStyles.map((style, index) => (
            <View key={index} style={styles.preferenceItem}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceLabel}>{style.name}</Text>
                <Text style={styles.preferencePercentage}>{style.percentage}%</Text>
              </View>
              <View style={styles.preferenceBarContainer}>
                <View
                  style={[
                    styles.preferenceBar,
                    {
                      width: `${style.percentage}%`,
                      backgroundColor:
                        index % 3 === 0
                          ? Colors.secondary
                          : index % 3 === 1
                          ? AccentColors.accent2
                          : Colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          ))}

          <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Activities</Text>

          {profile.preferences.activities.map((activity, index) => (
            <View key={index} style={styles.preferenceItem}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceLabel}>{activity.name}</Text>
                <Text style={styles.preferencePercentage}>{activity.percentage}%</Text>
              </View>
              <View style={styles.preferenceBarContainer}>
                <View
                  style={[
                    styles.preferenceBar,
                    {
                      width: `${activity.percentage}%`,
                      backgroundColor:
                        index % 3 === 0
                          ? AccentColors.accent3
                          : index % 3 === 1
                          ? Colors.primary
                          : Colors.secondary,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
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
});

export default PreferencesSection;

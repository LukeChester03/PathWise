// components/AdvancedAnalysis/AnalysisTabs.tsx
import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../../../constants/colours";
import { TabSection } from "../../../../screens/AdvancedTravelAnalysisScreen";

type TabData = {
  id: TabSection;
  label: string;
  icon: string;
};

type AnalysisTabsProps = {
  activeTab: TabSection;
  onTabChange: (tab: TabSection) => void;
};

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: TabData[] = [
    { id: "temporal", label: "Temporal", icon: "time-outline" },
    { id: "spatial", label: "Spatial", icon: "map-outline" },
    { id: "behavioral", label: "Behavioral", icon: "person-outline" },
    { id: "predictive", label: "Predictive", icon: "compass-outline" },
    { id: "insights", label: "Insights", icon: "bulb-outline" },
    { id: "comparative", label: "Comparative", icon: "bar-chart-outline" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabsContainer}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tabButton, activeTab === tab.id && styles.activeTabButton]}
          onPress={() => onTabChange(tab.id)}
        >
          <Ionicons
            name={tab.icon as any}
            size={18}
            color={activeTab === tab.id ? Colors.primary : "#6B7280"}
          />
          <Text style={[styles.tabButtonText, activeTab === tab.id && styles.activeTabButtonText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray300,
    backgroundColor: Colors.background,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
});

export default AnalysisTabs;

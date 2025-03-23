// components/LearnScreen/KnowledgeQuestSection/TabBar.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type TabType = "quizzes" | "results" | "badges";

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "quizzes" && styles.activeTab]}
        onPress={() => onTabChange("quizzes")}
      >
        <Ionicons
          name="help-circle"
          size={18}
          color={activeTab === "quizzes" ? "#6366F1" : "#6B7280"}
        />
        <Text style={[styles.tabText, activeTab === "quizzes" && styles.activeTabText]}>
          Quizzes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === "results" && styles.activeTab]}
        onPress={() => onTabChange("results")}
      >
        <Ionicons name="trophy" size={18} color={activeTab === "results" ? "#6366F1" : "#6B7280"} />
        <Text style={[styles.tabText, activeTab === "results" && styles.activeTabText]}>
          Results
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === "badges" && styles.activeTab]}
        onPress={() => onTabChange("badges")}
      >
        <Ionicons name="ribbon" size={18} color={activeTab === "badges" ? "#6366F1" : "#6B7280"} />
        <Text style={[styles.tabText, activeTab === "badges" && styles.activeTabText]}>Badges</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 4,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#6366F1",
  },
});

export default TabBar;

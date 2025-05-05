import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const LanguageAssistantHeader: React.FC = () => {
  return (
    <>
      <View style={styles.aiLanguageHeader}>
        <Ionicons name="language" size={22} color="#0284C7" />
        <Text style={styles.aiLanguageTitle}>AI Language Assistant</Text>
      </View>
      <Text style={styles.aiLanguageSubtitle}>Useful phrases from regions you've visited:</Text>
    </>
  );
};

const styles = StyleSheet.create({
  aiLanguageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiLanguageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284C7",
    marginLeft: 8,
  },
  aiLanguageSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
});

export default LanguageAssistantHeader;

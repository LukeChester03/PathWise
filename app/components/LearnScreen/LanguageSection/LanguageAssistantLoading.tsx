import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

const LanguageAssistantLoading: React.FC = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color="#0284C7" />
      <Text style={styles.loadingText}>Generating phrases...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4B5563",
  },
});

export default LanguageAssistantLoading;

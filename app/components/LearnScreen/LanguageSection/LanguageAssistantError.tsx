import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface LanguageAssistantErrorProps {
  error: string;
  onRetry: () => void;
}

const LanguageAssistantError: React.FC<LanguageAssistantErrorProps> = ({ error, onRetry }) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

export default LanguageAssistantError;

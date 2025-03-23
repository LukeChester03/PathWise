// components/LearnScreen/KnowledgeQuestSection/EmptyState.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  buttonText: string;
  buttonIcon: string;
  onButtonPress: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  buttonText,
  buttonIcon,
  onButtonPress,
}) => {
  return (
    <View style={styles.emptyStateContainer}>
      <Ionicons name={icon as any} size={60} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateText}>{message}</Text>
      <TouchableOpacity style={styles.actionButton} onPress={onButtonPress}>
        <Ionicons name={buttonIcon as any} size={16} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    padding: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

export default EmptyState;

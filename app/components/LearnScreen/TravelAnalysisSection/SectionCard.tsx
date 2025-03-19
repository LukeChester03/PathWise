// components/AdvancedAnalysis/SectionCard.tsx
import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../../constants/colours";

type SectionCardProps = {
  title: string;
  description: string;
  icon: string;
  children: ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, description, icon, children }) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <Text style={styles.sectionDescription}>{description}</Text>

      {children}
    </View>
  );
};

export const NoDataText: React.FC<{ text?: string }> = ({ text = "No data available" }) => (
  <Text style={styles.noDataText}>{text}</Text>
);

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: NeutralColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default SectionCard;

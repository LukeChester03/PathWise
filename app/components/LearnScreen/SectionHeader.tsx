// components/LearnScreen/SectionHeader.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";

interface SectionHeaderProps {
  title: string;
  icon: string;
  color?: string;
  rightElement?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  color = Colors.primary,
  rightElement,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={icon as any} size={22} color={color} />
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>{title}</Text>
      </View>
      {rightElement}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
});

export default SectionHeader;

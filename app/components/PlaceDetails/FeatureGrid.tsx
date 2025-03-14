import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const GRID_SPACING = 12;
const ITEMS_PER_ROW = 2;
const ITEM_WIDTH = (width - 40 - GRID_SPACING * (ITEMS_PER_ROW - 1)) / ITEMS_PER_ROW;

interface FeatureCardProps {
  title: string;
  icon: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  icon,
  onPress,
  color = Colors.primary,
  textColor = "#fff",
}) => {
  return (
    <TouchableOpacity
      style={[styles.featureCard, { backgroundColor: color }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={24} color={textColor} style={styles.featureIcon} />
      <Text style={[styles.featureTitle, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
};

interface FeatureGridProps {
  features: FeatureCardProps[];
  style?: object;
}

const FeatureGrid: React.FC<FeatureGridProps> = ({ features, style = {} }) => {
  if (!features || features.length === 0) return null;

  return (
    <View style={[styles.gridContainer, style]}>
      {features.map((feature, index) => (
        <FeatureCard
          key={index}
          title={feature.title}
          icon={feature.icon}
          onPress={feature.onPress}
          color={feature.color}
          textColor={feature.textColor}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: ITEM_WIDTH,
    height: 90,
    borderRadius: 16,
    padding: 16,
    marginBottom: GRID_SPACING,
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default FeatureGrid;

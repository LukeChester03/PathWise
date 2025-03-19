// components/common/GradientCard.tsx
import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface GradientCardProps {
  /**
   * Array of colors for the gradient background
   */
  gradientColors: string[];

  /**
   * Optional starting point for the gradient
   */
  gradientStart?: { x: number; y: number };

  /**
   * Optional ending point for the gradient
   */
  gradientEnd?: { x: number; y: number };

  /**
   * Icon name from Ionicons
   */
  icon?: string;

  /**
   * Size of the icon
   */
  iconSize?: number;

  /**
   * Color of the icon
   */
  iconColor?: string;

  /**
   * Custom style for the icon container
   */
  iconContainerStyle?: StyleProp<ViewStyle>;

  /**
   * Primary value displayed in the card
   */
  value?: string | number;

  /**
   * Custom style for the value text
   */
  valueStyle?: StyleProp<TextStyle>;

  /**
   * Title of the card
   */
  title: string;

  /**
   * Custom style for the title text
   */
  titleStyle?: StyleProp<TextStyle>;

  /**
   * Optional description for the card
   */
  description?: string;

  /**
   * Custom style for the description text
   */
  descriptionStyle?: StyleProp<TextStyle>;

  /**
   * Custom style for the card container
   */
  cardStyle?: StyleProp<ViewStyle>;

  /**
   * Custom style for the content container
   */
  contentStyle?: StyleProp<ViewStyle>;

  /**
   * Use compact layout (less padding/margins)
   */
  compact?: boolean;

  /**
   * Optional custom content to render instead of the default layout
   */
  children?: React.ReactNode;
}

/**
 * A reusable gradient card component that can be used for various card displays
 * throughout the application, including milestones and traveler traits.
 */
const GradientCard: React.FC<GradientCardProps> = ({
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  icon,
  iconSize = 24,
  iconColor = "white",
  iconContainerStyle,
  value,
  valueStyle,
  title,
  titleStyle,
  description,
  descriptionStyle,
  cardStyle,
  contentStyle,
  compact = false,
  children,
}) => {
  // If children are provided, render custom content
  if (children) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={gradientStart}
        end={gradientEnd}
        style={[styles.card, cardStyle]}
      >
        <View style={[styles.cardContent, compact && styles.compactContent, contentStyle]}>
          {children}
        </View>
      </LinearGradient>
    );
  }

  // Otherwise, render the default card layout
  return (
    <LinearGradient
      colors={gradientColors}
      start={gradientStart}
      end={gradientEnd}
      style={[styles.card, cardStyle]}
    >
      <View style={[styles.cardContent, compact && styles.compactContent, contentStyle]}>
        <View style={[styles.cardLayout, compact ? styles.compactLayout : styles.standardLayout]}>
          {icon && (
            <View
              style={[
                styles.iconContainer,
                compact && styles.compactIconContainer,
                iconContainerStyle,
              ]}
            >
              <Ionicons name={icon as any} size={iconSize} color={iconColor} />
            </View>
          )}

          <View
            style={[
              styles.textContainer,
              compact ? styles.compactTextContainer : styles.standardTextContainer,
              !icon && styles.noIconTextContainer,
            ]}
          >
            {value !== undefined && <Text style={[styles.value, valueStyle]}>{value}</Text>}
            <Text style={[styles.title, compact && styles.compactTitle, titleStyle]}>{title}</Text>
            {description && (
              <Text
                style={[styles.description, compact && styles.compactDescription, descriptionStyle]}
              >
                {description}
              </Text>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: 16,
  },
  compactContent: {
    padding: 12,
  },
  cardLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  standardLayout: {
    alignItems: "flex-start",
  },
  compactLayout: {
    alignItems: "center",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  standardTextContainer: {
    paddingTop: 4,
  },
  compactTextContainer: {
    paddingTop: 0,
  },
  noIconTextContainer: {
    marginLeft: 0,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 6,
  },
  compactTitle: {
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 20,
  },
  compactDescription: {
    lineHeight: 18,
  },
});

export default GradientCard;

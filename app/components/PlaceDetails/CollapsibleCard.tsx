// components/CollapsibleCard.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  Platform,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";

// Animation timing constants
const STAGGER_DELAY = 80;

// Custom spring animation preset
const springConfig = {
  tension: 50,
  friction: 7,
  useNativeDriver: true,
};

// Card shadow preset for consistent styling
const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: {
    elevation: 3,
  },
});

interface CollapsibleCardProps {
  title: string;
  children: React.ReactNode;
  icon?: string;
  index?: number;
  style?: object;
  titleStyle?: object;
  isExpandable?: boolean;
  initiallyExpanded?: boolean;
  showAiBadge?: boolean;
  animationDelay?: number;
  onToggle?: (expanded: boolean) => void;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  children,
  icon,
  index = 0,
  style = {},
  titleStyle = {},
  isExpandable = true,
  initiallyExpanded = true,
  showAiBadge = false,
  animationDelay = 0,
  onToggle = () => {},
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(expanded ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      delay: STAGGER_DELAY * index + animationDelay,
      ...springConfig,
    }).start();
  }, [index, animationDelay]);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
  }, [expanded]);

  const toggleExpanded = () => {
    if (!isExpandable) return;

    LayoutAnimation.configureNext({
      ...LayoutAnimation.Presets.easeInEaseOut,
      duration: 250,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
    onToggle(!expanded);
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View
      style={[
        styles.collapsibleCard,
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Pressable
        onPress={toggleExpanded}
        style={[styles.cardHeader, !expanded && styles.cardHeaderClosed]}
      >
        <View style={styles.cardTitleContainer}>
          {icon && (
            <View style={styles.cardIconContainer}>
              <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
          )}
          <Text style={[styles.cardTitle, titleStyle]}>{title}</Text>
          {showAiBadge && (
            <View style={styles.aiPill}>
              <Ionicons name="sparkles" size={10} color="#fff" />
              <Text style={styles.aiPillText}>AI</Text>
            </View>
          )}
        </View>

        {isExpandable && (
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={18} color={Colors.primary} />
          </Animated.View>
        )}
      </Pressable>

      {expanded && <View style={styles.cardContent}>{children}</View>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  collapsibleCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
  },
  cardHeaderClosed: {
    borderBottomWidth: 0,
  },
  cardContent: {
    padding: 14,
    paddingTop: 0,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIconContainer: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  aiPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 2,
  },
});

export default CollapsibleCard;

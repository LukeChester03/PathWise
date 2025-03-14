import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

// Update the interface to match the actual props being passed
interface DidYouKnowCardsProps {
  aiContent: AiGeneratedContent | null;
  fontSize: {
    body: number;
    title: number; // Changed from subtitle to title
    small: number;
    smaller?: number;
  };
  iconSize: {
    normal: number;
  };
}

const DidYouKnowCards: React.FC<DidYouKnowCardsProps> = ({ aiContent, fontSize, iconSize }) => {
  const [activeCard, setActiveCard] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  // Set up pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swiped right - go to previous
          handleSwipe("prev");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swiped left - go to next
          handleSwipe("next");
        } else {
          // Return to center
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (aiContent?.isGenerating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Finding interesting facts...</Text>
        </View>
      </View>
    );
  }

  if (!aiContent?.didYouKnow || aiContent.didYouKnow.length === 0) {
    return null;
  }

  const handleSwipe = (direction: "next" | "prev") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Calculate new active card index
    let newIndex;
    if (direction === "next") {
      newIndex = (activeCard + 1) % aiContent.didYouKnow.length;
    } else {
      newIndex = (activeCard - 1 + aiContent.didYouKnow.length) % aiContent.didYouKnow.length;
    }

    // Animate card off screen
    Animated.timing(position, {
      toValue: { x: direction === "next" ? -SCREEN_WIDTH : SCREEN_WIDTH, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveCard(newIndex);
      position.setValue({ x: direction === "next" ? SCREEN_WIDTH : -SCREEN_WIDTH, y: 0 });

      // Animate new card into view
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        friction: 5,
        useNativeDriver: true,
      }).start();
    });
  };

  // Calculate rotation and opacity based on position
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const cardOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.8, 1, 0.8],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Ionicons name="bulb" size={20} color={Colors.primary} style={styles.headerIcon} />
        <Text style={[styles.title, { fontSize: fontSize.title }]}>Did You Know?</Text>

        {aiContent.didYouKnow.length > 1 && (
          <View style={styles.dots}>
            {aiContent.didYouKnow.map((_, index) => (
              <View key={index} style={[styles.dot, index === activeCard && styles.activeDot]} />
            ))}
          </View>
        )}
      </View>

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateX: position.x }, { rotate }],
            opacity: cardOpacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.cardContent}>
          <Ionicons name="bulb" size={26} color={Colors.primary} style={styles.cardIcon} />
          <Text style={[styles.cardText, { fontSize: fontSize.body }]}>
            {aiContent.didYouKnow[activeCard]}
          </Text>
        </View>

        {aiContent.didYouKnow.length > 1 && (
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-back" size={16} color="#ccc" />
            <Text style={styles.swipeText}>Swipe for more</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  dots: {
    flexDirection: "row",
    marginLeft: "auto",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ddd",
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#777",
  },
  card: {
    padding: 20,
  },
  cardContent: {
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardText: {
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
  },
  swipeHint: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  swipeText: {
    fontSize: 12,
    color: "#999",
    marginHorizontal: 8,
  },
});

export default DidYouKnowCards;

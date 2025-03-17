import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colours";

// Import the quotes data
import travelQuotes from "../../constants/inspirationalQuotes.json";

interface InspirationQuote {
  text: string;
  author: string;
}

/**
 * JourneyInspiration component displays randomized travel and exploration quotes
 * with smooth transitions to inspire users on their journey of discovery.
 */
const JourneyInspiration: React.FC = () => {
  // State to track the current quote
  const [quote, setQuote] = useState<InspirationQuote>({ text: "", author: "" });

  // Refs for interval management and quote tracking
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const shownQuotesRef = useRef<number[]>([]);
  const availableQuotesRef = useRef<number[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  // Function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = (array: number[]): number[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Function to get the next random quote
  const getNextRandomQuote = (): number => {
    // If we've shown all quotes, reshuffle and start again
    if (availableQuotesRef.current.length === 0) {
      // Create an array of indices from 0 to quotes length-1
      const indices = Array.from({ length: travelQuotes.length }, (_, i) => i);
      // Shuffle the indices
      availableQuotesRef.current = shuffleArray(indices);
      // Clear the shown quotes
      shownQuotesRef.current = [];
    }

    // Get the next quote index from the available quotes
    const nextQuoteIndex = availableQuotesRef.current.pop() as number;
    // Add to shown quotes
    shownQuotesRef.current.push(nextQuoteIndex);

    return nextQuoteIndex;
  };

  // Function to animate quote transition
  const animateQuoteTransition = () => {
    // Get next random quote index
    const newIndex = getNextRandomQuote();

    // Create animation sequence
    Animated.sequence([
      // 1. Fade out and slide up current quote
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(translateYAnim, {
          toValue: -15,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      // 2. Reset position for next quote (not visible due to opacity 0)
      Animated.timing(translateYAnim, {
        toValue: 15,
        duration: 0,
        useNativeDriver: true,
      }),
      // 3. Fade in and slide down to normal position for new quote
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]).start();

    // Update the quote after the fade out animation
    setTimeout(() => {
      setQuote(travelQuotes[newIndex]);
    }, 500); // This should match the duration of the first fade-out animation
  };

  // Initialize component and set up quote cycling
  useEffect(() => {
    // Check if travelQuotes is valid and has items
    if (Array.isArray(travelQuotes) && travelQuotes.length > 0) {
      // Initialize with a random quote
      const firstQuoteIndex = getNextRandomQuote();
      setQuote(travelQuotes[firstQuoteIndex]);

      // Set up the interval to cycle through random quotes
      intervalRef.current = setInterval(() => {
        animateQuoteTransition();
      }, 10000);
    } else {
      // Fallback quote if the JSON import failed
      setQuote({
        text: "Travel opens your heart, broadens your mind, and fills your life with stories to tell.",
        author: "Anonymous",
      });
      console.warn("Travel quotes data not loaded properly. Check your import path.");
    }

    // Clean up interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.inspirationContainer}>
      <LinearGradient
        colors={["rgba(74, 144, 226, 0.1)", "rgba(151, 71, 255, 0.1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inspirationGradient}
      >
        <Ionicons name="bulb-outline" size={24} color={Colors.primary} style={styles.quoteIcon} />

        <Animated.View
          style={[
            styles.quoteContentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  inspirationContainer: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  inspirationGradient: {
    padding: 20,
    borderRadius: 16,
    position: "relative",
    minHeight: 160, // Add minimum height to avoid layout shifts during animation
  },
  quoteIcon: {
    position: "absolute",
    top: 16,
    left: 16,
    opacity: 0.3,
  },
  quoteContentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  quoteText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    fontStyle: "italic",
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  quoteAuthor: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
  },
});

export default JourneyInspiration;

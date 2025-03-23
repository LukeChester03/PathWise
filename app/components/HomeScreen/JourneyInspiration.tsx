// components/HomeScreen/JourneyInspiration.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colours";

// Import the quotes data
import travelQuotes from "../../constants/inspirationalQuotes.json";

const { width } = Dimensions.get("window");

// Default quote to use if none is available
const DEFAULT_QUOTE = {
  text: "Travel opens your heart, broadens your mind, and fills your life with stories to tell.",
  author: "Anonymous",
};

interface InspirationQuote {
  text: string;
  author: string;
}

/**
 * JourneyInspiration component displays randomized travel and exploration quotes
 * with smooth transitions to inspire users on their journey of discovery.
 */
const JourneyInspiration: React.FC = () => {
  // State to track the current quote - initialize with default
  const [quote, setQuote] = useState<InspirationQuote>(DEFAULT_QUOTE);
  // State to track if user has favorited this quote
  const [isFavorited, setIsFavorited] = useState(false);

  // Refs for interval management and quote tracking
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const shownQuotesRef = useRef<number[]>([]);
  const availableQuotesRef = useRef<number[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const containerAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  // Circle animations
  const circle1Anim = useRef(new Animated.Value(0)).current;
  const circle2Anim = useRef(new Animated.Value(0)).current;

  // Function to shuffle an array (Fisher-Yates algorithm)
  const shuffleArray = (array: number[]): number[] => {
    const newArray = [...array];
    // Fix: use length-1 and include 0 (i >= 0)
    for (let i = newArray.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Start entrance animations
  useEffect(() => {
    // Container fade in
    Animated.timing(containerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Animate background circles
    Animated.loop(
      Animated.sequence([
        Animated.timing(circle1Anim, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(circle1Anim, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(circle2Anim, {
          toValue: 1,
          duration: 18000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(circle2Anim, {
          toValue: 0,
          duration: 18000,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ])
    ).start();
  }, []);

  // Function to get the next random quote
  const getNextRandomQuote = (): number | null => {
    // Check if travelQuotes is available and valid
    if (!Array.isArray(travelQuotes) || travelQuotes.length === 0) {
      console.warn("Travel quotes data is not available or empty");
      return null;
    }

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
    const nextQuoteIndex = availableQuotesRef.current.pop();
    if (nextQuoteIndex === undefined) {
      // Should never happen if our logic is correct, but just in case
      return null;
    }

    // Add to shown quotes
    shownQuotesRef.current.push(nextQuoteIndex);

    return nextQuoteIndex;
  };

  // Function to animate quote transition
  const animateQuoteTransition = () => {
    // Reset favorite state for new quote
    setIsFavorited(false);

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
      if (newIndex !== null && travelQuotes[newIndex]) {
        setQuote(travelQuotes[newIndex]);
      } else {
        // Use default quote if we couldn't get a valid one
        setQuote(DEFAULT_QUOTE);
      }
    }, 500); // This should match the duration of the first fade-out animation
  };

  // Handle favoriting a quote
  const handleFavorite = () => {
    setIsFavorited(!isFavorited);

    // Heart animation
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.elastic(2)),
      }),
    ]).start();
  };

  // Initialize component and set up quote cycling
  useEffect(() => {
    try {
      // Check if travelQuotes is valid and has items
      if (Array.isArray(travelQuotes) && travelQuotes.length > 0) {
        // Initialize available quotes array
        availableQuotesRef.current = [];

        // Initialize with a random quote
        const firstQuoteIndex = getNextRandomQuote();
        if (firstQuoteIndex !== null && travelQuotes[firstQuoteIndex]) {
          setQuote(travelQuotes[firstQuoteIndex]);
        }

        // Set up the interval to cycle through random quotes
        intervalRef.current = setInterval(() => {
          animateQuoteTransition();
        }, 10000);
      } else {
        // Fallback quote if the JSON import failed
        setQuote(DEFAULT_QUOTE);
        console.warn("Travel quotes data not loaded properly. Check your import path.");
      }
    } catch (error) {
      console.error("Error initializing quotes:", error);
      setQuote(DEFAULT_QUOTE);
    }

    // Clean up interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.inspirationContainer,
        {
          opacity: containerAnim,
          transform: [
            {
              translateY: containerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(74, 144, 226, 0.12)", "rgba(151, 71, 255, 0.12)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.inspirationGradient}
      >
        {/* Animated background circles */}
        <Animated.View
          style={[
            styles.backgroundCircle1,
            {
              transform: [
                {
                  rotate: circle1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
                { scale: 1 },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.backgroundCircle2,
            {
              transform: [
                {
                  rotate: circle2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["360deg", "0deg"],
                  }),
                },
                { scale: 0.8 },
              ],
            },
          ]}
        />

        <View style={styles.quoteHeader}>
          <Ionicons name="bulb-outline" size={24} color={Colors.primary} />
          <Text style={styles.quoteHeaderText}>Daily Inspiration</Text>
        </View>

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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  inspirationContainer: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inspirationGradient: {
    padding: 20,
    borderRadius: 16,
    position: "relative",
    minHeight: 180, // Add minimum height to avoid layout shifts during animation
    overflow: "hidden",
  },
  backgroundCircle1: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(74, 144, 226, 0.05)",
    top: -width * 0.3,
    right: -width * 0.2,
  },
  backgroundCircle2: {
    position: "absolute",
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: "rgba(151, 71, 255, 0.05)",
    bottom: -width * 0.25,
    left: -width * 0.15,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  quoteHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  quoteContentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  quoteText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    fontStyle: "italic",
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  quoteActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  quoteActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
});

export default JourneyInspiration;

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
import travelQuotes from "../../constants/inspirationalQuotes.json";

const { width } = Dimensions.get("window");

const DEFAULT_QUOTE = {
  text: "Travel opens your heart, broadens your mind, and fills your life with stories to tell.",
  author: "Anonymous",
};

interface InspirationQuote {
  text: string;
  author: string;
}

const JourneyInspiration: React.FC = () => {
  const [quote, setQuote] = useState<InspirationQuote>(DEFAULT_QUOTE);
  const [isFavorited, setIsFavorited] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const shownQuotesRef = useRef<number[]>([]);
  const availableQuotesRef = useRef<number[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const containerAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const circle1Anim = useRef(new Animated.Value(0)).current;
  const circle2Anim = useRef(new Animated.Value(0)).current;
  const shuffleArray = (array: number[]): number[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  useEffect(() => {
    Animated.timing(containerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

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

  const getNextRandomQuote = (): number | null => {
    if (!Array.isArray(travelQuotes) || travelQuotes.length === 0) {
      console.warn("Travel quotes data is not available or empty");
      return null;
    }

    if (availableQuotesRef.current.length === 0) {
      const indices = Array.from({ length: travelQuotes.length }, (_, i) => i);
      availableQuotesRef.current = shuffleArray(indices);
      shownQuotesRef.current = [];
    }

    const nextQuoteIndex = availableQuotesRef.current.pop();
    if (nextQuoteIndex === undefined) {
      return null;
    }

    shownQuotesRef.current.push(nextQuoteIndex);

    return nextQuoteIndex;
  };

  const animateQuoteTransition = () => {
    setIsFavorited(false);

    const newIndex = getNextRandomQuote();

    Animated.sequence([
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
      Animated.timing(translateYAnim, {
        toValue: 15,
        duration: 0,
        useNativeDriver: true,
      }),
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

    setTimeout(() => {
      if (newIndex !== null && travelQuotes[newIndex]) {
        setQuote(travelQuotes[newIndex]);
      } else {
        setQuote(DEFAULT_QUOTE);
      }
    }, 500);
  };

  useEffect(() => {
    try {
      if (Array.isArray(travelQuotes) && travelQuotes.length > 0) {
        availableQuotesRef.current = [];
        const firstQuoteIndex = getNextRandomQuote();
        if (firstQuoteIndex !== null && travelQuotes[firstQuoteIndex]) {
          setQuote(travelQuotes[firstQuoteIndex]);
        }
        intervalRef.current = setInterval(() => {
          animateQuoteTransition();
        }, 10000);
      } else {
        //fallback
        setQuote(DEFAULT_QUOTE);
        console.warn("Travel quotes data not loaded properly. Check your import path.");
      }
    } catch (error) {
      console.error("Error initializing quotes:", error);
      setQuote(DEFAULT_QUOTE);
    }

    // Clean up on component unmount
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
    minHeight: 180,
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

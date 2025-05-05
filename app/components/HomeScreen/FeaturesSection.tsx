import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  Platform,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const SPACING = 12;

interface FeatureCard {
  id: number;
  title: string;
  description: string;
  icon: string;
  screen: string;
  gradientColors: [string, string];
}

interface FeaturesSectionProps {
  navigateToScreen: (screen: string) => void;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ navigateToScreen }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<FeatureCard>>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const renderCircles = (index: number, colors: [string, string]) => {
    if (index === 0) {
      return (
        <>
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 150,
                height: 150,
                top: -60,
                right: -30,
                opacity: 0.05,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "10deg"],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[1],
                width: 70,
                height: 70,
                bottom: -20,
                left: 30,
                opacity: 0.04,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 8],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 40,
                height: 40,
                top: 30,
                left: 40,
                opacity: 0.06,
                transform: [
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 5],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      );
    } else if (index === 1) {
      return (
        <>
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 100,
                height: 100,
                top: 20,
                right: -40,
                opacity: 0.04,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "-8deg"],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[1],
                width: 120,
                height: 120,
                bottom: -35,
                right: 50,
                opacity: 0.03,
                transform: [
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -6],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 60,
                height: 60,
                top: -20,
                left: 20,
                opacity: 0.05,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 6],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      );
    } else {
      return (
        <>
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 80,
                height: 80,
                top: -30,
                left: -20,
                opacity: 0.05,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 5],
                    }),
                  },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "5deg"],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[1],
                width: 130,
                height: 130,
                bottom: -30,
                right: -40,
                opacity: 0.04,
                transform: [
                  {
                    translateX: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.backgroundCircle,
              {
                backgroundColor: colors[0],
                width: 50,
                height: 50,
                top: 80,
                left: 60,
                opacity: 0.06,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -4],
                    }),
                  },
                ],
              },
            ]}
          />
        </>
      );
    }
  };

  return (
    <Animated.View
      style={[
        styles.featuresContainer,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    ></Animated.View>
  );
};

const styles = StyleSheet.create({
  featuresContainer: {
    width: "100%",
    marginTop: 10,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    marginLeft: SPACING,
  },
  carouselContainer: {
    paddingVertical: 8,
    paddingLeft: 0,
    paddingRight: width - CARD_WIDTH - SPACING,
    alignItems: "center",
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center",
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    minHeight: 220,
    width: "100%",
    position: "relative",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 100,
  },
  cardContent: {
    padding: 24,
    height: "100%",
    justifyContent: "space-between",
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  cardDescription: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
    paddingVertical: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tapPromptContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tapPromptLine: {
    height: 1,
  },
  tapPromptText: {
    fontSize: 12,
    marginHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "500",
    color: "white",
  },
  arrowContainer: {
    alignItems: "flex-end",
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

export default FeaturesSection;

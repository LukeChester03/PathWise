import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../constants/colours";
import { loadingStyles } from "../../constants/Map/loadingStyles";

const { width } = Dimensions.get("window");

interface MapLoadingProps {
  message?: string;
}

const MapLoading: React.FC<MapLoadingProps> = ({ message = "Discovering places around you" }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const mapScaleAnim = useRef(new Animated.Value(0.9)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-width)).current;

  // Words that will cycle through
  const words = ["places", "wonders", "attractions", "landmarks", "adventures"];
  const wordAnim = useRef(new Animated.Value(0)).current;
  const currentWordIndex = useRef(0);
  const [currentWord, setCurrentWord] = useState(words[0]);

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Pulsing animation for pin
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ])
    ).start();

    // Rotating compass
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    // Map scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(mapScaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(mapScaleAnim, {
          toValue: 0.95,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: width,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.linear),
      })
    ).start();

    // Dot animation sequence
    Animated.loop(
      Animated.sequence([
        // First dot
        Animated.timing(dotAnim1, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Second dot
        Animated.timing(dotAnim2, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Third dot
        Animated.timing(dotAnim3, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Reset
        Animated.parallel([
          Animated.timing(dotAnim1, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim2, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim3, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Word cycling animation
    const cycleWords = () => {
      Animated.timing(wordAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
        currentWordIndex.current = (currentWordIndex.current + 1) % words.length;
        setCurrentWord(words[currentWordIndex.current]);

        Animated.sequence([
          Animated.timing(wordAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.delay(2000),
          Animated.timing(wordAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic),
          }),
        ]).start(() => cycleWords());
      });
    };

    // Start word cycling with a delay
    const timer = setTimeout(() => {
      wordAnim.setValue(1); // Start with fully visible
      cycleWords();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Interpolate rotation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={loadingStyles.container}>
      {/* Background map graphic */}
      <Animated.View
        style={[
          loadingStyles.mapBackgroundContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: mapScaleAnim }],
          },
        ]}
      >
        <View style={loadingStyles.mapGraphic}>
          <Animated.View
            style={[loadingStyles.mapShimmer, { transform: [{ translateX: shimmerAnim }] }]}
          />
        </View>
      </Animated.View>

      {/* Compass Rose */}
      <Animated.View
        style={[
          loadingStyles.compassContainer,
          {
            transform: [{ rotate }],
            opacity: 0.7,
          },
        ]}
      >
        <Ionicons name="compass-outline" size={150} color={Colors.primary} />
      </Animated.View>

      {/* Main content */}
      <Animated.View style={[loadingStyles.contentContainer, { opacity: fadeAnim }]}>
        {/* Map Pin */}
        <Animated.View
          style={[
            loadingStyles.pinContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={loadingStyles.pinShadow} />
          <View style={loadingStyles.pin}>
            <Ionicons name="location" size={70} color={Colors.primary} />
          </View>
          <View style={loadingStyles.pulseCircle} />
        </Animated.View>

        {/* Loading Message */}
        <View style={loadingStyles.messageContainer}>
          <Animated.Text
            style={[
              loadingStyles.messageText,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {message}
          </Animated.Text>

          <View style={loadingStyles.wordContainer}>
            <Text style={loadingStyles.findingText}>Finding amazing </Text>
            <Animated.Text
              style={[
                loadingStyles.highlightWord,
                {
                  opacity: wordAnim,
                  transform: [
                    {
                      translateY: wordAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {currentWord}
            </Animated.Text>
          </View>
        </View>

        {/* Animated dots */}
        <View style={loadingStyles.dotsContainer}>
          <Animated.View
            style={[
              loadingStyles.dot,
              {
                opacity: dotAnim1,
                transform: [
                  {
                    scale: dotAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              loadingStyles.dot,
              {
                opacity: dotAnim2,
                transform: [
                  {
                    scale: dotAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              loadingStyles.dot,
              {
                opacity: dotAnim3,
                transform: [
                  {
                    scale: dotAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

export default MapLoading;

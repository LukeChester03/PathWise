// hooks/usePlaceAnimations.ts
import { useState, useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

// Animation timing constants
const FADE_IN_DURATION = 400;
const HERO_ANIMATION_DURATION = 600;

export const usePlaceAnimations = (
  placeDetails: Place | VisitedPlaceDetails | null,
  loading: boolean
) => {
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // Animation state
  const [animationsReady, setAnimationsReady] = useState(false);

  // Effect for animations
  useEffect(() => {
    if (placeDetails && !loading) {
      // Delay to ensure everything is loaded
      setTimeout(() => {
        setAnimationsReady(true);

        // Run entry animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: FADE_IN_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: FADE_IN_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: FADE_IN_DURATION,
            delay: HERO_ANIMATION_DURATION / 2,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.sequence([
            Animated.timing(imageScale, {
              toValue: 1.03,
              duration: HERO_ANIMATION_DURATION,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(imageScale, {
              toValue: 1,
              duration: HERO_ANIMATION_DURATION * 0.5,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.cubic),
            }),
          ]),
        ]).start();
      }, 200);
    }
  }, [placeDetails, loading]);

  // Convert scrollY to header animations
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });

  return {
    scrollY,
    fadeAnim,
    translateY,
    imageScale,
    headerOpacity,
    titleOpacity,
    animationsReady,
  };
};

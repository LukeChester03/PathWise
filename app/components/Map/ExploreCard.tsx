import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { TravelMode } from "../../types/MapTypes";

interface ExploreCardProps {
  placeName: string;
  placeDescription?: string;
  placeImage?: string;
  travelTime: string;
  onStartJourney: () => void;
  onCancel: () => void;
  visible?: boolean;
  travelMode?: TravelMode;
  rating?: number | string;
}

const { width, height } = Dimensions.get("window");
const HEADER_HEIGHT = Platform.OS === "ios" ? 44 : 56;
const NAVBAR_HEIGHT = 60;

const ExploreCard: React.FC<ExploreCardProps> = ({
  placeName,
  placeDescription,
  placeImage,
  travelTime,
  onStartJourney,
  onCancel,
  visible = false,
  travelMode = "walking", // Default to walking if not provided
  rating = 0,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const primaryButtonScale = useRef(new Animated.Value(1)).current;
  const secondaryButtonScale = useRef(new Animated.Value(1)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const descriptionAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  // Animate in when component becomes visible
  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      contentAnim.setValue(0);
      descriptionAnim.setValue(0);
      rotateAnim.setValue(0);
      imageOpacity.setValue(0);
      primaryButtonScale.setValue(1);
      secondaryButtonScale.setValue(1);

      // Animation sequence - all completed in under a second
      Animated.sequence([
        // Fade in backdrop - 150ms
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),

        // Animate card in with a slight bounce - 200ms
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 10,
          tension: 100,
          useNativeDriver: true,
        }),

        // Animate image fade in - 150ms
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),

        // Animate content with staggered timing - 450ms total (150ms each with 50ms stagger)
        Animated.stagger(50, [
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.timing(descriptionAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ]).start();

      // Start badge pulse animation - independent of main sequence
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.1,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    }
  }, [visible]);

  // Handle primary button press animations
  const handlePrimaryPressIn = () => {
    Animated.spring(primaryButtonScale, {
      toValue: 0.95,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePrimaryPressOut = () => {
    Animated.spring(primaryButtonScale, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  // Handle secondary button press animations
  const handleSecondaryPressIn = () => {
    Animated.spring(secondaryButtonScale, {
      toValue: 0.95,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleSecondaryPressOut = () => {
    Animated.spring(secondaryButtonScale, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  // Handle start journey
  const handleStartJourney = () => {
    animateOut(() => onStartJourney());
  };

  // Handle dismiss
  const handleDismiss = () => {
    animateOut(() => onCancel());
  };

  // Animate out and call callback when complete
  const animateOut = (callback: () => void) => {
    Animated.sequence([
      // First shrink description - 100ms
      Animated.timing(descriptionAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),

      // Then fade out content - 100ms
      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),

      // Finally fade and scale out the card - 150ms
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]),
    ]).start(callback);
  };

  // Travel mode icon and label
  const getTravelModeIcon = () => {
    return travelMode === "driving" ? "car-outline" : "walk-outline";
  };

  const getTravelModeLabel = () => {
    return travelMode === "driving" ? "Driving" : "Walking";
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleDismiss} activeOpacity={0.7}>
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>

      {/* Header Image */}
      <View style={styles.imageContainer}>
        <Animated.Image
          source={placeImage ? { uri: placeImage } : require("../../assets/discover.png")}
          style={[
            styles.headerImage,
            {
              opacity: imageOpacity,
              transform: [
                {
                  scale: imageOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.05, 1],
                  }),
                },
              ],
            },
          ]}
          defaultSource={require("../../assets/discover.png")}
        />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.imageGradient} />

        {/* Badge on image */}
        <View style={styles.imageOverlayContent}>
          <Animated.View
            style={[
              styles.badgeContainer,
              {
                transform: [
                  { scale: badgePulse },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["-5deg", "0deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="compass" size={14} color="white" />
            <Text style={styles.badgeText}>New Discovery</Text>
          </Animated.View>
        </View>

        {/* Title on image */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.titleText}>{placeName}</Text>
          {typeof rating !== "string" && rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Place Description */}
        {placeDescription && (
          <Animated.View
            style={[
              styles.descriptionContainer,
              {
                opacity: descriptionAnim,
                transform: [
                  {
                    translateY: descriptionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.descriptionTitle}>Description</Text>
            <View style={styles.descriptionRow}>
              <Ionicons
                name="information-circle"
                size={16}
                color={Colors.primary}
                style={styles.descriptionIcon}
              />
              <Text style={styles.descriptionText}>{placeDescription}</Text>
            </View>
          </Animated.View>
        )}

        {/* Travel Info Card */}
        <Animated.View
          style={[
            styles.travelInfoCard,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="time-outline" size={22} color={Colors.primary} />
          <View style={styles.travelInfoTextContainer}>
            <Text style={styles.travelInfoLabel}>Travel time</Text>
            <View style={styles.travelValueContainer}>
              <Text style={styles.travelInfoValue}>{travelTime}</Text>
              <View style={styles.travelModeContainer}>
                <Ionicons name={getTravelModeIcon()} size={16} color={NeutralColors.white} />
                <Text style={styles.travelModeText}>{getTravelModeLabel()}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          {/* Start Journey Button */}
          <Animated.View
            style={{
              transform: [
                { scale: primaryButtonScale },
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              opacity: contentAnim,
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStartJourney}
              onPressIn={handlePrimaryPressIn}
              onPressOut={handlePrimaryPressOut}
              activeOpacity={0.9}
            >
              <Ionicons name="navigate" size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Start Journey</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Maybe Later Button */}
          <Animated.View
            style={{
              transform: [
                { scale: secondaryButtonScale },
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
              opacity: contentAnim,
            }}
          >
            {/* <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDismiss}
              onPressIn={handleSecondaryPressIn}
              onPressOut={handleSecondaryPressOut}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </TouchableOpacity> */}
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height - (HEADER_HEIGHT + NAVBAR_HEIGHT + StatusBar.currentHeight) - 160,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "80%",
  },
  imageOverlayContent: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  titleContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    flex: 1,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  ratingText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  contentContainer: {
    padding: 20,
  },
  descriptionContainer: {
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NeutralColors.gray800,
    marginBottom: 12,
  },
  descriptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  descriptionIcon: {
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 15,
    color: NeutralColors.gray700,
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  travelInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  travelInfoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  travelInfoLabel: {
    fontSize: 14,
    color: NeutralColors.gray500,
  },
  travelValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  travelInfoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: NeutralColors.black,
  },
  travelModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  travelModeText: {
    fontSize: 12,
    color: NeutralColors.white,
    fontWeight: "600",
    marginLeft: 4,
  },
  buttonGroup: {
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: NeutralColors.gray500,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default ExploreCard;

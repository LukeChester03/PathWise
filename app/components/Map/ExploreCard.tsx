import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
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
  travelMode?: TravelMode; // Made optional with default in component
}

const { width, height } = Dimensions.get("window");

const ExploreCard: React.FC<ExploreCardProps> = ({
  placeName,
  placeDescription,
  placeImage,
  travelTime,
  onStartJourney,
  onCancel,
  visible = false,
  travelMode = "walking", // Default to walking if not provided
}) => {
  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.8)).current;
  const imageAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Button press animations
  const startBtnScale = useRef(new Animated.Value(1)).current;
  const dismissBtnScale = useRef(new Animated.Value(1)).current;

  // Badge pulse animation
  const badgePulse = useRef(new Animated.Value(1)).current;

  // Compass icon rotation
  const compassRotate = useRef(new Animated.Value(0)).current;

  // Start animations when card becomes visible
  useEffect(() => {
    if (visible) {
      // Reset animation values
      backdropAnim.setValue(0);
      cardScaleAnim.setValue(0.8);
      imageAnim.setValue(0);
      titleAnim.setValue(0);
      contentAnim.setValue(0);
      badgeAnim.setValue(0);
      buttonAnim.setValue(0);

      // Sequence of animations
      Animated.sequence([
        // First fade in the backdrop
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),

        // Then scale up the card with a spring effect
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),

        // Then animate in the image
        Animated.timing(imageAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),

        // Then animate the title
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),

        // Then animate the content elements in parallel
        Animated.parallel([
          // Badge animation
          Animated.timing(badgeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.7)),
          }),

          // Content fade in and slide up
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),

          // Button animation with delay
          Animated.timing(buttonAnim, {
            toValue: 1,
            duration: 200,
            delay: 100,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]),
      ]).start();
    }
  }, [visible]);

  // Calculate compass rotation
  const spin = compassRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Button press animations
  const handleStartPressIn = () => {
    Animated.spring(startBtnScale, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleStartPressOut = () => {
    Animated.spring(startBtnScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleDismissPressIn = () => {
    Animated.spring(dismissBtnScale, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleDismissPressOut = () => {
    Animated.spring(dismissBtnScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Handle start journey with exit animation
  const handleStartJourney = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(cardScaleAnim, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start(() => {
      onStartJourney();
    });
  };

  // Handle cancel with exit animation
  const handleCancel = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(cardScaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => {
      onCancel();
    });
  };

  // Travel mode icon and label
  const getTravelModeIcon = () => {
    return travelMode === "driving" ? "car-outline" : "walk-outline";
  };

  const getTravelModeLabel = () => {
    return travelMode === "driving" ? "Driving" : "Walking";
  };

  // Don't render anything if not visible and animation has completed
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: backdropAnim,
          backgroundColor: backdropAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"],
          }),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: cardScaleAnim }],
          },
        ]}
      >
        {/* Header Image with Gradient Overlay */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: imageAnim,
            },
          ]}
        >
          <Image source={{ uri: placeImage }} style={styles.headerImage} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.imageGradient}
          />
          <Animated.View
            style={[
              styles.imageTitleContainer,
              {
                opacity: titleAnim,
                transform: [
                  {
                    translateY: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.imageTitle}>{placeName}</Text>
          </Animated.View>
        </Animated.View>

        {/* Content Container */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Discovery Badge */}
            <Animated.View
              style={[
                styles.badgeContainer,
                {
                  opacity: badgeAnim,
                  transform: [
                    { scale: badgePulse },
                    {
                      translateX: badgeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="compass" size={16} color="white" />
              </Animated.View>
              <Text style={styles.badgeText}>New Discovery</Text>
            </Animated.View>

            {/* Place Description */}
            {placeDescription && (
              <Animated.Text
                style={[
                  styles.description,
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
                {placeDescription}
              </Animated.Text>
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
            <Animated.View
              style={{
                opacity: buttonAnim,
                transform: [
                  {
                    translateY: buttonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <Animated.View style={{ transform: [{ scale: startBtnScale }] }}>
                <TouchableOpacity
                  style={styles.discoverButton}
                  onPress={handleStartJourney}
                  onPressIn={handleStartPressIn}
                  onPressOut={handleStartPressOut}
                  activeOpacity={1}
                >
                  <Ionicons name="navigate" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.discoverButtonText}>Start Journey</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ transform: [{ scale: dismissBtnScale }] }}>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={handleCancel}
                  onPressIn={handleDismissPressIn}
                  onPressOut={handleDismissPressOut}
                  activeOpacity={1}
                >
                  <Text style={styles.dismissButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  cardContainer: {
    width: width * 0.85,
    maxWidth: 380,
    maxHeight: height * 0.75,
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
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
    height: "70%",
  },
  imageTitleContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  imageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  scrollContainer: {
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    marginBottom: 20,
  },
  badgeText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: NeutralColors.gray600,
    marginBottom: 24,
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
  discoverButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  discoverButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  dismissButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissButtonText: {
    fontSize: 16,
    color: NeutralColors.gray500,
    fontWeight: "500",
  },
});

export default ExploreCard;

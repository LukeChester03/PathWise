import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const DestinationCard = ({
  placeName,
  placeImage,
  discoveryDate,
  onLearnMorePress,
  onDismiss,
  visible = false,
}) => {
  // Animation values
  const modalAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.8)).current;
  const imageAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  // Animation for celebration emoji bounce
  const celebrationBounce = useRef(new Animated.Value(0)).current;

  // Format date nicely
  const formattedDate = discoveryDate
    ? new Date(discoveryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Start animations when card becomes visible
  useEffect(() => {
    if (visible) {
      // Reset animation values
      modalAnim.setValue(0);
      cardScaleAnim.setValue(0.8);
      imageAnim.setValue(0);
      contentAnim.setValue(0);
      badgeAnim.setValue(0);
      celebrationAnim.setValue(0);
      buttonsAnim.setValue(0);

      // Start animations in sequence
      Animated.sequence([
        // First fade in modal backdrop
        Animated.timing(modalAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),

        // Then scale up the card with elastic effect
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),

        // Then fade in and slide down image
        Animated.timing(imageAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),

        // Parallel animations for badge and content
        Animated.parallel([
          // Badge animation (rotate in)
          Animated.timing(badgeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(2)),
          }),

          // Celebration icon animation
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.7)),
          }),

          // Content animation (fade and slide up)
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),

          // Buttons animation (slide up and fade)
          Animated.timing(buttonsAnim, {
            toValue: 1,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]),
      ]).start();
    }
  }, [visible]);

  // Button press animation hooks
  const learnBtnScale = useRef(new Animated.Value(1)).current;
  const dismissBtnScale = useRef(new Animated.Value(1)).current;

  const handleLearnPressIn = () => {
    Animated.spring(learnBtnScale, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleLearnPressOut = () => {
    Animated.spring(learnBtnScale, {
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

  // Handle learn more button press with exit animation
  const handleLearnMore = () => {
    // First animate out
    Animated.parallel([
      Animated.timing(cardScaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => {
      // Then call the actual handler
      onLearnMorePress();
    });
  };

  // Handle dismiss with exit animation
  const handleDismiss = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(cardScaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => {
      // Then call the actual dismiss handler
      onDismiss();
    });
  };

  if (!visible) {
    // Don't render anything if not visible and animation is at 0
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.modalContainer,
        {
          opacity: modalAnim,
          backgroundColor: modalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"],
          }),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: cardScaleAnim }],
          },
        ]}
      >
        {/* Hero Image with Gradient */}
        <Animated.View
          style={[
            styles.imageWrapper,
            {
              opacity: imageAnim,
              transform: [
                {
                  translateY: imageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={placeImage ? { uri: placeImage } : require("../../assets/destination.jpg")}
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
            style={styles.imageGradient}
          />

          {/* Achievement Badge */}
          <Animated.View
            style={[
              styles.badgeContainer,
              {
                opacity: badgeAnim,
                transform: [
                  {
                    scale: badgeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                  {
                    translateY: badgeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.badge}>
              <Animated.View>
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Content container */}
        <View style={styles.content}>
          {/* Celebration Icon */}
          <Animated.View
            style={[
              styles.celebrationIconContainer,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    scale: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                  {
                    translateY: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.celebrationIcon}>
              <Animated.Text
                style={[
                  styles.celebrationEmoji,
                  {
                    transform: [
                      {
                        scale: celebrationBounce.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.15],
                        }),
                      },
                    ],
                  },
                ]}
              >
                🎉
              </Animated.Text>
            </View>
          </Animated.View>

          {/* Achievement Title */}
          <Animated.View
            style={[
              styles.headerContainer,
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
            <Text style={styles.title}>You have discovered</Text>
            <Text style={styles.placeName}>{placeName}</Text>
          </Animated.View>

          {/* Achievement Stats */}
          <Animated.View
            style={[
              styles.statsContainer,
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
            <View style={styles.dateCard}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
                style={styles.dateIcon}
              />
              <View>
                <Text style={styles.dateLabel}>Date discovered</Text>
                <Text style={styles.date}>{formattedDate}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Buttons Container */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                opacity: buttonsAnim,
                transform: [
                  {
                    translateY: buttonsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: learnBtnScale }] }}>
              <TouchableOpacity
                style={styles.learnButton}
                onPress={handleLearnMore}
                onPressIn={handleLearnPressIn}
                onPressOut={handleLearnPressOut}
                activeOpacity={1}
              >
                <Animated.View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.learnButtonText}>Learn about this place</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: dismissBtnScale }] }}>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                onPressIn={handleDismissPressIn}
                onPressOut={handleDismissPressOut}
                activeOpacity={1}
              >
                <Text style={styles.dismissButtonText}>Continue Exploring</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    zIndex: 1000,
  },
  container: {
    width: width * 0.85,
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  imageWrapper: {
    position: "relative",
    height: 180,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badgeContainer: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    padding: 24,
    paddingTop: 42, // Extra space for the overlapping celebration icon
  },
  celebrationIconContainer: {
    position: "absolute",
    top: -30, // Overlaps with the image
    left: 24,
  },
  celebrationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  celebrationEmoji: {
    fontSize: 30,
  },
  headerContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  placeName: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.primary,
  },
  statsContainer: {
    marginBottom: 28,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 16,
    borderRadius: 16,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: NeutralColors.gray500,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontWeight: "600",
    color: NeutralColors.gray800,
  },
  buttonsContainer: {
    gap: 12,
  },
  learnButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  learnButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  dismissButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NeutralColors.gray300,
    alignItems: "center",
  },
  dismissButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: NeutralColors.gray700,
  },
});

export default DestinationCard;

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
  SafeAreaView,
  Platform,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

interface DiscoveredCardProps {
  placeName: string;
  placeDescription?: string;
  placeImage?: string;
  discoveryDate?: string;
  rating?: number | string;
  description?: string;
  onViewDetails?: () => void;
  onDismiss: () => void;
  onVisitAgain?: () => void;
  visible?: boolean;
  initialSavedState?: boolean;
}

const { width, height } = Dimensions.get("window");
const HEADER_HEIGHT = Platform.OS === "ios" ? 44 : 56;
const NAVBAR_HEIGHT = 60;

const DiscoveredCard: React.FC<DiscoveredCardProps> = ({
  placeName,
  placeDescription,
  placeImage,
  discoveryDate,
  rating = 0,
  description,
  onViewDetails,
  onDismiss,
  onVisitAgain,
  visible = false,
  initialSavedState = false,
}) => {
  const [isSaved, setIsSaved] = useState(initialSavedState);

  const formattedDate = discoveryDate
    ? new Date(discoveryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  const getFormattedRating = (rating: number | string | undefined): string => {
    if (rating === undefined) return "0.0";

    if (typeof rating === "string") {
      const numRating = parseFloat(rating);
      return isNaN(numRating) ? "0.0" : numRating.toFixed(1);
    }

    return rating.toFixed(1);
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const primaryButtonScale = useRef(new Animated.Value(1)).current;
  const secondaryButtonScale = useRef(new Animated.Value(1)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;
  const descriptionAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const saveButtonAnim = useRef(new Animated.Value(0)).current;
  const saveScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      contentAnim.setValue(0);
      descriptionAnim.setValue(0);
      rotateAnim.setValue(0);
      imageOpacity.setValue(0);
      saveButtonAnim.setValue(0);
      primaryButtonScale.setValue(1);
      secondaryButtonScale.setValue(1);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 10,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(saveButtonAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
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

  const handleSavePress = () => {
    Animated.sequence([
      Animated.spring(saveScaleAnim, {
        toValue: 0.8,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(saveScaleAnim, {
        toValue: 1.2,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(saveScaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    setIsSaved(!isSaved);
  };

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

  const handleViewDetails = () => {
    if (onViewDetails) {
      animateOut(() => onViewDetails());
    }
  };

  const handleVisitAgain = () => {
    if (onVisitAgain) {
      animateOut(() => onVisitAgain());
    }
  };

  const handleDismiss = () => {
    animateOut(() => onDismiss());
  };

  const animateOut = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(descriptionAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(contentAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
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

  if (!visible) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
            backgroundColor: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={handleDismiss} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Animated.View
            style={[
              styles.saveButtonContainer,
              {
                opacity: saveButtonAnim,
                transform: [{ scale: saveScaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSavePress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isSaved ? Colors.primary : "white"}
              />
            </TouchableOpacity>
            {isSaved && (
              <Animated.View style={styles.savedIndicator}>
                <View style={styles.savedIndicatorDot} />
              </Animated.View>
            )}
          </Animated.View>
          <View style={styles.imageContainer}>
            <Animated.Image
              source={{ uri: placeImage }}
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
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.imageGradient}
            />
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
                <Ionicons name="trophy" size={14} color="white" />
                <Text style={styles.badgeText}>Discovered</Text>
              </Animated.View>
            </View>
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
              <View style={styles.bottomImageContent}>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateLabel}>Discovered on</Text>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                  </View>
                </View>
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={18} color="#FFD700" />
                  <Text style={styles.ratingText}>{getFormattedRating(rating)}</Text>
                </View>
              </View>
            </Animated.View>
          </View>
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
            {description && (
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
                    name="checkmark-circle"
                    size={16}
                    color={Colors.primary}
                    style={styles.descriptionIcon}
                  />
                  <Text style={styles.descriptionText}>{description}</Text>
                </View>
              </Animated.View>
            )}

            {onViewDetails && (
              <View style={styles.buttonGroup}>
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
                    onPress={handleViewDetails}
                    onPressIn={handlePrimaryPressIn}
                    onPressOut={handlePrimaryPressOut}
                    activeOpacity={0.9}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="white"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.primaryButtonText}>Learn More</Text>
                  </TouchableOpacity>
                </Animated.View>

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
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleVisitAgain}
                    onPressIn={handleSecondaryPressIn}
                    onPressOut={handleSecondaryPressOut}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="compass-outline"
                      size={18}
                      color={Colors.primary}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.secondaryButtonText}>Visit Again</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cardContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height - (HEADER_HEIGHT + NAVBAR_HEIGHT + (StatusBar.currentHeight || 0)) - 32,
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
  saveButtonContainer: {
    position: "absolute",
    top: 12,
    right: 56,
    zIndex: 10,
  },
  saveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  savedIndicator: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
  },
  savedIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  imageContainer: {
    width: "100%",
    height: 220,
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
    backgroundColor: Colors.secondary,
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
  },
  titleText: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomImageContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dateTextContainer: {
    marginLeft: 6,
    flexDirection: "column",
  },
  dateLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
  },
  dateText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
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
    borderWidth: 1,
    borderColor: Colors.primary,
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
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default DiscoveredCard;

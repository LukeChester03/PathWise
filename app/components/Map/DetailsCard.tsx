import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import { TravelMode } from "../../types/MapTypes";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DetailsCardProps {
  placeName: string;
  travelTime: string;
  distance: string;
  onSwipeOff: () => void;
  travelMode: TravelMode;
  onInfoPress?: () => void;

  currentStep: any | null;
  nextStepDistance: string | null;
  navigationSteps: any[];
  stepIndex: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  getManeuverIcon: (maneuver: string) => React.ReactNode;
  autoShowUpcomingStep?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const getResponsiveWidth = () => {
  if (SCREEN_WIDTH < 350) return "88%";
  else if (SCREEN_WIDTH < 450) return "82%";
  else return "75%";
};

const MIN_CARD_WIDTH = 310;
const MAX_CARD_WIDTH = 520;
const AUTO_HIDE_DURATION = 10000;

const DetailsCard: React.FC<DetailsCardProps> = ({
  placeName,
  travelTime,
  distance,
  onSwipeOff,
  travelMode,
  onInfoPress = () => {},
  currentStep,
  nextStepDistance,
  navigationSteps,
  stepIndex,
  soundEnabled,
  setSoundEnabled,
  getManeuverIcon,
  autoShowUpcomingStep = true,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [isTitleEllipsized, setIsTitleEllipsized] = useState(false);
  const [autoShowTimer, setAutoShowTimer] = useState<NodeJS.Timeout | null>(null);
  const [isAutoShown, setIsAutoShown] = useState(false);
  const [lastStepIndex, setLastStepIndex] = useState(-1);

  const pan = useRef(new Animated.ValueXY()).current;
  const shadowAnim = useRef(new Animated.Value(0.15)).current;
  const cardHeightAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (autoShowTimer) {
      clearTimeout(autoShowTimer);
      setAutoShowTimer(null);
    }

    if (stepIndex !== lastStepIndex && stepIndex > 0 && autoShowUpcomingStep) {
      if (!isAutoShown) {
        setExpanded(true);
        setIsAutoShown(true);
        const timer = setTimeout(() => {
          setExpanded(false);
          setIsAutoShown(false);
        }, AUTO_HIDE_DURATION);

        setAutoShowTimer(timer);
      }
    }
    setLastStepIndex(stepIndex);
  }, [stepIndex, autoShowUpcomingStep]);

  useEffect(() => {
    return () => {
      if (autoShowTimer) {
        clearTimeout(autoShowTimer);
      }
    };
  }, [autoShowTimer]);

  const lastModeRef = useRef<TravelMode>(travelMode);
  useEffect(() => {
    if (lastModeRef.current !== travelMode) {
      lastModeRef.current = travelMode;
    }
  }, [travelMode]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", () => {
      setCardWidth(0);
      setTitleExpanded(false);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(cardHeightAnim, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded, cardHeightAnim]);

  const toggleTitle = () => {
    if (isTitleEllipsized) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTitleExpanded(!titleExpanded);
    }
  };

  const onTextLayout = (e: { nativeEvent: { lines: string | any[] } }) => {
    const linesCount = e.nativeEvent.lines.length;
    setIsTitleEllipsized(linesCount > 1);
  };

  const handleExpandPress = () => {
    if (autoShowTimer) {
      clearTimeout(autoShowTimer);
      setAutoShowTimer(null);
    }

    setExpanded(!expanded);
    setIsAutoShown(false);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (autoShowTimer) {
          clearTimeout(autoShowTimer);
          setAutoShowTimer(null);
          setIsAutoShown(false);
        }

        Animated.timing(shadowAnim, {
          toValue: 0.35,
          duration: 100,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        Animated.timing(shadowAnim, {
          toValue: 0.15,
          duration: 100,
          useNativeDriver: false,
        }).start();

        if (gestureState.dx < -100) {
          Animated.timing(pan, {
            toValue: { x: -500, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onSwipeOff();
            pan.setValue({ x: 0, y: 0 });
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const getTravelModeAsset = () => {
    if (travelMode === "driving") {
      try {
        return require("../../assets/driving.gif");
      } catch (e) {
        console.warn("driving.gif not found, using walking.gif as fallback");
        return require("../../assets/walking.gif");
      }
    } else {
      return require("../../assets/walking.gif");
    }
  };

  const upcomingStepOpacity = cardHeightAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });

  const handleCardLayout = (event: { nativeEvent: { layout: { width: any } } }) => {
    const { width } = event.nativeEvent.layout;
    if (width !== cardWidth) {
      setCardWidth(width);
    }
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ translateX: pan.x }],
          shadowOpacity: shadowAnim,
          width: getResponsiveWidth(),
          maxWidth: MAX_CARD_WIDTH,
          minWidth: MIN_CARD_WIDTH,
        },
      ]}
      onLayout={handleCardLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.cardInner}>
        <View style={styles.compactHeader}>
          <Animated.View
            style={{
              transform: travelMode === "driving" ? [{ scale: pulseAnim }] : undefined,
            }}
          >
            <Image
              source={getTravelModeAsset()}
              style={[styles.gif, cardWidth < 320 ? styles.smallGif : {}]}
              key={`travel-${travelMode}`}
            />
          </Animated.View>

          <View style={styles.mainInfo}>
            <TouchableOpacity
              activeOpacity={isTitleEllipsized ? 0.7 : 1}
              onPress={toggleTitle}
              style={styles.titleContainer}
            >
              <Text
                numberOfLines={titleExpanded ? undefined : 1}
                onTextLayout={onTextLayout}
                style={[
                  styles.title,
                  cardWidth < 320 ? styles.smallTitle : {},
                  titleExpanded && styles.expandedTitle,
                ]}
              >
                {placeName}
              </Text>
              {isTitleEllipsized && (
                <MaterialIcon
                  name={titleExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={14}
                  color={Colors.primary}
                  style={styles.titleExpandIcon}
                />
              )}
            </TouchableOpacity>
            <View style={styles.metrics}>
              <View style={styles.metricItem}>
                <MaterialIcon
                  name="directions"
                  size={12}
                  color={NeutralColors.gray500}
                  style={styles.metricIcon}
                />
                <Text style={[styles.metric, cardWidth < 320 ? styles.smallMetric : {}]}>
                  {distance}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <MaterialIcon
                  name="access-time"
                  size={12}
                  color={NeutralColors.gray500}
                  style={styles.metricIcon}
                />
                <Text style={[styles.metric, cardWidth < 320 ? styles.smallMetric : {}]}>
                  {travelTime}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.soundToggle}
                onPress={() => setSoundEnabled(!soundEnabled)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View
                  style={[styles.soundIconContainer, soundEnabled ? styles.soundIconEnabled : null]}
                >
                  <MaterialIcon
                    name={soundEnabled ? "volume-up" : "volume-off"}
                    size={cardWidth < 320 ? 14 : 16}
                    color={soundEnabled ? "white" : Colors.primary}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.expandButton}
            onPress={handleExpandPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 5 }}
          >
            <View style={styles.expandIconContainer}>
              <MaterialIcon
                name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={cardWidth < 320 ? 18 : 20}
                color={Colors.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {currentStep && (
          <Animated.View
            style={[
              styles.navigationSection,
              {
                opacity: cardHeightAnim,
                maxHeight: cardHeightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 200],
                }),
                overflow: "hidden",
              },
            ]}
          >
            <View style={styles.currentStep}>
              <View
                style={[styles.iconContainer, cardWidth < 320 ? styles.smallIconContainer : {}]}
              >
                {getManeuverIcon(currentStep.maneuver)}
              </View>

              <View style={styles.directionContainer}>
                <Text style={[styles.distance, cardWidth < 320 ? styles.smallDistance : {}]}>
                  {nextStepDistance || currentStep.distance.text}
                </Text>
                <Text
                  numberOfLines={3}
                  style={[styles.instruction, cardWidth < 320 ? styles.smallInstruction : {}]}
                >
                  {currentStep.instructions}
                </Text>
              </View>
            </View>

            {/* {stepIndex < navigationSteps.length - 1 && (
              <Animated.View style={[styles.upcomingStep, { opacity: upcomingStepOpacity }]}>
                <View
                  style={[
                    styles.upcomingIconContainer,
                    cardWidth < 320 ? styles.smallUpcomingIconContainer : {},
                  ]}
                >
                  {getManeuverIcon(navigationSteps[stepIndex + 1].maneuver)}
                </View>
                <Text
                  numberOfLines={2}
                  style={[styles.upcomingText, cardWidth < 320 ? styles.smallUpcomingText : {}]}
                >
                  Then {navigationSteps[stepIndex + 1].instructions}
                </Text>
              </Animated.View>
            )} */}
          </Animated.View>
        )}

        <View style={styles.swipeHintContainer}>
          <View style={styles.swipeHintDot} />
          <View style={styles.swipeHintDot} />
          <View style={styles.swipeHintDot} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  cardInner: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 14,
  },
  gif: {
    width: 42,
    height: 42,
    marginRight: 14,
    borderRadius: 8,
  },
  smallGif: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  mainInfo: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    flex: 1,
    letterSpacing: -0.2,
  },
  expandedTitle: {
    marginBottom: 6,
  },
  titleExpandIcon: {
    marginLeft: 4,
  },
  smallTitle: {
    fontSize: 14,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  metricIcon: {
    marginRight: 3,
  },
  metric: {
    fontSize: 14,
    color: NeutralColors.gray600,
    fontWeight: "500",
  },
  smallMetric: {
    fontSize: 12,
  },
  dotSeparator: {
    fontSize: 14,
    color: NeutralColors.gray400,
    marginHorizontal: 4,
  },
  soundToggle: {
    marginLeft: 4,
  },
  soundIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  soundIconEnabled: {
    backgroundColor: Colors.primary,
  },
  expandButton: {
    marginLeft: 8,
  },
  expandIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  navigationSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  currentStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    marginTop: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  smallIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 12,
  },
  directionContainer: {
    flex: 1,
  },
  distance: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    color: NeutralColors.gray800,
  },
  smallDistance: {
    fontSize: 13,
    marginBottom: 3,
  },
  instruction: {
    fontSize: 14,
    color: NeutralColors.gray700,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  smallInstruction: {
    fontSize: 12,
    lineHeight: 18,
  },
  upcomingStep: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  upcomingIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  smallUpcomingIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 10,
  },
  upcomingText: {
    fontSize: 13,
    color: NeutralColors.gray700,
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
  smallUpcomingText: {
    fontSize: 12,
    lineHeight: 16,
  },
  swipeHintContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  swipeHintDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 2,
  },
});

export default DetailsCard;

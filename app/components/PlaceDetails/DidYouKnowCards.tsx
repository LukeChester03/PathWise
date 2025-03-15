import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, NeutralColors } from "../../constants/colours";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DidYouKnowProps {
  aiContent: {
    didYouKnow: string[] | null;
    isGenerating: boolean;
  } | null;
  fontSize: {
    body: number;
    title: number;
    small: number;
    smaller?: number;
  };
  iconSize: {
    normal: number;
  };
  onFactPress?: (index: number) => void;
}

const DidYouKnow: React.FC<DidYouKnowProps> = ({ aiContent, fontSize, iconSize, onFactPress }) => {
  // Animation value for entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [expandedFact, setExpandedFact] = useState<number | null>(null);
  const [revealedFacts, setRevealedFacts] = useState<number[]>([]);

  // Initialize component
  useEffect(() => {
    // Reset state when content changes
    setExpandedFact(null);
    setRevealedFacts([]);

    // Simple entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Auto-reveal the first fact
    if (aiContent?.didYouKnow?.length) {
      setRevealedFacts([0]);
    }
  }, [aiContent?.didYouKnow]);

  // Toggle fact expansion
  const toggleFact = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Toggle expansion
    setExpandedFact(expandedFact === index ? null : index);

    // Mark as revealed if it wasn't already
    if (!revealedFacts.includes(index)) {
      setRevealedFacts([...revealedFacts, index]);
    }

    if (onFactPress) {
      onFactPress(index);
    }
  };

  // Reveal next fact
  const revealNextFact = () => {
    if (!aiContent?.didYouKnow?.length) return;

    const nextIndex = revealedFacts.length;
    if (nextIndex < aiContent.didYouKnow.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRevealedFacts([...revealedFacts, nextIndex]);
    }
  };

  // Loading state component
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingIndicator}>
        <Ionicons name="sparkles" size={iconSize.normal} color={Colors.primary} />
      </View>
      <Text style={[styles.loadingText, { fontSize: fontSize.small }]}>
        Discovering interesting facts...
      </Text>
    </View>
  );

  // No content state
  if (!aiContent?.didYouKnow || aiContent.didYouKnow.length === 0) {
    return aiContent?.isGenerating ? renderLoading() : null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons
            name="sparkles"
            size={iconSize.normal}
            color={Colors.primary}
            style={styles.titleIcon}
          />
          <Text style={[styles.title, { fontSize: fontSize.title }]}>Did You Know?</Text>
        </View>

        <Text style={[styles.subtitle, { fontSize: fontSize.small }]}>
          {revealedFacts.length} of {aiContent.didYouKnow.length} facts discovered
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {aiContent.didYouKnow.map((fact, index) => {
          const isRevealed = revealedFacts.includes(index);
          const isExpanded = expandedFact === index;

          return (
            <View
              key={`fact-${index}`}
              style={[
                styles.factContainer,
                {
                  opacity: isRevealed ? 1 : 0.6,
                },
              ]}
            >
              {isRevealed ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.factCard, isExpanded && styles.factCardExpanded]}
                  onPress={() => toggleFact(index)}
                >
                  {/* Static gradient background */}
                  <LinearGradient
                    colors={[Colors.background, `${NeutralColors.gray100}30`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Simple decorative circles - no animation */}
                  <View style={styles.circlesContainer}>
                    <View style={[styles.decorCircle, styles.decorCircle1]}>
                      <LinearGradient
                        colors={[`${Colors.primary}20`, `${Colors.primary}05`]}
                        style={styles.circleGradient}
                        start={{ x: 0.2, y: 0.2 }}
                        end={{ x: 0.8, y: 0.8 }}
                      />
                    </View>

                    <View style={[styles.decorCircle, styles.decorCircle2]}>
                      <LinearGradient
                        colors={[`${Colors.primary}05`, `${Colors.primary}15`]}
                        style={styles.circleGradient}
                        start={{ x: 0.7, y: 0.3 }}
                        end={{ x: 0.3, y: 0.7 }}
                      />
                    </View>
                  </View>

                  <View style={styles.factHeader}>
                    <View style={styles.factNumberContainer}>
                      <Text
                        style={[
                          styles.factNumber,
                          { fontSize: fontSize.smaller || fontSize.small * 0.8 },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={NeutralColors.gray500}
                    />
                  </View>

                  <View style={styles.factContent}>
                    <Text
                      style={[
                        styles.factText,
                        {
                          fontSize: fontSize.body,
                          lineHeight: fontSize.body * 1.4,
                        },
                      ]}
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {fact}
                    </Text>
                  </View>

                  {/* Simple fade gradient for collapsed state */}
                  {!isExpanded && (
                    <LinearGradient
                      colors={["rgba(255,255,255,0)", "rgba(255,255,255,1)"]}
                      style={styles.textFadeGradient}
                    />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.lockedFactCard}
                  onPress={revealNextFact}
                >
                  <LinearGradient
                    colors={[`${Colors.primary}10`, `${Colors.primary}20`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <Ionicons name="lock-closed" size={20} color={`${Colors.primary}80`} />
                  <Text style={[styles.lockedFactText, { fontSize: fontSize.small }]}>
                    Tap to reveal fact
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    overflow: "hidden",
    marginVertical: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: `${NeutralColors.gray200}50`,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    color: NeutralColors.gray600,
    fontWeight: "500",
  },
  scrollContainer: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
  },
  factContainer: {
    marginBottom: 16,
  },
  factCard: {
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 80,
    borderWidth: 1,
    borderColor: `${NeutralColors.gray200}70`,
    position: "relative",
  },
  factCardExpanded: {
    minHeight: 100,
  },
  factHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 8,
    zIndex: 2,
  },
  factNumberContainer: {
    backgroundColor: `${Colors.primary}20`,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  factNumber: {
    color: Colors.primary,
    fontWeight: "600",
  },
  factContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: "relative",
    zIndex: 1,
  },
  factText: {
    color: Colors.text,
    fontWeight: "400",
  },
  textFadeGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  lockedFactCard: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: `${Colors.primary}40`,
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  lockedFactText: {
    color: Colors.primary,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${Colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingText: {
    color: NeutralColors.gray600,
    fontWeight: "500",
  },
  bottomSpace: {
    height: 20,
  },
  circlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 0,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 100,
    overflow: "hidden",
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -20,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: 20,
  },
  circleGradient: {
    width: "100%",
    height: "100%",
  },
});

export default DidYouKnow;

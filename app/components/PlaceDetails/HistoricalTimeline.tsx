import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors, AccentColors } from "../../constants/colours";
import { LinearGradient } from "expo-linear-gradient";

interface HistoricalJourneyProps {
  aiContent: {
    isGenerating: boolean;
    historicalFacts: string[];
  } | null;
  fontSize: {
    body: number;
    subtitle: number;
    title: number;
  };
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const SPACING = 12;

const HistoricalJourney: React.FC<HistoricalJourneyProps> = ({ aiContent, fontSize }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [discoveredIndices, setDiscoveredIndices] = useState<number[]>([0]);
  const flatListRef = useRef<FlatList>(null);
  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== undefined && newIndex !== activeIndex) {
        setActiveIndex(newIndex);

        if (!discoveredIndices.includes(newIndex)) {
          setDiscoveredIndices((prev) => [...prev, newIndex]);
        }
      }
    }
  }).current;

  useEffect(() => {
    if (!discoveredIndices.includes(activeIndex)) {
      setDiscoveredIndices((prev) => [...prev, activeIndex]);
    }
  }, [activeIndex, discoveredIndices]);

  if (aiContent?.isGenerating) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["rgba(255,255,255,0.9)", "rgba(245,245,247,0.93)"]}
          style={styles.loadingCard}
        >
          <View style={styles.loadingIconContainer}>
            <Ionicons name="time-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.loadingTitle}>Uncovering History</Text>
          <Text style={styles.loadingText}>
            Exploring the historical tapestry of this location...
          </Text>
          <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
        </LinearGradient>
      </View>
    );
  }

  if (!aiContent?.historicalFacts || aiContent.historicalFacts.length === 0) {
    return null;
  }

  const facts = aiContent.historicalFacts;

  const viewConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 150,
  }).current;

  const getEraLabel = (index: number) => {
    if (index === 0) return "EARLIEST RECORDS";
    if (index === facts.length - 1) return "RECENT HISTORY";
    return "HISTORICAL MOMENT";
  };

  const scrollToIndex = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  const resetJourney = () => {
    scrollToIndex(0);
  };

  const Timeline = () => {
    return (
      <View style={styles.timelineContainer}>
        {Array.from({ length: facts.length }).map((_, index) => {
          const isActive = index === activeIndex;
          const isDiscovered = discoveredIndices.includes(index);
          const isPast = index < activeIndex;

          return (
            <View key={`timeline-dot-${index}`} style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  isActive && styles.activeTimelineDot,
                  isDiscovered && !isActive && styles.discoveredTimelineDot,
                  !isDiscovered && styles.lockedTimelineDot,
                ]}
              />
              {index < facts.length - 1 && (
                <View
                  style={[
                    styles.timelineConnector,
                    (isPast || (isActive && isDiscovered)) && styles.activeTimelineConnector,
                    !isPast && !isActive && styles.inactiveTimelineConnector,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderCard = ({ item, index }: { item: string; index: number }) => {
    const isDiscovered = discoveredIndices.includes(index);
    const isLocked = !isDiscovered;

    return (
      <View style={[styles.card, isLocked && styles.lockedCard]}>
        {isLocked ? (
          <LinearGradient colors={["#f7f7f7", "#eaeaea"]} style={styles.lockedContent}>
            <View style={styles.lockedIconContainer}>
              <Ionicons name="lock-closed" size={28} color={NeutralColors.gray500} />
            </View>
            <Text style={styles.lockedText}>
              Continue your journey to uncover this historical moment
            </Text>
          </LinearGradient>
        ) : (
          <View style={styles.cardContent}>
            <View style={styles.momentBadge}>
              <LinearGradient
                colors={[Colors.primary, AccentColors.accent1]}
                style={styles.momentBadgeGradient}
              >
                <Text style={styles.momentNumber}>{index + 1}</Text>
              </LinearGradient>
            </View>

            <View style={styles.factContentContainer}>
              <Text style={styles.eraIndicator}>{getEraLabel(index)}</Text>
              <Text style={[styles.factText, { fontSize: fontSize.body }]}>{item}</Text>
            </View>

            <View style={[styles.vintageCorner, styles.topLeftCorner]} />
            <View style={[styles.vintageCorner, styles.topRightCorner]} />
            <View style={[styles.vintageCorner, styles.bottomLeftCorner]} />
            <View style={[styles.vintageCorner, styles.bottomRightCorner]} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View style={styles.titleIconContainer}>
            <Ionicons name="book" size={20} color="#fff" />
          </View>
          <Text style={[styles.title, { fontSize: fontSize.title }]}>Historical Journey</Text>
        </View>

        <Timeline />
      </View>

      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={facts}
          keyExtractor={(_, index) => `fact-${index}`}
          renderItem={renderCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          snapToInterval={CARD_WIDTH + SPACING}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH + SPACING,
            offset: (CARD_WIDTH + SPACING) * index,
            index,
          })}
        />
      </View>
      <View style={styles.swipeInstructionContainer}>
        <Text style={styles.swipeInstructionText}>
          <Ionicons name="hand-right-outline" size={14} color={NeutralColors.gray500} /> Swipe to
          navigate
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    marginVertical: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 7,
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
  },

  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray200,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  titleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.5,
  },

  timelineContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  activeTimelineDot: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  discoveredTimelineDot: {
    backgroundColor: AccentColors.accent1,
    borderColor: AccentColors.accent1,
  },
  lockedTimelineDot: {
    backgroundColor: "white",
    borderColor: NeutralColors.gray300,
  },
  timelineConnector: {
    height: 2,
    width: 15,
    marginHorizontal: 2,
  },
  activeTimelineConnector: {
    backgroundColor: Colors.primary,
  },
  inactiveTimelineConnector: {
    backgroundColor: NeutralColors.gray300,
  },

  swipeInstructionContainer: {
    alignItems: "center",
    paddingBottom: 10,
    paddingTop: 5,
  },
  swipeInstructionText: {
    fontSize: 12,
    color: NeutralColors.gray500,
    fontWeight: "500",
  },

  loadingContainer: {
    padding: 28,
  },
  loadingCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
  },
  loadingIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 16,
    color: NeutralColors.gray700,
    textAlign: "center",
    lineHeight: 24,
    marginHorizontal: 10,
  },
  loader: {
    marginVertical: 24,
  },

  carouselContainer: {
    paddingVertical: 16,
    minHeight: 260,
  },
  flatListContent: {
    paddingHorizontal: (width - CARD_WIDTH) * 0.1,
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    height: 220,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
    marginHorizontal: SPACING / 2,
  },
  cardContent: {
    padding: 20,
    height: "100%",
    position: "relative",
    backgroundColor: "rgba(252, 250, 245, 0.7)",
  },

  momentBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  momentBadgeGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  momentNumber: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  factContentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  eraIndicator: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  factText: {
    color: Colors.text,
    lineHeight: 22,
    paddingRight: 10,
    textAlign: "center",
    width: "100%",
  },

  vintageCorner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: NeutralColors.gray300,
  },
  topLeftCorner: {
    top: 8,
    left: 8,
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
  topRightCorner: {
    top: 8,
    right: 8,
    borderRightWidth: 1,
    borderTopWidth: 1,
  },
  bottomLeftCorner: {
    bottom: 8,
    left: 8,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
  },
  bottomRightCorner: {
    bottom: 8,
    right: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },

  lockedCard: {
    backgroundColor: NeutralColors.gray100,
  },
  lockedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lockedIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  lockedText: {
    color: NeutralColors.gray600,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: "90%",
  },

  resetButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 5,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resetButtonText: {
    marginRight: 8,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
});

export default HistoricalJourney;

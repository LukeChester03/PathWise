import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../../navigation/types";
import { Phrase } from "../../../types/LearnScreen/LanguageTypes";
import {
  getLanguagePhrases,
  createMockPhrases,
  toggleFavoritePhrase,
  getCachedPhrases,
  getFavoritePhrases,
  getSavedPhrases,
  getComprehensivePhrasebook,
  checkRequestLimit,
} from "../../../services/LearnScreen/aiLanguageService";
import useTextToSpeech from "../../../hooks/AI/useTextToSpeech";

// A sample phrase to show in the basic state
const SAMPLE_PHRASE = {
  language: "French",
  phrase: "Bonjour, comment allez-vous?",
  translation: "Hello, how are you?",
  pronunciation: "Bohn-zhoor, koh-mahn tah-lay voo?",
};

interface LanguageAssistantProps {
  visitedPlaces: any[];
  cardAnimation: Animated.Value;
}

const LanguageAssistant: React.FC<LanguageAssistantProps> = ({ visitedPlaces, cardAnimation }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [displayPhrases, setDisplayPhrases] = useState<Phrase[]>([]);
  const [totalLanguageCount, setTotalLanguageCount] = useState<number>(0);
  const [totalPhraseCount, setTotalPhraseCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { speakPhrase } = useTextToSpeech();

  // Check if user has visited at least one place
  const hasVisitedPlaces = visitedPlaces?.length > 0;

  // Function to calculate language and phrase counts
  const calculateCounts = useCallback((allPhrases: Phrase[]) => {
    // Count unique languages
    const uniqueLanguages = new Set(allPhrases.map((p) => p.language)).size;
    // Total phrases count
    const totalPhrases = allPhrases.length;

    // Set state with the counts
    setTotalLanguageCount(uniqueLanguages);
    setTotalPhraseCount(totalPhrases);

    return { languageCount: uniqueLanguages, phraseCount: totalPhrases };
  }, []);

  // Updated function to check Firebase for cached phrases first
  const checkFirebaseCache = useCallback(async () => {
    console.log("Checking Firebase for cached phrases...");
    try {
      // Get phrases from the cache
      const { phrases: cachedPhrases, needsRefresh } = await getCachedPhrases();

      if (cachedPhrases.length > 0) {
        console.log(
          `Found ${cachedPhrases.length} cached phrases in Firebase, needsRefresh: ${needsRefresh}`
        );

        // Get favorite phrases to mark them appropriately
        const favoritePhrases = await getFavoritePhrases();
        const savedPhrases = await getSavedPhrases();

        // Create a set of favorite phrase IDs for quick lookup
        const favoriteIds = new Set(favoritePhrases.map((p) => p.id));
        const savedIds = new Set(savedPhrases.map((p) => p.id));

        // Mark phrases as favorites if they're in the favorites collection
        const markedPhrases = cachedPhrases.map((phrase) => ({
          ...phrase,
          isFavorite: favoriteIds.has(phrase.id) || savedIds.has(phrase.id),
        }));

        // Calculate total counts from all phrases
        const { languageCount, phraseCount } = calculateCounts(markedPhrases);
        console.log(`Total languages: ${languageCount}, Total phrases: ${phraseCount}`);

        // Store all phrases but only display a subset
        setPhrases(markedPhrases);
        setDisplayPhrases(markedPhrases.slice(0, 3)); // Display only first 3 for preview
        setLoading(false);

        // If cache needs refresh, check request limits before attempting background refresh
        if (needsRefresh && hasVisitedPlaces) {
          const limitInfo = await checkRequestLimit();
          if (limitInfo.canRequest) {
            console.log(
              "Cache needs refresh and we have requests available - refreshing in background"
            );
            fetchLanguagePhrases(true); // true = background refresh
          } else {
            console.log("Cache needs refresh but we're at request limit - using cached data");
          }
        }

        return true; // Successfully loaded from cache
      }

      return false; // No cache data found
    } catch (err) {
      console.error("Error checking Firebase cache:", err);
      return false; // Error, proceed to regular fetch
    }
  }, [hasVisitedPlaces, calculateCounts]);

  // Updated fetchLanguagePhrases function
  const fetchLanguagePhrases = useCallback(
    async (backgroundRefresh = false) => {
      if (!backgroundRefresh) {
        setLoading(true);
        setError(null);
      }

      try {
        console.log(
          `Fetching language phrases from API (backgroundRefresh: ${backgroundRefresh})...`
        );

        // Check request limits before proceeding
        const limitInfo = await checkRequestLimit();
        if (!limitInfo.canRequest) {
          if (!backgroundRefresh) {
            setError("Daily request limit reached. Try again tomorrow.");
            // Use mock data as fallback for foreground refresh when at limit
            const mockPhrases = createMockPhrases();
            calculateCounts(mockPhrases);
            setPhrases(mockPhrases);
            setDisplayPhrases(mockPhrases.slice(0, 3));
          }
          return;
        }

        // Get comprehensive phrasebook
        const comprehensivePhrases = await getComprehensivePhrasebook(visitedPlaces);

        if (comprehensivePhrases.length > 0) {
          // Calculate counts from all comprehensive phrases
          calculateCounts(comprehensivePhrases);

          // Store all phrases but only display a preview
          setPhrases(comprehensivePhrases);

          // If this is not a background refresh or we don't have any phrases yet, update display
          if (!backgroundRefresh || displayPhrases.length === 0) {
            setDisplayPhrases(comprehensivePhrases.slice(0, 3)); // Display only first 3 for preview
          }
        } else {
          // If no comprehensive phrases and we're not doing a background refresh, use mock data
          if (!backgroundRefresh) {
            const mockPhrases = createMockPhrases();
            calculateCounts(mockPhrases);
            setPhrases(mockPhrases);
            setDisplayPhrases(mockPhrases.slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Error getting phrases:", err);
        if (!backgroundRefresh) {
          setError("Failed to get phrases");
          const mockPhrases = createMockPhrases();
          calculateCounts(mockPhrases);
          setPhrases(mockPhrases);
          setDisplayPhrases(mockPhrases.slice(0, 3));
        }
      } finally {
        if (!backgroundRefresh) {
          setLoading(false);
        }
      }
    },
    [visitedPlaces, calculateCounts, displayPhrases.length]
  );

  // Updated useEffect for better initialization
  useEffect(() => {
    if (hasVisitedPlaces) {
      // Always check Firebase first, then fallback to API if needed
      checkFirebaseCache().then((foundInCache) => {
        if (!foundInCache) {
          // If not found in cache, do a regular fetch (which will cache the results)
          fetchLanguagePhrases();
        }
      });
    } else {
      // Clear loading state if no places visited
      setLoading(false);
      setError(null);
      setPhrases([]);
      setDisplayPhrases([]);
      setTotalLanguageCount(0);
      setTotalPhraseCount(0);
    }
  }, [visitedPlaces, checkFirebaseCache, fetchLanguagePhrases]);

  const handleToggleFavorite = async (phrase: Phrase) => {
    try {
      // Update both the display phrases and full phrases lists
      setDisplayPhrases(
        displayPhrases.map((p) => (p.id === phrase.id ? { ...p, isFavorite: !p.isFavorite } : p))
      );

      setPhrases(
        phrases.map((p) => (p.id === phrase.id ? { ...p, isFavorite: !p.isFavorite } : p))
      );

      await toggleFavoritePhrase(phrase.id!, phrase.isFavorite || false, phrase);
    } catch (err) {
      console.error("Error toggling favorite:", err);

      // Revert both display and full phrases on error
      setDisplayPhrases(
        displayPhrases.map((p) =>
          p.id === phrase.id ? { ...p, isFavorite: phrase.isFavorite } : p
        )
      );

      setPhrases(
        phrases.map((p) => (p.id === phrase.id ? { ...p, isFavorite: phrase.isFavorite } : p))
      );
    }
  };

  const handlePlayPhrase = (phrase: string, language: string) => {
    speakPhrase(phrase, language);
  };

  const navigateToPhrasebook = () => {
    navigation.navigate("Phrasebook", {
      visitedPlaces,
    });
  };

  // Render loading state
  const renderLoading = () => (
    <View style={styles.contentContainer}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.loadingText}>Loading phrases...</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.contentContainer}>
      <Ionicons name="alert-circle-outline" size={36} color="#FFFFFF" />
      <Text style={styles.errorText}>{error || "We couldn't load language phrases right now"}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchLanguagePhrases()}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render basic state (no visited places)
  const renderBasicState = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Language Assistant</Text>

      {/* Sample phrase preview */}
      <View style={styles.samplePhraseContainer}>
        <Text style={styles.languageLabel}>{SAMPLE_PHRASE.language}</Text>
        <Text style={styles.phraseText}>{SAMPLE_PHRASE.phrase}</Text>
        <Text style={styles.translationText}>{SAMPLE_PHRASE.translation}</Text>
      </View>

      <View style={styles.messageContainer}>
        <Ionicons name="information-circle" size={20} color="#FFFFFF" style={styles.infoIcon} />
        <Text style={styles.messageText}>
          The more places you visit, the more refined your phrasebook will become
        </Text>
      </View>
    </View>
  );

  // Render content state (has visited places)
  const renderContent = () => {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Language Assistant</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>
              {totalLanguageCount > 0 ? `${totalLanguageCount} Languages` : "1 Language"}
            </Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>
              {totalPhraseCount > 0 ? `${totalPhraseCount} Phrases` : "3 Phrases"}
            </Text>
          </View>
        </View>

        {/* Featured phrase */}
        {displayPhrases.length > 0 && (
          <View style={styles.featuredPhraseContainer}>
            <View style={styles.featuredPhraseHeader}>
              <Text style={styles.featuredLanguageLabel}>{displayPhrases[0].language}</Text>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() =>
                  handlePlayPhrase(displayPhrases[0].phrase, displayPhrases[0].language)
                }
              >
                <Ionicons name="volume-high" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.featuredPhraseText}>{displayPhrases[0].phrase}</Text>
            <Text style={styles.featuredTranslationText}>{displayPhrases[0].translation}</Text>
          </View>
        )}

        <View style={styles.aiPoweredContainer}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.aiPoweredText}>AI-Powered Phrases</Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: cardAnimation,
          transform: [
            {
              translateY: cardAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.9}
        onPress={navigateToPhrasebook}
      >
        <LinearGradient
          colors={["#0369A1", "#0284C7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading
            ? renderLoading()
            : error
            ? renderError()
            : !hasVisitedPlaces
            ? renderBasicState()
            : renderContent()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {loading
                ? "Loading phrases..."
                : error
                ? "Try again later"
                : `View all ${totalPhraseCount} phrases`}
            </Text>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -8,
    marginBottom: 24,
  },
  cardContainer: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradient: {
    minHeight: 220,
    justifyContent: "space-between",
  },
  contentContainer: {
    padding: 24,
    flex: 1,
    justifyContent: "flex-start",
  },
  // Section title
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  // Basic state
  samplePhraseContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  languageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.8,
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  translationText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
  },
  infoIcon: {
    marginRight: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  // Stats
  statsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  statBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Featured phrase
  featuredPhraseContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  featuredPhraseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featuredLanguageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  featuredPhraseText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  featuredTranslationText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  // AI badge
  aiPoweredContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  aiPoweredText: {
    fontSize: 10,
    color: "#FFFFFF",
    marginLeft: 4,
  },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    padding: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  // Loading state
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 12,
  },
  // Error state
  errorText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginVertical: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default LanguageAssistant;

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import {
  getComprehensivePhrasebook,
  getFavoritePhrases,
  getSavedPhrases,
  toggleFavoritePhrase,
  getPhrasesForCountry,
  getSuggestedCountries,
  addPhraseToPhrasebook,
  createMockPhrases,
  getPhrasebookSettings,
  savePhrase,
  removeSavedPhrase,
  checkRequestLimit,
  getCachedPhrases,
} from "../services/LearnScreen/aiLanguageService";
import { Phrase, LanguageGroup } from "../types/LearnScreen/LanguageTypes";
import useTextToSpeech from "../hooks/AI/useTextToSpeech";
import { Colors } from "../constants/colours";
import PhrasePreviewModal from "../components/LearnScreen/LanguageSection/PhrasePreviewModal";

// Define the blue color constants from the LanguageAssistant
const BLUE_PRIMARY = "#0369A1";
const BLUE_SECONDARY = "#0284C7";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;

type PhrasebookScreenProps = NativeStackScreenProps<RootStackParamList, "Phrasebook">;

interface MemoizedPhraseCardProps {
  phrase: Phrase;
  expandedPhraseId: string | null;
  onToggleFavorite: (phraseId: string, isFavorite: boolean, phrase: Phrase) => void;
  onToggleExpand: (phraseId: string) => void;
  onPlayPhrase: (phrase: string, language: string) => void;
  index: number;
}

// Enhanced Phrase Card Component
const MemoizedPhraseCard = memo(
  ({
    phrase,
    expandedPhraseId,
    onToggleFavorite,
    onToggleExpand,
    onPlayPhrase,
    index,
  }: MemoizedPhraseCardProps) => {
    const isExpanded = expandedPhraseId === phrase.id;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      // Entrance animation with staggered delay based on index
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay: index * 70,
          useNativeDriver: true,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 70,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    useEffect(() => {
      // Heart icon animation
      if (phrase.isFavorite) {
        Animated.spring(rotateAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }).start();
      } else {
        Animated.spring(rotateAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 3,
        }).start();
      }
    }, [phrase.isFavorite]);

    // Color-coding cards by language
    const getLanguageColor = (language: string) => {
      const colors: { [key: string]: string } = {
        French: "#E3F2FD",
        Spanish: "#FFF3E0",
        Italian: "#E8F5E9",
        German: "#F3E5F5",
        Japanese: "#FFEBEE",
        Chinese: "#FFF8E1",
        Korean: "#E1F5FE",
        Portuguese: "#E0F7FA",
        Russian: "#F1F8E9",
        Arabic: "#FFF3E0",
      };

      return colors[language] || "#F5F7FA";
    };

    // Animation for heart icon
    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    // Animation for pronunciation container
    const expandHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(expandHeight, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, [isExpanded]);

    // Get category icon based on context
    const getCategoryIcon = (context: string) => {
      const contextLower = context.toLowerCase();
      if (contextLower.includes("greeting")) return "hand-left-outline";
      if (contextLower.includes("food") || contextLower.includes("restaurant"))
        return "restaurant-outline";
      if (contextLower.includes("direction") || contextLower.includes("location"))
        return "navigate-outline";
      if (contextLower.includes("shopping")) return "cart-outline";
      if (contextLower.includes("emergency")) return "medkit-outline";
      if (contextLower.includes("transportation")) return "car-outline";
      return "chatbubble-outline";
    };

    return (
      <Animated.View
        style={[
          styles.phraseCard,
          {
            backgroundColor: getLanguageColor(phrase.language),
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.phraseHeader}>
          <View style={styles.phraseLanguageContainer}>
            <Text style={styles.phraseLanguage}>{phrase.language}</Text>
            <View style={styles.contextContainer}>
              <Ionicons name={getCategoryIcon(phrase.useContext)} size={12} color="#6B7280" />
              <Text style={styles.phraseContext}>{phrase.useContext}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => onToggleFavorite(phrase.id!, phrase.isFavorite || false, phrase)}
          >
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Ionicons
                name={phrase.isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={phrase.isFavorite ? "#EF4444" : "#6B7280"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        <Text style={styles.phraseText}>{phrase.phrase}</Text>
        <Text style={styles.phraseTranslation}>{phrase.translation}</Text>

        {phrase.region && (
          <View style={styles.regionContainer}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.regionText}>{phrase.region}</Text>
          </View>
        )}

        <View style={styles.phraseActions}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => onToggleExpand(phrase.id!)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandButtonText}>{isExpanded ? "Less" : "Pronunciation"}</Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={BLUE_PRIMARY}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => onPlayPhrase(phrase.phrase, phrase.language)}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-high" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <Animated.View
            style={[
              styles.pronunciationContainer,
              {
                maxHeight: expandHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 200],
                }),
                opacity: expandHeight,
              },
            ]}
          >
            <Text style={styles.pronunciationLabel}>Pronunciation:</Text>
            <Text style={styles.pronunciationText}>{phrase.pronunciation}</Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  }
);

// Language Filter Pills Component
const LanguageFilterPills = ({
  languages,
  selectedLanguage,
  onSelect,
  onFavoritesFilter,
  isFavoritesSelected,
}: {
  languages: LanguageGroup[];
  selectedLanguage: string | null;
  onSelect: (lang: string) => void;
  onFavoritesFilter: () => void;
  isFavoritesSelected: boolean;
}) => {
  return (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[
          styles.favoriteFilterPill,
          isFavoritesSelected && styles.favoriteFilterPillSelected,
        ]}
        onPress={onFavoritesFilter}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavoritesSelected ? "heart" : "heart-outline"}
          size={16}
          color={isFavoritesSelected ? "#FFFFFF" : "#EF4444"}
        />
        <Text
          style={[
            styles.favoriteFilterText,
            isFavoritesSelected && styles.favoriteFilterTextSelected,
          ]}
        >
          Favorites
        </Text>
      </TouchableOpacity>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={languages}
        keyExtractor={(item) => item.language}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.languagePill,
              selectedLanguage === item.language && styles.languagePillSelected,
            ]}
            onPress={() => onSelect(item.language)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.languagePillText,
                selectedLanguage === item.language && styles.languagePillTextSelected,
              ]}
            >
              {item.language} ({item.phrases.length})
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.languagePillsContainer}
      />
    </View>
  );
};

// Country Item Component for Explore Modal
const CountryItem = ({
  name,
  onSelect,
  disabled,
}: {
  name: string;
  onSelect: () => void;
  disabled: boolean;
}) => {
  // Function to get a flag emoji from country name
  const getCountryFlag = (countryName: string) => {
    const flags: { [key: string]: string } = {
      France: "🇫🇷",
      Italy: "🇮🇹",
      Spain: "🇪🇸",
      Japan: "🇯🇵",
      China: "🇨🇳",
      Germany: "🇩🇪",
      Thailand: "🇹🇭",
      Mexico: "🇲🇽",
      Brazil: "🇧🇷",
      "United Kingdom": "🇬🇧",
      "United States": "🇺🇸",
      Canada: "🇨🇦",
      Australia: "🇦🇺",
      Russia: "🇷🇺",
      India: "🇮🇳",
      Greece: "🇬🇷",
      Portugal: "🇵🇹",
      Netherlands: "🇳🇱",
      Sweden: "🇸🇪",
      Norway: "🇳🇴",
      Finland: "🇫🇮",
      Denmark: "🇩🇰",
      Poland: "🇵🇱",
      Switzerland: "🇨🇭",
      Austria: "🇦🇹",
      Belgium: "🇧🇪",
      Ireland: "🇮🇪",
      "New Zealand": "🇳🇿",
      "South Korea": "🇰🇷",
      Singapore: "🇸🇬",
    };

    return flags[countryName] || "🌍";
  };

  return (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.countryFlag}>{getCountryFlag(name)}</Text>
      <Text style={styles.countryName}>{name}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

// Main Phrasebook Screen Component
const PhrasebookScreen: React.FC<PhrasebookScreenProps> = ({ route, navigation }) => {
  const { visitedPlaces } = route.params;
  const { speakPhrase } = useTextToSpeech();

  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [savedPhrases, setSavedPhrases] = useState<Phrase[]>([]);
  const [viewMode, setViewMode] = useState<"all" | "saved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupedPhrases, setGroupedPhrases] = useState<LanguageGroup[]>([]);
  const [expandedPhraseId, setExpandedPhraseId] = useState<string | null>(null);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [explorableCountries, setExplorableCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [loadingCountryPhrases, setLoadingCountryPhrases] = useState(false);

  // New state variables for the PhrasePreviewModal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPhrases, setPreviewPhrases] = useState<Phrase[]>([]);
  const [loadingAddPhrases, setLoadingAddPhrases] = useState(false);

  // Request limits state
  const [requestLimits, setRequestLimits] = useState<{
    requestsRemaining: number;
    nextAvailableTime?: string;
  }>({
    requestsRemaining: 3,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchPhrases();
    fetchSavedPhrases();
    fetchExplorableCountries();
    fetchRequestLimits();
  }, []);

  // Improved: Add searchQuery to dependencies to reprocess whenever search changes
  useEffect(() => {
    processPhrases(phrases);
  }, [phrases, searchQuery]);

  // Improved: Add searchQuery to dependencies for saved phrases processing
  useEffect(() => {
    if (viewMode === "saved") {
      processPhrases(savedPhrases);
    }
  }, [savedPhrases, viewMode, searchQuery]);

  // Fetch saved phrases from Firebase
  const fetchSavedPhrases = async () => {
    try {
      const savedPhrasesData = await getSavedPhrases();
      setSavedPhrases(savedPhrasesData);
    } catch (err) {
      console.error("Error fetching saved phrases:", err);
    }
  };

  // Fetch request limits from Firebase
  const fetchRequestLimits = async () => {
    try {
      const limitInfo = await checkRequestLimit();
      setRequestLimits({
        requestsRemaining: limitInfo.requestsRemaining,
        nextAvailableTime: limitInfo.nextAvailableTime,
      });
    } catch (error) {
      console.error("Error fetching request limits:", error);
    }
  };

  const fetchPhrases = async () => {
    setLoading(true);
    setError(null);

    try {
      // First check for cached phrases
      const cachedPhrases = await getCachedPhrases();
      let comprehensivePhrases = [];

      if (cachedPhrases.phrases.length > 0) {
        // If we have cached phrases and they don't need refresh, use them
        if (!cachedPhrases.needsRefresh) {
          console.log("Using cached phrases from Firebase - no refresh needed");
          comprehensivePhrases = cachedPhrases.phrases;
        } else {
          // If cached phrases need refresh, check if we're at our request limit
          const limitInfo = await checkRequestLimit();

          if (limitInfo.canRequest) {
            // If we can make requests, get fresh phrases
            console.log(
              "Cached phrases need refresh and we have requests available - getting fresh data"
            );
            comprehensivePhrases = await getComprehensivePhrasebook(visitedPlaces);
          } else {
            // If at request limit, use cached phrases even though they're stale
            console.log(
              "Cached phrases need refresh but we're at request limit - using cached data"
            );
            comprehensivePhrases = cachedPhrases.phrases;
          }
        }
      } else {
        // No cached phrases, check request limits before attempting to get new phrases
        const limitInfo = await checkRequestLimit();

        if (limitInfo.canRequest) {
          console.log("No cached phrases found - requesting new phrases");
          comprehensivePhrases = await getComprehensivePhrasebook(visitedPlaces);
        } else {
          // At request limit with no cache, use mock data
          console.log("At request limit with no cached data - using mock phrases");
          comprehensivePhrases = createMockPhrases();
        }
      }

      // Get favorite phrases
      const favoritePhrases = await getFavoritePhrases();

      // Get saved phrases
      const userSavedPhrases = await getSavedPhrases();

      // Create a Map to track unique phrases by their content to avoid duplicates
      const uniquePhrasesMap = new Map<string, Phrase>();

      // Process all phrases in order of priority
      if (comprehensivePhrases.length > 0) {
        // Process comprehensive phrases first
        comprehensivePhrases.forEach((phrase) => {
          const phraseKey = `${phrase.language}-${phrase.phrase}`;
          uniquePhrasesMap.set(phraseKey, {
            ...phrase,
            isFavorite: false,
          });
        });

        // Process favorite phrases, overriding any existing ones
        favoritePhrases.forEach((favorite) => {
          const phraseKey = `${favorite.language}-${favorite.phrase}`;
          if (uniquePhrasesMap.has(phraseKey)) {
            // Update existing phrase with favorite's ID and marked as favorite
            const existingPhrase = uniquePhrasesMap.get(phraseKey)!;
            uniquePhrasesMap.set(phraseKey, {
              ...existingPhrase,
              id: favorite.id,
              isFavorite: true,
            });
          } else {
            // Add as new phrase
            uniquePhrasesMap.set(phraseKey, favorite);
          }
        });

        // Process saved phrases, overriding any existing ones
        userSavedPhrases.forEach((saved) => {
          const phraseKey = `${saved.language}-${saved.phrase}`;
          if (uniquePhrasesMap.has(phraseKey)) {
            // Update existing phrase with saved's ID and marked as favorite
            const existingPhrase = uniquePhrasesMap.get(phraseKey)!;
            uniquePhrasesMap.set(phraseKey, {
              ...existingPhrase,
              id: saved.id,
              isFavorite: true,
            });
          } else {
            // Add as new phrase
            uniquePhrasesMap.set(phraseKey, saved);
          }
        });

        // Convert the map values to array
        setPhrases(Array.from(uniquePhrasesMap.values()));
      } else if (favoritePhrases.length > 0) {
        setPhrases(favoritePhrases);
      } else if (userSavedPhrases.length > 0) {
        setPhrases(userSavedPhrases);
      } else {
        // Fallback to mock data if all are empty
        setPhrases(createMockPhrases());
      }

      setSavedPhrases(userSavedPhrases);

      // Update request limits after fetch
      await fetchRequestLimits();
    } catch (err) {
      console.error("Error fetching phrases:", err);
      setError(err instanceof Error ? err.message : "Failed to load phrasebook");
      // Use mock data as fallback
      setPhrases(createMockPhrases());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExplorableCountries = async () => {
    try {
      // First try to get stored settings
      const settings = await getPhrasebookSettings();

      if (settings.explorableCountries && settings.explorableCountries.length > 0) {
        setExplorableCountries(settings.explorableCountries);
      } else {
        // Generate suggestions if none stored
        const suggestedCountries = await getSuggestedCountries(visitedPlaces);
        setExplorableCountries(suggestedCountries);
      }
    } catch (err) {
      console.error("Error getting explorable countries:", err);
      setExplorableCountries(["France", "Italy", "Spain", "Japan", "Thailand"]);
    }
  };

  // Improved: Make processPhrases a useCallback with searchQuery as dependency
  const processPhrases = useCallback(
    (phrasesToProcess: Phrase[]) => {
      console.log(`Processing ${phrasesToProcess.length} phrases with search: "${searchQuery}"`);

      // Filter phrases based on search query
      const filteredPhrases = phrasesToProcess.filter((phrase) => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        return (
          phrase.phrase.toLowerCase().includes(query) ||
          phrase.translation.toLowerCase().includes(query) ||
          phrase.useContext.toLowerCase().includes(query) ||
          phrase.language.toLowerCase().includes(query) ||
          (phrase.region && phrase.region.toLowerCase().includes(query))
        );
      });

      console.log(`After filtering: ${filteredPhrases.length} phrases remain`);

      // Group by language
      const grouped: { [key: string]: Phrase[] } = {};
      filteredPhrases.forEach((phrase) => {
        if (!grouped[phrase.language]) {
          grouped[phrase.language] = [];
        }
        grouped[phrase.language].push(phrase);
      });

      // Convert to array of language groups
      const languageGroups = Object.keys(grouped).map((language) => ({
        language,
        phrases: grouped[language],
      }));

      setGroupedPhrases(languageGroups);
    },
    [searchQuery] // Add searchQuery as a dependency
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (viewMode === "all") {
      fetchPhrases();
    } else {
      fetchSavedPhrases();
    }
  }, [viewMode]);

  // Improved: Simplified handleSearch to just update searchQuery
  // The useEffect hooks will take care of reprocessing
  const handleSearch = useCallback((text: string) => {
    console.log("Search query changed:", text);
    setSearchQuery(text);
  }, []);

  const handleSelectLanguage = useCallback(
    (language: string) => {
      setSelectedLanguage(selectedLanguage === language ? null : language);
    },
    [selectedLanguage]
  );

  const handleToggleFavorite = useCallback(
    async (phraseId: string, isFavorite: boolean, phrase: Phrase) => {
      try {
        // Optimistic update for UI
        if (viewMode === "all") {
          setPhrases((prevPhrases) =>
            prevPhrases.map((p) => (p.id === phraseId ? { ...p, isFavorite: !isFavorite } : p))
          );
        }

        // Update saved phrases collection
        if (!isFavorite) {
          // Add to saved phrases
          const newPhrase = { ...phrase, isFavorite: true };
          setSavedPhrases((prev) => [...prev, newPhrase]);
          await savePhrase(newPhrase);
        } else {
          // Remove from saved phrases
          setSavedPhrases((prev) =>
            prev.filter((p) => !(p.phrase === phrase.phrase && p.language === phrase.language))
          );

          // If we're in saved view and this is the last phrase of its language, refresh UI
          if (viewMode === "saved") {
            const languageGroup = groupedPhrases.find((g) => g.language === phrase.language);
            if (languageGroup && languageGroup.phrases.length === 1) {
              // This is the last phrase in this language group
              setTimeout(() => processPhrases(savedPhrases), 50);
            }
          }

          await removeSavedPhrase(phraseId);
        }

        // Also update the phrase in the temporary collection
        await toggleFavoritePhrase(phraseId, !isFavorite, phrase);
      } catch (err) {
        console.error("Error toggling favorite:", err);

        // Revert UI on error
        if (viewMode === "all") {
          setPhrases((prevPhrases) =>
            prevPhrases.map((p) => (p.id === phraseId ? { ...p, isFavorite: isFavorite } : p))
          );
        }

        if (!isFavorite) {
          setSavedPhrases((prev) =>
            prev.filter((p) => !(p.phrase === phrase.phrase && p.language === phrase.language))
          );
        } else {
          const newPhrase = { ...phrase, isFavorite: true };
          setSavedPhrases((prev) => [...prev, newPhrase]);
        }

        Alert.alert("Error", "Failed to update favorite status");
      }
    },
    [viewMode, groupedPhrases, savedPhrases, processPhrases]
  );

  const handleToggleExpand = useCallback(
    (phraseId: string) => {
      setExpandedPhraseId(expandedPhraseId === phraseId ? null : phraseId);
    },
    [expandedPhraseId]
  );

  // Updated handlePlayPhrase to use our text-to-speech hook
  const handlePlayPhrase = useCallback(
    (phrase: string, language: string) => {
      // Use the speakPhrase function from our hook
      speakPhrase(phrase, language);
    },
    [speakPhrase]
  );

  const handleExploreNewCountry = useCallback(() => {
    // Check if the user has reached their daily request limit
    if (requestLimits.requestsRemaining <= 0) {
      Alert.alert(
        "Request Limit Reached",
        `You've reached your daily phrase request limit. Try again ${
          requestLimits.nextAvailableTime
            ? `after ${new Date(requestLimits.nextAvailableTime).toLocaleTimeString()}`
            : "tomorrow"
        }`
      );
      return;
    }

    setShowExploreModal(true);
  }, [requestLimits]);

  // UPDATED: Modified to use the PhrasePreviewModal
  const handleSelectCountryToExplore = useCallback((country: string) => {
    setSelectedCountry(country);
    setLoadingCountryPhrases(true);

    // First, check if the user can make more requests
    checkRequestLimit()
      .then((limitInfo) => {
        if (!limitInfo.canRequest) {
          setLoadingCountryPhrases(false);
          Alert.alert(
            "Request Limit Reached",
            `You've reached your daily phrase request limit. Try again ${
              limitInfo.nextAvailableTime
                ? `after ${new Date(limitInfo.nextAvailableTime).toLocaleTimeString()}`
                : "tomorrow"
            }`
          );
          return;
        }

        // If they can make more requests, proceed
        return getPhrasesForCountry(country);
      })
      .then((newPhrases) => {
        // If user hit request limit, this will be undefined
        if (!newPhrases) return;

        if (newPhrases.length > 0) {
          // Hide the explore modal and show the preview modal
          setShowExploreModal(false);
          setPreviewPhrases(newPhrases);
          setShowPreviewModal(true);
        } else {
          Alert.alert("Error", `Failed to generate phrases for ${country}`);
        }
        setLoadingCountryPhrases(false);
      })
      .catch((err) => {
        console.error("Error generating country phrases:", err);
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to generate phrases");
        setLoadingCountryPhrases(false);
      });
  }, []);

  // NEW: Handle closing the preview modal
  const handleClosePreview = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewPhrases([]);

    // Refresh the request limits after cancellation
    fetchRequestLimits();
  }, []);

  // NEW: Handle adding all phrases from the preview
  const handleAddAllPhrases = useCallback(async () => {
    if (previewPhrases.length === 0) return;

    setLoadingAddPhrases(true);

    try {
      for (const phrase of previewPhrases) {
        await addPhraseToPhrasebook(phrase);
      }

      // Update local state
      setPhrases((prevPhrases) => [
        ...prevPhrases,
        ...previewPhrases.map((p) => ({ ...p, isFavorite: true })),
      ]);

      // Also update saved phrases
      setSavedPhrases((prev) => [
        ...prev,
        ...previewPhrases.map((p) => ({ ...p, isFavorite: true })),
      ]);

      // Refresh the request limits after successfully adding phrases
      await fetchRequestLimits();

      // Close the preview modal
      setShowPreviewModal(false);

      // Show success message
      Alert.alert(
        "Success",
        `Added ${previewPhrases.length} phrases from ${selectedCountry} to your phrasebook!`
      );
    } catch (err) {
      console.error("Error adding phrases:", err);
      Alert.alert("Error", "Failed to add phrases to your phrasebook");
    } finally {
      setLoadingAddPhrases(false);
      setPreviewPhrases([]);
    }
  }, [previewPhrases, selectedCountry]);

  // Toggle between All and Saved views
  const handleToggleViewMode = useCallback((mode: "all" | "saved") => {
    setViewMode(mode);
    setSelectedLanguage(null);

    // Process the appropriate set of phrases automatically through useEffect
  }, []);

  // Toggle favorites filter
  const handleToggleFavoritesFilter = useCallback(() => {
    setSelectedLanguage(selectedLanguage === "favorites" ? null : "favorites");
  }, [selectedLanguage]);

  // Render the content section
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE_PRIMARY} />
          <Text style={styles.loadingText}>Generating your phrasebook...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPhrases}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Empty states
    if (viewMode === "saved" && savedPhrases.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={70} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No saved phrases yet</Text>
          <Text style={styles.emptyMessage}>
            Heart phrases you want to remember to save them to your collection
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => handleToggleViewMode("all")}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>Browse All Phrases</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      viewMode === "all" &&
      selectedLanguage === "favorites" &&
      !phrases.some((p) => p.isFavorite)
    ) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={70} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No favorite phrases yet</Text>
          <Text style={styles.emptyMessage}>
            Tap the heart icon on any phrase to add it to your favorites
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setSelectedLanguage(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>Show All Phrases</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      searchQuery &&
      ((viewMode === "all" && groupedPhrases.length === 0) ||
        (viewMode === "saved" && savedPhrases.length === 0))
    ) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={70} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No phrases match your search</Text>
          <Text style={styles.emptyMessage}>Try different keywords or clear your search</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setSearchQuery("")}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Regular content with phrases
    return (
      <FlatList
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          viewMode === "all" && (
            <LanguageFilterPills
              languages={groupedPhrases}
              selectedLanguage={selectedLanguage !== "favorites" ? selectedLanguage : null}
              onSelect={handleSelectLanguage}
              onFavoritesFilter={handleToggleFavoritesFilter}
              isFavoritesSelected={selectedLanguage === "favorites"}
            />
          )
        }
        data={
          viewMode === "all" && selectedLanguage === "favorites"
            ? phrases.filter((p) => p.isFavorite).map((p, i) => ({ ...p, index: i }))
            : viewMode === "all" && selectedLanguage
            ? groupedPhrases
                .filter((g) => g.language === selectedLanguage)
                .flatMap((g) => g.phrases.map((p, i) => ({ ...p, index: i })))
            : viewMode === "all"
            ? groupedPhrases.flatMap((g) => g.phrases.map((p, i) => ({ ...p, index: i })))
            : savedPhrases.map((p, i) => ({ ...p, index: i }))
        }
        renderItem={({ item, index }) => (
          <MemoizedPhraseCard
            phrase={item}
            expandedPhraseId={expandedPhraseId}
            onToggleFavorite={handleToggleFavorite}
            onToggleExpand={handleToggleExpand}
            onPlayPhrase={handlePlayPhrase}
            index={index}
          />
        )}
        keyExtractor={(item, index) => {
          // Create a unique key that includes viewMode, item.id and index
          if (item.id) {
            return `${viewMode}-${item.id}-${index}`;
          }
          // Fallback to a predictable key based on index
          return `phrase-${index}`;
        }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="language-outline" size={70} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No phrases available</Text>
            <Text style={styles.emptyMessage}>
              Explore new countries to add phrases to your phrasebook
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleExploreNewCountry}
              disabled={requestLimits.requestsRemaining === 0}
              activeOpacity={0.7}
            >
              <Ionicons
                name="compass-outline"
                size={18}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.emptyButtonText}>Explore New Country</Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header
        title="Phrasebook"
        subtitle="Travel phrases"
        showBackButton={true}
        showHelp={false}
        onBackPress={() => navigation.goBack()}
        showIcon={true}
        iconName="language"
        iconColor={Colors.primary}
      />
      <SafeAreaView style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search phrases or languages..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Controls */}
        <View style={styles.controlsRow}>
          {/* View Toggle */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentButton, viewMode === "all" && styles.segmentButtonActive]}
              onPress={() => handleToggleViewMode("all")}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, viewMode === "all" && styles.segmentTextActive]}>
                All Phrases
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, viewMode === "saved" && styles.segmentButtonActive]}
              onPress={() => handleToggleViewMode("saved")}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, viewMode === "saved" && styles.segmentTextActive]}>
                Saved ({savedPhrases.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Request Limit Badge */}
          <View style={styles.rightControls}>
            <View
              style={[
                styles.requestLimitBadge,
                requestLimits.requestsRemaining === 0 && styles.requestLimitBadgeWarning,
              ]}
            >
              <Ionicons
                name={requestLimits.requestsRemaining > 0 ? "refresh" : "time-outline"}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.requestLimitText}>{requestLimits.requestsRemaining} left</Text>
            </View>

            {/* Explore Button */}
            <TouchableOpacity
              style={[
                styles.exploreButton,
                requestLimits.requestsRemaining === 0 && styles.exploreButtonDisabled,
              ]}
              onPress={handleExploreNewCountry}
              disabled={requestLimits.requestsRemaining === 0}
              activeOpacity={0.7}
            >
              <Ionicons
                name="compass"
                size={20}
                color={requestLimits.requestsRemaining > 0 ? "#FFFFFF" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        {renderContent()}

        {/* Explore Countries Modal */}
        <Modal
          visible={showExploreModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowExploreModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalDragIndicator} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Explore New Country</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowExploreModal(false)}
                  disabled={loadingCountryPhrases}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {loadingCountryPhrases ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color={BLUE_PRIMARY} />
                  <Text style={styles.modalLoadingText}>
                    Generating phrases for {selectedCountry}...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.modalSubtitle}>Select a country to explore new phrases:</Text>

                  <FlatList
                    data={explorableCountries}
                    renderItem={({ item }) => (
                      <CountryItem
                        name={item}
                        onSelect={() => handleSelectCountryToExplore(item)}
                        disabled={loadingCountryPhrases}
                      />
                    )}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.countriesContainer}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                  />
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* NEW: Phrase Preview Modal */}
        <PhrasePreviewModal
          visible={showPreviewModal}
          phrases={previewPhrases}
          countryName={selectedCountry}
          isLoading={loadingAddPhrases}
          onClose={handleClosePreview}
          onAddAll={handleAddAllPhrases}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    margin: 16,
    marginBottom: 8,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
  },
  // Tab control & navigation styles
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    overflow: "hidden",
  },
  segmentButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: BLUE_PRIMARY,
    fontWeight: "600",
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestLimitBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE_PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 10,
  },
  requestLimitBadgeWarning: {
    backgroundColor: "#F59E0B",
  },
  requestLimitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  exploreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BLUE_PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exploreButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  // Filter styles
  filterContainer: {
    marginBottom: 16,
  },
  favoriteFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  favoriteFilterPillSelected: {
    backgroundColor: "#EF4444",
  },
  favoriteFilterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EF4444",
    marginLeft: 6,
  },
  favoriteFilterTextSelected: {
    color: "#FFFFFF",
  },
  languagePillsContainer: {
    paddingBottom: 10,
  },
  languagePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  languagePillSelected: {
    backgroundColor: BLUE_PRIMARY,
  },
  languagePillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  languagePillTextSelected: {
    color: "#FFFFFF",
  },
  // Content styles
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Phrase card styles
  phraseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  phraseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  phraseLanguageContainer: {
    flex: 1,
  },
  phraseLanguage: {
    fontSize: 14,
    fontWeight: "600",
    color: BLUE_PRIMARY,
    marginBottom: 4,
  },
  contextContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phraseContext: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginLeft: 4,
  },
  favoriteButton: {
    padding: 4,
  },
  phraseText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    lineHeight: 28,
  },
  phraseTranslation: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 10,
    lineHeight: 22,
  },
  regionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  regionText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  phraseActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: BLUE_PRIMARY,
    marginRight: 4,
  },
  playButton: {
    backgroundColor: BLUE_PRIMARY,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pronunciationContainer: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    overflow: "hidden",
  },
  pronunciationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: BLUE_PRIMARY,
    marginBottom: 6,
  },
  pronunciationText: {
    fontSize: 16,
    color: "#1F2937",
    fontStyle: "italic",
    lineHeight: 22,
  },
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: BLUE_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: "80%",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BLUE_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#4B5563",
    marginBottom: 16,
  },
  countriesContainer: {
    paddingBottom: 24,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  modalLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
  },
});

export default PhrasebookScreen;

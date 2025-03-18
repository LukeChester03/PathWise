// components/Learn/LanguageAssistant.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { Phrase } from "../../types/LearnScreen/LanguageTypes";
import {
  getLanguagePhrases,
  createMockPhrases,
  toggleFavoritePhrase,
} from "../../services/LearnScreen/aiLanguageService";
import useTextToSpeech from "../../hooks/AI/useTextToSpeech";

interface LanguageAssistantProps {
  visitedPlaces: any[];
  cardAnimation: Animated.Value;
}

const LanguageAssistant: React.FC<LanguageAssistantProps> = ({ visitedPlaces, cardAnimation }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { speakPhrase } = useTextToSpeech();

  useEffect(() => {
    if (visitedPlaces?.length > 0) {
      fetchLanguagePhrases();
    } else {
      setLoading(false);
      setError("No visited places to generate phrases");
    }
  }, [visitedPlaces]);

  const fetchLanguagePhrases = async () => {
    setLoading(true);
    setError(null);

    try {
      const generatedPhrases = await getLanguagePhrases(visitedPlaces);

      if (generatedPhrases.length > 0) {
        setPhrases(generatedPhrases.slice(0, 4)); // Display only first 4 for preview
      } else {
        // Use mock data as fallback
        setPhrases(createMockPhrases().slice(0, 4));
      }
    } catch (err) {
      console.error("Error getting phrases:", err);
      setError("Failed to get phrases");
      setPhrases(createMockPhrases().slice(0, 4));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (phrase: Phrase) => {
    try {
      // Optimistic update
      setPhrases(
        phrases.map((p) => (p.id === phrase.id ? { ...p, isFavorite: !p.isFavorite } : p))
      );

      // Perform the actual update
      await toggleFavoritePhrase(phrase.id!, phrase.isFavorite || false, phrase);
    } catch (err) {
      console.error("Error toggling favorite:", err);
      // Revert on error
      setPhrases(
        phrases.map((p) => (p.id === phrase.id ? { ...p, isFavorite: phrase.isFavorite } : p))
      );
    }
  };

  const handlePlayPhrase = (phrase: string, language: string) => {
    speakPhrase(phrase, language);
  };

  const toggleExpand = (phraseId: string) => {
    setExpandedCard(expandedCard === phraseId ? null : phraseId);
  };

  const navigateToPhrasebook = () => {
    navigation.navigate("Phrasebook", {
      visitedPlaces,
    });
  };

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
        styles.aiLanguageCard,
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
      <View style={styles.aiLanguageHeader}>
        <Ionicons name="language" size={22} color="#0284C7" />
        <Text style={styles.aiLanguageTitle}>AI Language Assistant</Text>
      </View>

      <Text style={styles.aiLanguageSubtitle}>Useful phrases from regions you've visited:</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0284C7" />
          <Text style={styles.loadingText}>Generating phrases...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLanguagePhrases}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.phrasesScrollView}
          contentContainerStyle={styles.phrasesContentContainer}
        >
          {phrases.map((phrase) => (
            <View key={phrase.id} style={styles.phraseCard}>
              {/* Header with language and save button */}
              <View style={styles.cardHeader}>
                <View style={styles.languageContainer}>
                  <Text style={styles.phraseLanguage}>{phrase.language}</Text>

                  <View style={styles.contextBadge}>
                    <Ionicons name={getCategoryIcon(phrase.useContext)} size={10} color="#6B7280" />
                    <Text style={styles.contextText}>{phrase.useContext}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleToggleFavorite(phrase)}
                >
                  <Ionicons
                    name={phrase.isFavorite ? "heart" : "heart-outline"}
                    size={18}
                    color={phrase.isFavorite ? "#EF4444" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>

              {/* Phrase and translation */}
              <Text style={styles.phraseText}>{phrase.phrase}</Text>
              <Text style={styles.phraseTranslation}>{phrase.translation}</Text>

              {/* Action row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.pronunciationButton}
                  onPress={() => toggleExpand(phrase.id!)}
                >
                  <Text style={styles.pronunciationButtonText}>
                    {expandedCard === phrase.id ? "Hide" : "Pronunciation"}
                  </Text>
                  <Ionicons
                    name={expandedCard === phrase.id ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#0284C7"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => handlePlayPhrase(phrase.phrase, phrase.language)}
                >
                  <Ionicons name="volume-high" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Expandable pronunciation section */}
              {expandedCard === phrase.id && (
                <View style={styles.pronunciationContainer}>
                  <Text style={styles.pronunciationText}>{phrase.pronunciation}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.viewAllPhrasesButton} onPress={navigateToPhrasebook}>
        <Text style={styles.viewAllPhrasesText}>View Complete Phrasebook</Text>
        <Ionicons name="chevron-forward" size={16} color="#0284C7" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  aiLanguageCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiLanguageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiLanguageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284C7",
    marginLeft: 8,
  },
  aiLanguageSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#4B5563",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  phrasesScrollView: {
    marginBottom: 12,
  },
  phrasesContentContainer: {
    paddingRight: 16,
    paddingBottom: 4,
    gap: 14,
  },
  // Redesigned card styles
  phraseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  languageContainer: {
    flex: 1,
  },
  phraseLanguage: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
    marginBottom: 4,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  contextText: {
    fontSize: 10,
    color: "#6B7280",
    marginLeft: 3,
  },
  saveButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  phraseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    lineHeight: 22,
  },
  phraseTranslation: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 10,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  pronunciationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  pronunciationButtonText: {
    fontSize: 12,
    color: "#0284C7",
    fontWeight: "500",
    marginRight: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0284C7",
    justifyContent: "center",
    alignItems: "center",
  },
  pronunciationContainer: {
    backgroundColor: "#F0F9FF",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  pronunciationText: {
    fontSize: 12,
    color: "#1F2937",
    fontStyle: "italic",
    lineHeight: 18,
  },
  viewAllPhrasesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FF",
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewAllPhrasesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0284C7",
    marginRight: 4,
  },
});

export default LanguageAssistant;

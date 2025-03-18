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

interface LanguageAssistantProps {
  visitedPlaces: any[];
  cardAnimation: Animated.Value;
}

const LanguageAssistant: React.FC<LanguageAssistantProps> = ({ visitedPlaces, cardAnimation }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handlePlayPhrase = (phrase: string) => {
    // In a real app, this would play audio of the phrase
    console.log("Playing phrase:", phrase);
    // Mock implementation - would connect to text-to-speech service
    alert(`Playing: "${phrase}"`);
  };

  const navigateToPhrasebook = () => {
    navigation.navigate("Phrasebook", {
      visitedPlaces,
    });
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
          // components/Learn/LanguageAssistant.tsx (continued)
          contentContainerStyle={styles.phrasesContentContainer}
        >
          {phrases.map((phrase, index) => (
            <View key={index} style={styles.enhancedPhraseCard}>
              <Text style={styles.phraseLanguage}>{phrase.language}</Text>
              <Text style={styles.phraseText}>{phrase.phrase}</Text>
              <Text style={styles.phraseTranslation}>{phrase.translation}</Text>
              <Text style={styles.phraseContext}>{phrase.useContext}</Text>
              <View style={styles.pronunciationContainer}>
                <Text style={styles.pronunciationLabel}>Pronunciation:</Text>
                <Text style={styles.pronunciationText}>{phrase.pronunciation}</Text>
              </View>
              <TouchableOpacity
                style={styles.playPhraseButton}
                onPress={() => handlePlayPhrase(phrase.phrase)}
              >
                <Ionicons name="volume-high" size={16} color="#0284C7" />
              </TouchableOpacity>

              {/* Add heart icon for saving directly from the preview */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => toggleFavoritePhrase(phrase.id!, phrase.isFavorite || false, phrase)}
              >
                <Ionicons
                  name={phrase.isFavorite ? "heart" : "heart-outline"}
                  size={16}
                  color={phrase.isFavorite ? "#EF4444" : "#9CA3AF"}
                />
              </TouchableOpacity>
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
  saveButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
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
  enhancedPhraseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: "relative",
  },
  phraseLanguage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
    marginBottom: 6,
  },
  phraseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  phraseTranslation: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  phraseContext: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginBottom: 10,
  },
  pronunciationContainer: {
    backgroundColor: "#F0F9FF",
    padding: 8,
    borderRadius: 8,
    marginBottom: 28,
  },
  pronunciationLabel: {
    fontSize: 10,
    color: "#0284C7",
    marginBottom: 2,
  },
  pronunciationText: {
    fontSize: 12,
    color: "#1F2937",
    fontStyle: "italic",
  },
  playPhraseButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
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

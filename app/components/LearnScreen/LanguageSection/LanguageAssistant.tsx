// components/Learn/LanguageAssistant.tsx
import React, { useState, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/types";
import { Phrase } from "../../../types/LearnScreen/LanguageTypes";
import {
  getLanguagePhrases,
  createMockPhrases,
  toggleFavoritePhrase,
} from "../../../services/LearnScreen/aiLanguageService";
import useTextToSpeech from "../../../hooks/AI/useTextToSpeech";

import LanguageAssistantHeader from "./LanguageAssistantHeader";
import LanguageAssistantLoading from "./LanguageAssistantLoading";
import LanguageAssistantError from "./LanguageAssistantLoading";
import PhraseFeed from "./PhraseFeed";
import ViewAllButton from "./ViewAllButton";

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
      <LanguageAssistantHeader />

      {loading ? (
        <LanguageAssistantLoading />
      ) : error ? (
        <LanguageAssistantError error={error} onRetry={fetchLanguagePhrases} />
      ) : (
        <PhraseFeed
          phrases={phrases}
          expandedCard={expandedCard}
          onToggleFavorite={handleToggleFavorite}
          onPlayPhrase={handlePlayPhrase}
          onToggleExpand={toggleExpand}
        />
      )}

      <ViewAllButton onPress={navigateToPhrasebook} />
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
});

export default LanguageAssistant;

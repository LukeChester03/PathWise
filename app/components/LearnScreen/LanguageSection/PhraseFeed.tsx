import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Phrase } from "../../../types/LearnScreen/LanguageTypes";
import PhraseCard from "./PhraseCard";

interface PhraseFeedProps {
  phrases: Phrase[];
  expandedCard: string | null;
  onToggleFavorite: (phrase: Phrase) => void;
  onPlayPhrase: (phrase: string, language: string) => void;
  onToggleExpand: (phraseId: string) => void;
}

const PhraseFeed: React.FC<PhraseFeedProps> = ({
  phrases,
  expandedCard,
  onToggleFavorite,
  onPlayPhrase,
  onToggleExpand,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.phrasesScrollView}
      contentContainerStyle={styles.phrasesContentContainer}
    >
      {phrases.map((phrase) => (
        <PhraseCard
          key={phrase.id}
          phrase={phrase}
          isExpanded={expandedCard === phrase.id}
          onToggleFavorite={onToggleFavorite}
          onPlayPhrase={onPlayPhrase}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  phrasesScrollView: {
    marginBottom: 12,
  },
  phrasesContentContainer: {
    paddingRight: 16,
    paddingBottom: 4,
    gap: 14,
  },
});

export default PhraseFeed;

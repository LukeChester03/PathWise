import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Phrase } from "../../../types/LearnScreen/LanguageTypes";

interface PhraseCardProps {
  phrase: Phrase;
  isExpanded: boolean;
  onToggleFavorite: (phrase: Phrase) => void;
  onPlayPhrase: (phrase: string, language: string) => void;
  onToggleExpand: (phraseId: string) => void;
}

const PhraseCard: React.FC<PhraseCardProps> = ({
  phrase,
  isExpanded,
  onToggleFavorite,
  onPlayPhrase,
  onToggleExpand,
}) => {
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
    <View style={styles.phraseCard}>
      <View style={styles.cardHeader}>
        <View style={styles.languageContainer}>
          <Text style={styles.phraseLanguage}>{phrase.language}</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={() => onToggleFavorite(phrase)}>
          <Ionicons
            name={phrase.isFavorite ? "heart" : "heart-outline"}
            size={18}
            color={phrase.isFavorite ? "#EF4444" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.phraseText}>{phrase.phrase}</Text>
      <Text style={styles.phraseTranslation}>{phrase.translation}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.pronunciationButton}
          onPress={() => onToggleExpand(phrase.id!)}
        >
          <Text style={styles.pronunciationButtonText}>
            {isExpanded ? "Hide" : "Pronunciation"}
          </Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#0284C7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => onPlayPhrase(phrase.phrase, phrase.language)}
        >
          <Ionicons name="volume-high" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {isExpanded && (
        <View style={styles.pronunciationContainer}>
          <Text style={styles.pronunciationText}>{phrase.pronunciation}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default PhraseCard;

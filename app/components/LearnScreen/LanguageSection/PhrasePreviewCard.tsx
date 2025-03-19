// components/PhrasePreviewCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Phrase } from "../../../types/LearnScreen/LanguageTypes";
import { Colors } from "../../../constants/colours";

interface PhrasePreviewCardProps {
  phrase: Phrase;
}

const PhrasePreviewCard: React.FC<PhrasePreviewCardProps> = ({ phrase }) => {
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
    <View style={styles.previewCard}>
      <View style={styles.previewCardHeader}>
        <View style={styles.previewCategoryContainer}>
          <Ionicons name={getCategoryIcon(phrase.useContext)} size={14} color={Colors.primary} />
          <Text style={styles.previewCategoryText}>{phrase.useContext}</Text>
        </View>
        <Text style={styles.previewLanguage}>{phrase.language}</Text>
      </View>
      <Text style={styles.previewPhrase}>{phrase.phrase}</Text>
      <Text style={styles.previewTranslation}>{phrase.translation}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  previewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  previewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  previewLanguage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  previewCategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewCategoryText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
  },
  previewPhrase: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  previewTranslation: {
    fontSize: 14,
    color: "#4B5563",
  },
});

export default PhrasePreviewCard;

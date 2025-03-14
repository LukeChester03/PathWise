// components/DidYouKnowSection.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";
import TruncatedText from "./TruncatedText";

// Constants for description truncation
const MAX_INSIGHT_CHARS = 80;

interface DidYouKnowSectionProps {
  aiContent: AiGeneratedContent | null;
  fontSize: {
    body: number;
  };
  iconSize: {
    normal: number;
  };
}

const DidYouKnowSection: React.FC<DidYouKnowSectionProps> = ({ aiContent, fontSize, iconSize }) => {
  const [showFullContent, setShowFullContent] = useState(false);

  if (aiContent?.isGenerating) {
    return (
      <View style={styles.aiGeneratingContainer}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.aiGeneratingText}>Finding interesting facts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.didYouKnowContainer}>
      {aiContent?.didYouKnow.slice(0, showFullContent ? undefined : 2).map((fact, index) => (
        <View key={index} style={styles.didYouKnowItem}>
          <Ionicons
            name="information-circle"
            size={iconSize.normal}
            color={Colors.primary}
            style={styles.didYouKnowIcon}
          />
          <TruncatedText
            text={fact}
            maxChars={MAX_INSIGHT_CHARS}
            style={[styles.didYouKnowText, { fontSize: fontSize.body }]}
          />
        </View>
      ))}

      {!showFullContent && aiContent?.didYouKnow.length > 2 && (
        <TouchableOpacity
          style={styles.seeMoreButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowFullContent(true);
          }}
        >
          <Text style={styles.seeMoreText}>Show more facts</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  aiGeneratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  aiGeneratingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#777",
  },
  didYouKnowContainer: {
    marginTop: 6,
  },
  didYouKnowItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#f1f7ff",
    padding: 24,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  didYouKnowIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  didYouKnowText: {
    color: "#444",
    flex: 1,
    lineHeight: 20,
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    marginTop: 4,
  },
  seeMoreText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginRight: 4,
  },
});

export default DidYouKnowSection;

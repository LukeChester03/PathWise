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
import { Colors, NeutralColors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";
import TruncatedText from "./TruncatedText";

// Constants for truncation
const MAX_INSIGHT_CHARS = 100;

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

  if (!aiContent?.didYouKnow || aiContent.didYouKnow.length === 0) {
    return null;
  }

  // Decide how many facts to show
  const factsToShow = showFullContent ? aiContent.didYouKnow : aiContent.didYouKnow.slice(0, 2);

  const toggleContent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFullContent(!showFullContent);
  };

  return (
    <View style={styles.didYouKnowContainer}>
      {factsToShow.map((fact, index) => (
        <View key={index} style={styles.didYouKnowItem}>
          <TruncatedText
            text={fact}
            maxChars={MAX_INSIGHT_CHARS}
            style={[styles.didYouKnowText, { fontSize: fontSize.body }]}
          />
        </View>
      ))}

      {aiContent.didYouKnow.length > 2 && (
        <TouchableOpacity style={styles.seeMoreButton} onPress={toggleContent}>
          <Text style={styles.seeMoreText}>
            {showFullContent ? "Show fewer facts" : "Show more facts"}
          </Text>
          <Ionicons
            name={showFullContent ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.primary}
          />
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
    paddingVertical: 4,
  },
  didYouKnowItem: {
    marginBottom: 12,
    backgroundColor: "#f6f6f8",
    padding: 14,
    borderRadius: 10,
  },
  didYouKnowText: {
    color: Colors.text,
    flex: 1,
    lineHeight: 22,
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginTop: 4,
  },
  seeMoreText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
    marginRight: 4,
  },
});

export default DidYouKnowSection;

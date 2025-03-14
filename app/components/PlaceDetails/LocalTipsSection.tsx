// components/LocalTipsSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";
import TruncatedText from "./TruncatedText";

// Constants for truncation
const MAX_INSIGHT_CHARS = 80;

interface LocalTipsSectionProps {
  aiContent: AiGeneratedContent | null;
  fontSize: {
    body: number;
  };
}

const LocalTipsSection: React.FC<LocalTipsSectionProps> = ({ aiContent, fontSize }) => {
  if (!aiContent || !aiContent.localTips || aiContent.localTips.length === 0) {
    return null;
  }

  return (
    <View style={styles.localTipsContainer}>
      {aiContent.localTips.map((tip, index) => (
        <View key={index} style={styles.localTipItem}>
          <View style={styles.tipNumberContainer}>
            <Text style={styles.tipNumberText}>{index + 1}</Text>
          </View>
          <TruncatedText
            text={tip}
            maxChars={MAX_INSIGHT_CHARS}
            style={[styles.localTipText, { fontSize: fontSize.body }]}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  localTipsContainer: {
    marginTop: 6,
  },
  localTipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tipNumberContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 1,
  },
  tipNumberText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  localTipText: {
    flex: 1,
    color: "#444",
    lineHeight: 20,
  },
});

export default LocalTipsSection;

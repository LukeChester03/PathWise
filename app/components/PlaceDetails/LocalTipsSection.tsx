// components/LocalTipsSection.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { AiGeneratedContent } from "../../services/Gemini/placeAiService";
import TruncatedText from "./TruncatedText";

// Constants for truncation
const MAX_INSIGHT_CHARS = 120; // Increased for better readability

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
        <View
          key={index}
          style={[
            styles.localTipItem,
            // Remove bottom border from last item
            index === aiContent.localTips.length - 1 && styles.lastItem,
          ]}
        >
          <View style={styles.tipNumberContainer}>
            <Text style={styles.tipNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.tipContentContainer}>
            <TruncatedText
              text={tip}
              maxChars={MAX_INSIGHT_CHARS}
              style={[styles.localTipText, { fontSize: fontSize.body }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  localTipsContainer: {
    paddingVertical: 4,
  },
  localTipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray200,
  },
  lastItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  tipNumberContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  tipContentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  localTipText: {
    flex: 1,
    color: Colors.text,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
});

export default LocalTipsSection;

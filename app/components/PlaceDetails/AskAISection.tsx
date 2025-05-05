import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colours";
import TruncatedText from "./TruncatedText";
import { askAboutPlace } from "../../services/Gemini/placeAiService";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

interface AskAiSectionProps {
  placeDetails: Place | VisitedPlaceDetails;
  fontSize: {
    body: number;
    small: number;
    smaller: number;
  };
  iconSize: {
    small: number;
    smaller: number;
  };
  isSmallScreen: boolean;
}

const AskAiSection: React.FC<AskAiSectionProps> = ({
  placeDetails,
  fontSize,
  iconSize,
  isSmallScreen,
}) => {
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  // Function to handle asking a question to AI
  const handleAskAiQuestion = async () => {
    if (!aiQuestion.trim() || !placeDetails) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGeneratingAnswer(true);
    setAiAnswer("");

    try {
      const answer = await askAboutPlace(placeDetails, aiQuestion);
      setAiAnswer(answer);
    } catch (error) {
      console.error("Error asking AI question:", error);
      setAiAnswer(
        "I'm sorry, I couldn't process your question at the moment. Please try again later."
      );
    } finally {
      setIsGeneratingAnswer(false);
      setAiQuestion("");
    }
  };

  return (
    <View>
      <View style={styles.askAiInputContainer}>
        <TextInput
          style={[styles.askAiInput, { fontSize: fontSize.body }]}
          placeholder="e.g. What's the best time to visit?"
          placeholderTextColor="#999"
          value={aiQuestion}
          onChangeText={setAiQuestion}
          onSubmitEditing={handleAskAiQuestion}
        />
        <TouchableOpacity
          style={[
            styles.askAiButton,
            !aiQuestion.trim() ? styles.askAiButtonDisabled : {},
            { width: isSmallScreen ? 34 : 38, height: isSmallScreen ? 34 : 38 },
          ]}
          onPress={handleAskAiQuestion}
          disabled={!aiQuestion.trim() || isGeneratingAnswer}
          activeOpacity={0.8}
        >
          {isGeneratingAnswer ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={iconSize.small} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {aiAnswer && (
        <View style={styles.aiAnswerContainer}>
          <View style={styles.aiAnswerIconContainer}>
            <Ionicons name="sparkles" size={iconSize.smaller} color="#fff" />
          </View>
          <View style={styles.aiAnswerContent}>
            <TruncatedText
              text={aiAnswer}
              maxChars={120}
              style={[styles.aiAnswerText, { fontSize: fontSize.body }]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  askAiInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  askAiInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#333",
    marginRight: 8,
  },
  askAiButton: {
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  askAiButtonDisabled: {
    backgroundColor: "#ccc",
  },
  aiAnswerContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f7ff",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  aiAnswerIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  aiAnswerContent: {
    flex: 1,
  },
  aiAnswerText: {
    color: "#444",
    lineHeight: 20,
  },
});

export default AskAiSection;

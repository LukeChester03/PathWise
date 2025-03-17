// hooks/useAiContent.ts
import { useState, useEffect } from "react";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";
import {
  AiGeneratedContent,
  fetchAllAiContentWithContext,
} from "../../services/Gemini/placeAiService";

export const useAiContent = (placeDetails: Place | VisitedPlaceDetails | null) => {
  const [aiContent, setAiContent] = useState<AiGeneratedContent | null>(null);
  const [aiContentLoading, setAiContentLoading] = useState(false);
  const [aiContentError, setAiContentError] = useState<string | null>(null);
  const [sectionsVisible, setSectionsVisible] = useState(false);

  // Effect for AI content generation
  useEffect(() => {
    if (placeDetails && !aiContent && !aiContentLoading) {
      generateAiContent();
    }
  }, [placeDetails]);

  const generateAiContent = async () => {
    if (!placeDetails) return;

    setAiContentLoading(true);
    setAiContentError(null);

    try {
      // Mark that AI is generating content
      setAiContent({
        description: "",
        historicalFacts: [],
        culturalInsights: [],
        didYouKnow: [],
        localTips: [],
        isGenerating: true,
      });

      // Use the enhanced version with location context
      const content = await fetchAllAiContentWithContext(placeDetails);
      setAiContent(content);

      // Show sections after AI content is loaded
      setTimeout(() => {
        setSectionsVisible(true);
      }, 300);
    } catch (error) {
      console.error("Error generating AI content:", error);
      setAiContentError("Failed to generate AI content. Tap to retry.");
    } finally {
      setAiContentLoading(false);
    }
  };

  return {
    aiContent,
    aiContentLoading,
    aiContentError,
    sectionsVisible,
    generateAiContent,
  };
};

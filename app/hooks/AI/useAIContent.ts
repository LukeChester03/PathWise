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
      setAiContent({
        description: "",
        historicalFacts: [],
        culturalInsights: [],
        didYouKnow: [],
        localTips: [],
        isGenerating: true,
      });

      const content = await fetchAllAiContentWithContext(placeDetails);
      setAiContent(content);

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

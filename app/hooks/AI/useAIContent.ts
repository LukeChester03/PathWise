// hooks/AI/useAIContent.ts
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
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false); // New state for initial loading

  // Effect for AI content generation
  useEffect(() => {
    if (placeDetails && !aiContent && !aiContentLoading) {
      setInitialLoading(true); // Set initial loading to true when first generating content
      generateAiContent();
    }
  }, [placeDetails]);

  const generateAiContent = async () => {
    if (!placeDetails) return;

    setAiContentLoading(true);
    setAiContentError(null);
    setServiceUnavailable(false);

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

      // Check if there was a service error
      if (content.serviceError?.isError) {
        setServiceUnavailable(true);
      }

      // Show sections after AI content is loaded
      setTimeout(() => {
        setSectionsVisible(true);
      }, 300);
    } catch (error) {
      console.error("Error generating AI content:", error);
      setAiContentError("Failed to generate AI content. Tap to retry.");
      setServiceUnavailable(true);
    } finally {
      setAiContentLoading(false);
      setInitialLoading(false); // Always set initial loading to false when done
    }
  };

  return {
    aiContent,
    aiContentLoading,
    aiContentError,
    sectionsVisible,
    serviceUnavailable,
    initialLoading, // Expose initial loading state
    generateAiContent,
  };
};

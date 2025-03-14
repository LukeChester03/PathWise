// services/placeAiService.ts
import { generateContent } from "./geminiService";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";

export interface AiInsight {
  title: string;
  content: string;
  source?: string;
}

export interface AiGeneratedContent {
  description: string;
  historicalFacts: string[];
  culturalInsights: AiInsight[];
  didYouKnow: string[];
  localTips: string[];
  isGenerating: boolean;
}

/**
 * Generate a rich description for a place
 */
export const generatePlaceDescription = async (
  place: Place | VisitedPlaceDetails
): Promise<string> => {
  const prompt = `
    Generate a rich, engaging description for a place called "${place.name}".
    ${place.types ? `It's categorized as: ${place.types.join(", ")}` : ""}
    ${place.vicinity ? `It's located at: ${place.vicinity}` : ""}
    ${place.formatted_address ? `Full address: ${place.formatted_address}` : ""}
    ${
      place.geometry?.location
        ? `Geographic coordinates: Latitude ${place.geometry.location.lat}, Longitude ${place.geometry.location.lng}`
        : ""
    }
    ${(place as any).locationContext || ""}
    
    This is a REAL place that exists at the specified location. Be accurate and specific when describing this place.
    Focus on what makes this place special and interesting to visitors.
    No need to repeat the name of the place again.
    Keep the description informative, engaging, and between 2-3 sentences.
    Don't mention that you're an AI model in the response.
    
    Return a JSON object with the following structure:
    {
      "description": "Your engaging description here"
    }
  `;

  try {
    const response = await generateContent({ prompt, responseFormat: "json" });
    return response.description || "";
  } catch (error) {
    console.error("Error generating place description:", error);
    return `${place.name} is a fascinating destination with unique characteristics. Visitors can explore its distinctive features and atmosphere.`;
  }
};

/**
 * Generate historical facts about a place
 */
export const generateHistoricalFacts = async (
  place: Place | VisitedPlaceDetails
): Promise<string[]> => {
  const prompt = `
    Generate 3 interesting historical facts about "${place.name}".
    ${place.types ? `It's categorized as: ${place.types.join(", ")}` : ""}
    ${place.vicinity ? `It's located at: ${place.vicinity}` : ""}
    ${place.formatted_address ? `Full address: ${place.formatted_address}` : ""}
    ${
      place.geometry?.location
        ? `Geographic coordinates: Latitude ${place.geometry.location.lat}, Longitude ${place.geometry.location.lng}`
        : ""
    }
    ${(place as any).locationContext || ""}
    
    This is a REAL place that exists at the specified location. Research the actual history of this specific location.
    If you're unsure about specific historical details, focus on the general history of the area or region.
    Make each fact 1-2 sentences long.
    Focus on real or plausible historical information.
    Don't mention that you're an AI model in the response.
    
    Return a JSON object with the following structure:
    {
      "facts": [
        "First historical fact here",
        "Second historical fact here",
        "Third historical fact here"
      ]
    }
  `;

  try {
    const response = await generateContent({ prompt, responseFormat: "json" });
    return response.facts || [];
  } catch (error) {
    console.error("Error generating historical facts:", error);
    return [
      `${place.name} has a fascinating history dating back many years.`,
      `The area around ${place.name} has changed significantly over time.`,
      `Historical records about ${place.name} reveal interesting insights about local development.`,
    ];
  }
};

/**
 * Generate cultural insights about a place
 */
export const generateCulturalInsights = async (
  place: Place | VisitedPlaceDetails
): Promise<AiInsight[]> => {
  const prompt = `
    Generate 2 cultural insights about "${place.name}".
    ${place.types ? `It's categorized as: ${place.types.join(", ")}` : ""}
    ${place.vicinity ? `It's located at: ${place.vicinity}` : ""}
    ${place.formatted_address ? `Full address: ${place.formatted_address}` : ""}
    ${
      place.geometry?.location
        ? `Geographic coordinates: Latitude ${place.geometry.location.lat}, Longitude ${place.geometry.location.lng}`
        : ""
    }
    ${(place as any).locationContext || ""}
    
    This is a REAL place that exists at the specified location. Provide accurate cultural context for this specific place.
    Consider the local community, traditions, architectural style, or cultural significance of this exact location.
    Don't mention that you're an AI model in the response.
    
    Return a JSON object with the following structure:
    {
      "insights": [
        {
          "title": "Brief title for the first insight",
          "content": "1-2 sentence insight about the cultural aspect"
        },
        {
          "title": "Brief title for the second insight",
          "content": "1-2 sentence insight about the cultural aspect"
        }
      ]
    }
  `;

  try {
    const response = await generateContent({ prompt, responseFormat: "json" });
    return response.insights || [];
  } catch (error) {
    console.error("Error generating cultural insights:", error);
    return [
      {
        title: "Local Traditions",
        content: `The community around ${place.name} celebrates unique cultural traditions.`,
      },
      {
        title: "Cultural Significance",
        content: `${place.name} holds special cultural significance to the local community.`,
      },
    ];
  }
};

/**
 * Generate "Did You Know" facts about a place
 */
export const generateDidYouKnow = async (place: Place | VisitedPlaceDetails): Promise<string[]> => {
  const prompt = `
    Generate up to 3 interesting "Did You Know" facts about "${place.name}".
    ${place.types ? `It's categorized as: ${place.types.join(", ")}` : ""}
    ${place.vicinity ? `It's located at: ${place.vicinity}` : ""}
    ${place.formatted_address ? `Full address: ${place.formatted_address}` : ""}
    ${
      place.geometry?.location
        ? `Geographic coordinates: Latitude ${place.geometry.location.lat}, Longitude ${place.geometry.location.lng}`
        : ""
    }
    ${(place as any).locationContext || ""}
    
    This is a REAL place that exists at the specified location. Look for accurate but lesser-known information.
    These should be surprising, lesser-known, or interesting tidbits that would fascinate visitors.
    Consider unique features, little-known history, interesting statistics, or unexpected connections.
    Each fact should be 1-2 sentences long.
    Don't start each fact with "Did you know" - just provide the facts directly.
    Only provide these facts if you are fully confident that they are accurate and real.
    Don't mention that you're an AI model in the response.
    
    Return a JSON object with the following structure:
    {
      "facts": [
        "First interesting fact here",
        "Second interesting fact here",
        "Third interesting fact here"
      ]
    }
  `;

  try {
    const response = await generateContent({ prompt, responseFormat: "json" });
    return response.facts || [];
  } catch (error) {
    console.error("Error generating did you know facts:", error);
    return [
      `${place.name} has several unique features that many visitors overlook.`,
      `There are interesting patterns in how people interact with ${place.name}.`,
      `${place.name} has unexpected connections to other notable locations.`,
    ];
  }
};

/**
 * Generate local tips about a place
 */
export const generateLocalTips = async (place: Place | VisitedPlaceDetails): Promise<string[]> => {
  const prompt = `
    Generate up to 3 practical tips for visitors to "${place.name}".
    ${place.types ? `It's categorized as: ${place.types.join(", ")}` : ""}
    ${place.vicinity ? `It's located at: ${place.vicinity}` : ""}
    ${place.formatted_address ? `Full address: ${place.formatted_address}` : ""}
    ${
      place.geometry?.location
        ? `Geographic coordinates: Latitude ${place.geometry.location.lat}, Longitude ${place.geometry.location.lng}`
        : ""
    }
    ${
      place.opening_hours?.weekday_text
        ? `Opening hours: ${place.opening_hours.weekday_text.join(", ")}`
        : ""
    }
    ${place.price_level !== undefined ? `Price level: ${place.price_level}/4` : ""}
    ${(place as any).locationContext || ""}
    
    This is a REAL place that exists at the specified location. Provide accurate visitor tips.
    Consider actual local knowledge such as best times to visit, how to avoid crowds, what features to look for, 
    or how locals typically experience this place.
    
    These tips should be helpful for visitors to make the most of their experience.
    Each tip should be 1-2 sentences long. Only provide tips if you are confident in your response.
    Focus on practical advice about timing, features to notice, or how to best experience the place.
    Don't mention that you're an AI model in the response.
    
    Return a JSON object with the following structure:
    {
      "tips": [
        "First practical tip here",
        "Second practical tip here",
        "Third practical tip here"
      ]
    }
  `;

  try {
    const response = await generateContent({ prompt, responseFormat: "json" });
    return response.tips || [];
  } catch (error) {
    console.error("Error generating local tips:", error);
    return [
      `Visit ${place.name} early in the morning to avoid crowds.`,
      `Take time to explore the less obvious features of ${place.name}.`,
      `If possible, visit ${place.name} during weekdays for a more relaxed experience.`,
    ];
  }
};

/**
 * Generate an answer to a specific question about a place
 */
export const askAboutPlace = async (
  place: Place | VisitedPlaceDetails,
  question: string
): Promise<string> => {
  const prompt = `
    Answer the following question about "${place.name}":
    "${question}"
    
    ${place.types ? `The place is categorized as: ${place.types.join(", ")}` : ""}
    ${place.vicinity ? `It's located at: ${place.vicinity}` : ""}
    ${place.formatted_address ? `Full address: ${place.formatted_address}` : ""}
    ${
      place.geometry?.location
        ? `Geographic coordinates: Latitude ${place.geometry.location.lat}, Longitude ${place.geometry.location.lng}`
        : ""
    }
    ${
      place.opening_hours?.weekday_text
        ? `Opening hours: ${place.opening_hours.weekday_text.join(", ")}`
        : ""
    }
    ${place.price_level !== undefined ? `Price level: ${place.price_level}/4` : ""}
    ${
      place.rating !== undefined
        ? `Rating: ${place.rating}/5 from ${place.user_ratings_total || "unknown"} reviews`
        : ""
    }
    ${place.website ? `Website: ${place.website}` : ""}
    ${(place as any).locationContext || ""}
    
    This is a REAL place that exists at the specified location. Answer the question based on this specific place.
    Research accurate information about this exact location to answer the question.
    
    Provide a helpful, informative answer in 2-3 sentences.
    If you don't have specific information, provide a reasonable and plausible response based on what you know about the location, place type, and geographic context.
    If the question is not related to ${
      place.name
    }, respond with "I can only answer questions about ${place.name}".
    Don't mention that you're an AI model in the response.
    
    Return a JSON object with the following structure:
    {
      "answer": "Your helpful response here"
    }
  `;

  try {
    const response = await generateContent({ prompt, responseFormat: "json" });
    return response.answer || "";
  } catch (error) {
    console.error("Error generating answer to question:", error);
    return `Based on what's typically known about places like ${place.name}, I can offer some insights on your question about ${question}. While specific details may vary, this type of location often has characteristics that would address your query.`;
  }
};

/**
 * Fetch additional geographical context for a place to enhance AI responses
 * This helps the AI understand the broader context of where the place is located
 */
export const getLocationContext = async (place: Place | VisitedPlaceDetails): Promise<string> => {
  if (!place.geometry?.location) {
    return "";
  }

  const { lat, lng } = place.geometry.location;
  let context = "";

  // Extract city, region, country from available address information
  if (place.formatted_address) {
    const addressParts = place.formatted_address.split(",").map((part) => part.trim());
    if (addressParts.length >= 2) {
      // Assume last parts are country, region, etc.
      context += `The place is located in ${addressParts.slice(-3).join(", ")}.`;
    }
  } else if (place.vicinity) {
    context += `The place is in the vicinity of ${place.vicinity}.`;
  }

  return context;
};

/**
 * Fetch all AI content for a place in parallel
 */
export const fetchAllAiContent = async (
  place: Place | VisitedPlaceDetails
): Promise<AiGeneratedContent> => {
  try {
    // Start all requests in parallel
    const [description, historicalFacts, culturalInsights, didYouKnow, localTips] =
      await Promise.all([
        generatePlaceDescription(place),
        generateHistoricalFacts(place),
        generateCulturalInsights(place),
        generateDidYouKnow(place),
        generateLocalTips(place),
      ]);

    return {
      description,
      historicalFacts,
      culturalInsights,
      didYouKnow,
      localTips,
      isGenerating: false,
    };
  } catch (error) {
    console.error("Error fetching all AI content:", error);
    // Return fallback content
    return {
      description: `${place.name} is a fascinating destination with unique characteristics.`,
      historicalFacts: [
        `${place.name} has an interesting history.`,
        `The area around ${place.name} has evolved over time.`,
        `Historical records show ${place.name} has cultural significance.`,
      ],
      culturalInsights: [
        {
          title: "Local Culture",
          content: `${place.name} is important to the local cultural landscape.`,
        },
        {
          title: "Visitor Experience",
          content: `Visitors to ${place.name} often note its distinctive atmosphere.`,
        },
      ],
      didYouKnow: [
        `${place.name} has unique features worth exploring.`,
        `Visitors often discover unexpected aspects of ${place.name}.`,
        `${place.name} connects to the broader community in interesting ways.`,
      ],
      localTips: [
        `Visit ${place.name} during optimal hours for the best experience.`,
        `Take time to notice the details that make ${place.name} special.`,
        `Consider exploring the area around ${place.name} as well.`,
      ],
      isGenerating: false,
    };
  }
};

/**
 * Enhanced version of fetchAllAiContent that includes location context
 */
export const fetchAllAiContentWithContext = async (
  place: Place | VisitedPlaceDetails
): Promise<AiGeneratedContent> => {
  try {
    // Get additional location context
    const locationContext = await getLocationContext(place);

    // Add the location context to the place object for AI prompts
    const enhancedPlace = {
      ...place,
      locationContext,
    };

    // Start all requests in parallel
    const [description, historicalFacts, culturalInsights, didYouKnow, localTips] =
      await Promise.all([
        generatePlaceDescription(enhancedPlace as any),
        generateHistoricalFacts(enhancedPlace as any),
        generateCulturalInsights(enhancedPlace as any),
        generateDidYouKnow(enhancedPlace as any),
        generateLocalTips(enhancedPlace as any),
      ]);

    return {
      description,
      historicalFacts,
      culturalInsights,
      didYouKnow,
      localTips,
      isGenerating: false,
    };
  } catch (error) {
    console.error("Error fetching all AI content:", error);
    // Return fallback content
    return {
      description: `${place.name} is a fascinating destination with unique characteristics.`,
      historicalFacts: [
        `${place.name} has an interesting history.`,
        `The area around ${place.name} has evolved over time.`,
        `Historical records show ${place.name} has cultural significance.`,
      ],
      culturalInsights: [
        {
          title: "Local Culture",
          content: `${place.name} is important to the local cultural landscape.`,
        },
        {
          title: "Visitor Experience",
          content: `Visitors to ${place.name} often note its distinctive atmosphere.`,
        },
      ],
      didYouKnow: [
        `${place.name} has unique features worth exploring.`,
        `Visitors often discover unexpected aspects of ${place.name}.`,
        `${place.name} connects to the broader community in interesting ways.`,
      ],
      localTips: [
        `Visit ${place.name} during optimal hours for the best experience.`,
        `Take time to notice the details that make ${place.name} special.`,
        `Consider exploring the area around ${place.name} as well.`,
      ],
      isGenerating: false,
    };
  }
};

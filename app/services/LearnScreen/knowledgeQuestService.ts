// services/LearnScreen/knowledgeQuestService.ts
import { generateContent } from "../Gemini/geminiService";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  where,
  Timestamp,
  updateDoc,
  limit,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../config/firebaseConfig";
import {
  Quiz,
  QuizQuestion,
  QuizSession,
  QuizResult,
  KnowledgeQuestStats,
  KnowledgeQuestSettings,
} from "../../types/LearnScreen/KnowledgeQuestTypes";
import { VisitedPlaceDetails } from "../../types/MapTypes";
import { fetchUserVisitedPlaces } from "./travelProfileService";
import { getAllUserBadges, updateBadgeRequirements, completeBadge } from "./badgeService";

// Constants
const CACHE_EXPIRY_DAYS = 30;
const QUIZ_CACHE_PREFIX = "@knowledge_quest:quiz:";
const QUIZ_RESULTS_CACHE_PREFIX = "@knowledge_quest:results:";
const QUEST_STATS_CACHE_KEY = "@knowledge_quest:stats";
const QUEST_SETTINGS_CACHE_KEY = "@knowledge_quest:settings";
const MAX_QUIZZES_PER_REGION = 3;
const DEFAULT_QUESTIONS_PER_QUIZ = 5;
const QUIZZES_TO_CACHE = 10;

// In-memory cache
const quizCache: Map<string, Quiz> = new Map();
const quizResultsCache: Map<string, QuizResult[]> = new Map();
let statsCache: KnowledgeQuestStats | null = null;
let settingsCache: KnowledgeQuestSettings | null = null;

/**
 * Interface for region context to improve disambiguation
 */
interface RegionContext {
  name: string; // The region name
  country?: string; // Country where the region is located, if available
  placeType?: string; // Type of place: city, state, landmark, etc.
  coordinates?: {
    // Geographical coordinates if available
    lat: number;
    lng: number;
  };
  formattedAddress?: string; // Full formatted address if available
}

/**
 * Initialize Knowledge Quest service with required settings and cache
 */
export const initializeKnowledgeQuest = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot initialize Knowledge Quest: No authenticated user");
      return;
    }

    // Get settings - this will create default settings if none exist
    await getKnowledgeQuestSettings();

    // Get stats - this will create default stats if none exist
    await getKnowledgeQuestStats();

    // Check if we need to refresh quizzes
    const settings = await getKnowledgeQuestSettings();
    const lastRefreshed = settings.lastRefreshedAt;
    const now = Date.now();
    const daysSinceRefresh = (now - lastRefreshed) / (1000 * 60 * 60 * 24);

    if (daysSinceRefresh >= settings.cacheExpiryDays) {
      console.log("Knowledge Quest quizzes need refreshing");
      await refreshQuizzes();
    } else {
      console.log(
        `Knowledge Quest quizzes are up to date. Last refreshed ${daysSinceRefresh.toFixed(
          1
        )} days ago`
      );
    }
  } catch (error) {
    console.error("Error initializing Knowledge Quest:", error);
  }
};

/**
 * Get Knowledge Quest settings with multi-level caching
 */
export const getKnowledgeQuestSettings = async (): Promise<KnowledgeQuestSettings> => {
  try {
    // Check memory cache first
    if (settingsCache) {
      return { ...settingsCache };
    }

    // Try AsyncStorage next
    try {
      const cachedSettings = await AsyncStorage.getItem(QUEST_SETTINGS_CACHE_KEY);
      if (cachedSettings) {
        const settings = JSON.parse(cachedSettings) as KnowledgeQuestSettings;
        settingsCache = settings;
        return { ...settings };
      }
    } catch (asyncError) {
      console.warn("Error reading Knowledge Quest settings from AsyncStorage:", asyncError);
    }

    // Finally try Firebase
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const defaultSettings = getDefaultSettings();
      settingsCache = defaultSettings;
      return { ...defaultSettings };
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "knowledgeQuest");
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      const settings = settingsDoc.data() as KnowledgeQuestSettings;

      // Cache in memory and AsyncStorage
      settingsCache = settings;
      await AsyncStorage.setItem(QUEST_SETTINGS_CACHE_KEY, JSON.stringify(settings));

      return { ...settings };
    } else {
      // Create default settings
      const defaultSettings = getDefaultSettings();
      await setDoc(settingsRef, defaultSettings);

      // Cache in memory and AsyncStorage
      settingsCache = defaultSettings;
      await AsyncStorage.setItem(QUEST_SETTINGS_CACHE_KEY, JSON.stringify(defaultSettings));

      return { ...defaultSettings };
    }
  } catch (error) {
    console.error("Error getting Knowledge Quest settings:", error);
    const defaultSettings = getDefaultSettings();
    return { ...defaultSettings };
  }
};

/**
 * Update Knowledge Quest settings with multi-level caching
 */
export const updateKnowledgeQuestSettings = async (
  settings: Partial<KnowledgeQuestSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update settings: No authenticated user");
      return;
    }

    // Update Firebase
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "knowledgeQuest");
    await setDoc(settingsRef, settings, { merge: true });

    // Get current settings to update memory and AsyncStorage caches
    const currentSettings = await getKnowledgeQuestSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    // Update memory cache
    settingsCache = updatedSettings;

    // Update AsyncStorage
    await AsyncStorage.setItem(QUEST_SETTINGS_CACHE_KEY, JSON.stringify(updatedSettings));

    console.log("Knowledge Quest settings updated successfully");
  } catch (error) {
    console.error("Error updating Knowledge Quest settings:", error);
  }
};

/**
 * Get Knowledge Quest statistics with multi-level caching
 */
export const getKnowledgeQuestStats = async (): Promise<KnowledgeQuestStats> => {
  try {
    // Check memory cache first
    if (statsCache) {
      return { ...statsCache };
    }

    // Try AsyncStorage next
    try {
      const cachedStats = await AsyncStorage.getItem(QUEST_STATS_CACHE_KEY);
      if (cachedStats) {
        const stats = JSON.parse(cachedStats) as KnowledgeQuestStats;
        statsCache = stats;
        return { ...stats };
      }
    } catch (asyncError) {
      console.warn("Error reading Knowledge Quest stats from AsyncStorage:", asyncError);
    }

    // Finally try Firebase
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const defaultStats = getDefaultStats();
      statsCache = defaultStats;
      return { ...defaultStats };
    }

    const statsRef = doc(db, "users", currentUser.uid, "stats", "knowledgeQuest");
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
      const stats = statsDoc.data() as KnowledgeQuestStats;

      // Cache in memory and AsyncStorage
      statsCache = stats;
      await AsyncStorage.setItem(QUEST_STATS_CACHE_KEY, JSON.stringify(stats));

      return { ...stats };
    } else {
      // Create default stats
      const defaultStats = getDefaultStats();
      await setDoc(statsRef, defaultStats);

      // Cache in memory and AsyncStorage
      statsCache = defaultStats;
      await AsyncStorage.setItem(QUEST_STATS_CACHE_KEY, JSON.stringify(defaultStats));

      return { ...defaultStats };
    }
  } catch (error) {
    console.error("Error getting Knowledge Quest stats:", error);
    const defaultStats = getDefaultStats();
    return { ...defaultStats };
  }
};

/**
 * Update Knowledge Quest statistics with multi-level caching
 */
export const updateKnowledgeQuestStats = async (
  stats: Partial<KnowledgeQuestStats>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update stats: No authenticated user");
      return;
    }

    // Update Firebase
    const statsRef = doc(db, "users", currentUser.uid, "stats", "knowledgeQuest");
    await setDoc(statsRef, stats, { merge: true });

    // Get current stats to update memory and AsyncStorage caches
    const currentStats = await getKnowledgeQuestStats();
    const updatedStats = { ...currentStats, ...stats };

    // Update memory cache
    statsCache = updatedStats;

    // Update AsyncStorage
    await AsyncStorage.setItem(QUEST_STATS_CACHE_KEY, JSON.stringify(updatedStats));

    console.log("Knowledge Quest stats updated successfully");
  } catch (error) {
    console.error("Error updating Knowledge Quest stats:", error);
  }
};

/**
 * Get available quizzes for a user with multi-level caching
 */
export const getAvailableQuizzes = async (limitCount = 10): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get quizzes: No authenticated user");
      return [];
    }

    // Check if we have any in memory cache first
    if (quizCache.size > 0) {
      console.log("Using memory cache for quizzes");
      return Array.from(quizCache.values()).slice(0, limitCount);
    }

    // Try AsyncStorage next
    try {
      const keys = await AsyncStorage.getAllKeys();
      const quizKeys = keys.filter((key) => key.startsWith(QUIZ_CACHE_PREFIX));

      if (quizKeys.length > 0) {
        const quizData = await AsyncStorage.multiGet(quizKeys);
        const quizzes: Quiz[] = [];

        for (const [key, value] of quizData) {
          if (value) {
            const quiz = JSON.parse(value) as Quiz;
            quizCache.set(quiz.id, quiz);
            quizzes.push(quiz);
          }
        }

        if (quizzes.length > 0) {
          console.log("Using AsyncStorage cache for quizzes");
          return quizzes.slice(0, limitCount);
        }
      }
    } catch (asyncError) {
      console.warn("Error reading quizzes from AsyncStorage:", asyncError);
    }

    // Finally try Firebase
    const quizzesCollection = collection(db, "users", currentUser.uid, "quizzes");
    const q = query(quizzesCollection, orderBy("createdAt", "desc"), limit(limitCount));
    const quizzesSnapshot = await getDocs(q);

    if (quizzesSnapshot.empty) {
      console.log("No quizzes found in Firebase, generating new ones");
      return await refreshQuizzes();
    }

    // Process and cache quizzes
    const quizzes: Quiz[] = [];

    for (const doc of quizzesSnapshot.docs) {
      const quizData = doc.data() as Quiz;
      quizData.id = doc.id;

      // Cache in memory
      quizCache.set(quizData.id, quizData);

      // Cache in AsyncStorage
      try {
        await AsyncStorage.setItem(`${QUIZ_CACHE_PREFIX}${quizData.id}`, JSON.stringify(quizData));
      } catch (asyncError) {
        console.warn("Error caching quiz to AsyncStorage:", asyncError);
      }

      quizzes.push(quizData);
    }

    console.log(`Retrieved ${quizzes.length} quizzes from Firebase`);
    return quizzes;
  } catch (error) {
    console.error("Error getting available quizzes:", error);
    return [];
  }
};

/**
 * Get a specific quiz by ID with multi-level caching
 */
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  try {
    // Check memory cache first
    if (quizCache.has(quizId)) {
      return { ...quizCache.get(quizId)! };
    }

    // Try AsyncStorage next
    try {
      const cachedQuiz = await AsyncStorage.getItem(`${QUIZ_CACHE_PREFIX}${quizId}`);
      if (cachedQuiz) {
        const quiz = JSON.parse(cachedQuiz) as Quiz;
        quizCache.set(quizId, quiz);
        return { ...quiz };
      }
    } catch (asyncError) {
      console.warn("Error reading quiz from AsyncStorage:", asyncError);
    }

    // Finally try Firebase
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get quiz: No authenticated user");
      return null;
    }

    const quizRef = doc(db, "users", currentUser.uid, "quizzes", quizId);
    const quizDoc = await getDoc(quizRef);

    if (!quizDoc.exists()) {
      console.warn(`Quiz with ID ${quizId} not found`);
      return null;
    }

    const quizData = quizDoc.data() as Quiz;
    quizData.id = quizDoc.id;

    // Cache in memory
    quizCache.set(quizId, quizData);

    // Cache in AsyncStorage
    try {
      await AsyncStorage.setItem(`${QUIZ_CACHE_PREFIX}${quizId}`, JSON.stringify(quizData));
    } catch (asyncError) {
      console.warn("Error caching quiz to AsyncStorage:", asyncError);
    }

    return { ...quizData };
  } catch (error) {
    console.error(`Error getting quiz with ID ${quizId}:`, error);
    return null;
  }
};

/**
 * Refresh quizzes by generating new ones based on visited places
 */
export const refreshQuizzes = async (): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot refresh quizzes: No authenticated user");
      return [];
    }

    // Get user's visited places
    const visitedPlaces = await fetchUserVisitedPlaces();

    if (visitedPlaces.length === 0) {
      console.log("No visited places found, generating generic quizzes");
      return await generateGenericQuizzes();
    }

    // Extract regions from visited places with improved context data
    const regionContexts = extractRegionsFromPlaces(visitedPlaces);

    if (regionContexts.length === 0) {
      console.log("No regions extracted from places, generating generic quizzes");
      return await generateGenericQuizzes();
    }

    // Generate quizzes for regions using the improved context
    const quizzes = await generateQuizzesForRegions(regionContexts);

    if (quizzes.length === 0) {
      console.log("Failed to generate region-specific quizzes, falling back to generic quizzes");
      return await generateGenericQuizzes();
    }

    // Update settings with latest refresh time
    await updateKnowledgeQuestSettings({
      lastRefreshedAt: Date.now(),
    });

    return quizzes;
  } catch (error) {
    console.error("Error refreshing quizzes:", error);
    return [];
  }
};

/**
 * Extract regions with context from visited places
 * Returns a more detailed structure with disambiguated region information
 */
const extractRegionsFromPlaces = (places: VisitedPlaceDetails[]): RegionContext[] => {
  const regionsMap = new Map<string, RegionContext>();

  places.forEach((place) => {
    // Skip places without valid location data
    if (!place.geometry?.location) return;

    // Initialize region context with coordinates
    const regionContext: RegionContext = {
      name: "",
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
    };

    // Try to extract place type
    if (place.types && place.types.length > 0) {
      // Prioritize more specific place types
      const priorityTypes = [
        "locality",
        "administrative_area_level_1",
        "country",
        "point_of_interest",
      ];
      const foundType = place.types.find((type) => priorityTypes.includes(type));
      regionContext.placeType = foundType || place.types[0];
    }

    // First try to use the formatted address
    if (place.formatted_address) {
      // Parse the formatted address to extract useful location info
      const addressParts = place.formatted_address.split(",").map((part) => part.trim());

      if (addressParts.length >= 2) {
        // The first part is usually the most specific (street, POI, etc.)
        // The last part is usually the country
        regionContext.name = addressParts[0];
        regionContext.country = addressParts[addressParts.length - 1];
        regionContext.formattedAddress = place.formatted_address;
      } else {
        regionContext.name = place.formatted_address;
      }
    }
    // If formatted address is not available, use name and vicinity
    else if (place.name) {
      regionContext.name = place.name;

      if (place.vicinity) {
        const vicinityParts = place.vicinity.split(",").map((part) => part.trim());
        if (vicinityParts.length > 0) {
          regionContext.country = vicinityParts[vicinityParts.length - 1];
        }
      }
    }

    // Skip if we couldn't determine a name
    if (!regionContext.name) return;

    // Handle specific disambiguation cases
    if (regionContext.name.toLowerCase() === "roma") {
      // If the coordinates are close to Rome, Italy
      if (
        regionContext.coordinates &&
        regionContext.coordinates.lat > 41 &&
        regionContext.coordinates.lat < 42 &&
        regionContext.coordinates.lng > 12 &&
        regionContext.coordinates.lng < 13
      ) {
        regionContext.name = "Rome";
        regionContext.country = "Italy";
      }
    }

    // Use a composite key for the map to prevent duplicates
    const key = `${regionContext.name}${regionContext.country ? "-" + regionContext.country : ""}`;

    // Only add if we don't already have this region
    if (!regionsMap.has(key)) {
      regionsMap.set(key, regionContext);
    }
  });

  return Array.from(regionsMap.values());
};

/**
 * Generate quizzes for specific regions using AI with improved disambiguation
 */
const generateQuizzesForRegions = async (regions: RegionContext[]): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot generate quizzes: No authenticated user");
      return [];
    }

    const quizzes: Quiz[] = [];
    const categories = ["history", "culture", "geography", "art", "food", "general"];
    const difficulties = ["easy", "medium", "hard"];

    // Limit to a reasonable number of regions to avoid excessive API calls
    const regionsToProcess = regions.slice(0, 5);

    console.log(
      `Generating quizzes for regions: ${regionsToProcess.map((r) => r.name).join(", ")}`
    );

    for (const region of regionsToProcess) {
      // Create a balanced mix of categories and difficulties
      for (let i = 0; i < MAX_QUIZZES_PER_REGION; i++) {
        const category = categories[i % categories.length];
        const difficulty = difficulties[Math.floor(i / 2) % difficulties.length];

        try {
          // Pass the full context data to the quiz generation function
          const contextData = {
            country: region.country,
            placeType: region.placeType,
            coordinates: region.coordinates,
          };

          const newQuiz = await generateQuizWithAI(region.name, category, difficulty, contextData);

          if (newQuiz) {
            quizzes.push(newQuiz);

            // Save to Firebase
            const quizzesCollection = collection(db, "users", currentUser.uid, "quizzes");
            const docRef = await addDoc(quizzesCollection, newQuiz);
            newQuiz.id = docRef.id;

            // Cache the quiz
            quizCache.set(newQuiz.id, newQuiz);
            await AsyncStorage.setItem(
              `${QUIZ_CACHE_PREFIX}${newQuiz.id}`,
              JSON.stringify(newQuiz)
            );

            console.log(
              `Generated and saved ${difficulty} ${category} quiz for ${region.name}${
                region.country ? ` (${region.country})` : ""
              }`
            );
          }
        } catch (genError) {
          console.error(
            `Error generating quiz for ${region.name}${
              region.country ? ` (${region.country})` : ""
            } (${category}, ${difficulty}):`,
            genError
          );
        }
      }
    }

    console.log(`Successfully generated ${quizzes.length} region-specific quizzes`);
    return quizzes;
  } catch (error) {
    console.error("Error generating quizzes for regions:", error);
    return [];
  }
};

/**
 * Generate a single quiz for a region using AI with improved region disambiguation
 */
const generateQuizWithAI = async (
  region: string,
  category: string,
  difficulty: string,
  contextData?: { country?: string; placeType?: string; coordinates?: { lat: number; lng: number } }
): Promise<Quiz | null> => {
  try {
    // Create a more specific prompt that helps disambiguate regions
    const prompt = `
  Create a quiz with ${DEFAULT_QUESTIONS_PER_QUIZ} educational questions about ${region} focusing on ${category}.
  
  IMPORTANT CONTEXT: This quiz is about a geographical location that the user has visited.
  ${contextData?.country ? `• The location is in the country: ${contextData.country}` : ""}
  ${
    contextData?.placeType
      ? `• The location is a: ${contextData.placeType} (city, region, landmark, etc.)`
      : ""
  }
  ${
    contextData?.coordinates
      ? `• The geographical coordinates are approximately: lat ${contextData.coordinates.lat}, lng ${contextData.coordinates.lng}`
      : ""
  }
  
  CRITICAL DISAMBIGUATION INSTRUCTION:
  • If "Roma" is mentioned, this refers to Rome, Italy (the city) - NOT the Roma people/ethnicity.
  • If "Georgia" is mentioned without "USA" or "America", this refers to the country Georgia in the Caucasus region, not the US state.
  • If "Washington" is mentioned without context, assume it's Washington DC, not the state.
  • Always interpret location names as geographical places that can be visited, not as ethnic groups, organizations, or other entities.
  
  REGION VERIFICATION STEP:
  Before creating questions, explicitly identify what type of geographic entity "${region}" is:
  1. Verify if it's a city, state/province, country, landmark, or other geographical entity
  2. Include the broader location context (e.g., "Rome, a city in Italy" or "Kyoto, a city in Japan")
  3. If you're uncertain about what "${region}" refers to exactly, focus on broadly known facts
  
  The difficulty level should be ${difficulty}.
  
  Format the response as a JSON object with this structure:
  {
    "title": "Brief catchy title for the quiz",
    "description": "Short engaging description of what this quiz covers",
    "regionType": "city|state|country|landmark|unknown", // REQUIRED: Identify what this region is
    "regionContext": "Brief clarification of the specific region (e.g., 'Rome, Italy' or 'Kyoto, Japan')",
    "questions": [
      {
        "question": "The actual question text",
        "options": ["First option", "Second option", "Third option", "Fourth option"],
        "correctAnswerIndex": 0, // Index of the correct answer (0-based)
        "explanation": "Explanation of why this answer is correct and educational context",
        "difficulty": "${difficulty}",
        "confidenceLevel": "high|medium" // Only include high or medium confidence questions
      }
      // ... more questions
    ]
  }
  
  Make sure:
  1. Questions are factually accurate and educational
  2. ONLY include questions with high or medium confidence levels
  3. Questions are appropriate for ${difficulty} difficulty
  4. All questions are about "${region}" as a geographical location with a focus on ${category}
  5. Questions are diverse and cover different aspects of the topic
  6. Each question has exactly 4 options
  7. The correct answer is marked with the correct index (0-based)
  8. Explanations are informative and include interesting facts
  9. You NEVER create questions about ethnic groups when geographical locations are intended
`;

    const response = await generateContent({ prompt, responseFormat: "json" });

    if (!response || typeof response !== "object") {
      throw new Error("Invalid AI response format");
    }

    // Validate the structure of the response
    if (!response.title || !response.description || !Array.isArray(response.questions)) {
      throw new Error("Missing required fields in AI response");
    }

    // Store the region context for better display
    const regionContext = response.regionContext || region;
    const regionType = response.regionType || "unknown";

    // Validate and format questions
    const validatedQuestions = response.questions.map((q, index) => {
      if (
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correctAnswerIndex !== "number" ||
        !q.explanation
      ) {
        throw new Error(`Invalid question format at index ${index}`);
      }

      return {
        id: `question_${Date.now()}_${index}`,
        question: q.question,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        difficulty: q.difficulty || difficulty,
        relatedRegion: regionContext, // Use the disambiguated region context
      } as QuizQuestion;
    });

    if (validatedQuestions.length < 3) {
      throw new Error("Not enough valid questions generated");
    }

    // Create quiz object with improved metadata
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + CACHE_EXPIRY_DAYS);

    const quiz: Quiz = {
      id: `quiz_${Date.now()}_${region.replace(/[^a-zA-Z0-9]/g, "_")}`,
      title: response.title,
      description: response.description,
      questions: validatedQuestions,
      difficulty: difficulty as "easy" | "medium" | "hard",
      category: category as "history" | "culture" | "geography" | "art" | "food" | "general",
      relatedRegions: [regionContext], // Use the disambiguated region context
      regionType: regionType, // Store the type of region for better filtering
      createdAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      completions: 0,
      metadata: {
        disambiguated: true,
        originalRegion: region,
        clarifiedRegion: regionContext,
        regionType: regionType,
        country: contextData?.country,
      },
    };

    return quiz;
  } catch (error) {
    console.error(`Error generating quiz with AI for ${region}:`, error);
    return null;
  }
};

/**
 * Generate generic quizzes when no regions are available
 */
const generateGenericQuizzes = async (): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot generate generic quizzes: No authenticated user");
      return [];
    }

    const quizzes: Quiz[] = [];
    const topics = [
      "World Famous Landmarks",
      "UNESCO World Heritage Sites",
      "Capital Cities of the World",
      "Famous Museums and Art Galleries",
      "Natural Wonders of the World",
      "World Cuisine and Food Culture",
      "Traditional Festivals Around the World",
      "Ancient Civilizations",
      "Modern Architecture",
      "Famous Historical Routes",
    ];

    const categories = ["history", "culture", "geography", "art", "food", "general"];
    const difficulties = ["easy", "medium", "hard"];

    console.log("Generating generic travel quizzes");

    for (let i = 0; i < Math.min(QUIZZES_TO_CACHE, topics.length); i++) {
      const topic = topics[i];
      const category = categories[i % categories.length];
      const difficulty = difficulties[Math.floor(i / 3) % difficulties.length];

      try {
        const prompt = `
          Create a quiz with ${DEFAULT_QUESTIONS_PER_QUIZ} educational questions about ${topic} focusing on ${category}.
          The difficulty level should be ${difficulty}. These should be travel-related questions that anyone could answer
          regardless of where they've been.
          
          Format the response as a JSON object with this structure:
          {
            "title": "Brief catchy title for the quiz",
            "description": "Short engaging description of what this quiz covers",
            "questions": [
              {
                "question": "The actual question text",
                "options": ["First option", "Second option", "Third option", "Fourth option"],
                "correctAnswerIndex": 0, // Index of the correct answer (0-based)
                "explanation": "Explanation of why this answer is correct and educational context",
                "difficulty": "${difficulty}"
              }
              // ... more questions
            ]
          }
        `;

        const response = await generateContent({ prompt, responseFormat: "json" });

        if (!response || typeof response !== "object") {
          throw new Error("Invalid AI response format");
        }

        // Validate the structure of the response
        if (!response.title || !response.description || !Array.isArray(response.questions)) {
          throw new Error("Missing required fields in AI response");
        }

        // Validate and format questions
        const validatedQuestions = response.questions.map((q, index) => {
          if (
            !q.question ||
            !Array.isArray(q.options) ||
            q.options.length !== 4 ||
            typeof q.correctAnswerIndex !== "number" ||
            !q.explanation
          ) {
            throw new Error(`Invalid question format at index ${index}`);
          }

          return {
            id: `question_${Date.now()}_${index}`,
            question: q.question,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation,
            difficulty: q.difficulty || difficulty,
          } as QuizQuestion;
        });

        if (validatedQuestions.length < 3) {
          throw new Error("Not enough valid questions generated");
        }

        // Create quiz object
        const now = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(now.getDate() + CACHE_EXPIRY_DAYS);

        const quiz: Quiz = {
          id: `quiz_${Date.now()}_generic_${i}`,
          title: response.title,
          description: response.description,
          questions: validatedQuestions,
          difficulty: difficulty as "easy" | "medium" | "hard",
          category: category as "history" | "culture" | "geography" | "art" | "food" | "general",
          relatedRegions: ["World"], // Generic applies worldwide
          regionType: "global",
          createdAt: now.toISOString(),
          expiresAt: expiryDate.toISOString(),
          completions: 0,
          metadata: {
            disambiguated: true,
            originalRegion: "World",
            clarifiedRegion: "Global",
            regionType: "global",
          },
        };

        // Save to Firebase
        const quizzesCollection = collection(db, "users", currentUser.uid, "quizzes");
        const docRef = await addDoc(quizzesCollection, quiz);
        quiz.id = docRef.id;

        // Cache the quiz
        quizCache.set(quiz.id, quiz);
        await AsyncStorage.setItem(`${QUIZ_CACHE_PREFIX}${quiz.id}`, JSON.stringify(quiz));

        quizzes.push(quiz);
        console.log(`Generated and saved generic ${difficulty} ${category} quiz about ${topic}`);
      } catch (genError) {
        console.error(`Error generating generic quiz for ${topic}:`, genError);
      }
    }

    // Update settings with latest refresh time
    await updateKnowledgeQuestSettings({
      lastRefreshedAt: Date.now(),
    });

    console.log(`Successfully generated ${quizzes.length} generic quizzes`);
    return quizzes;
  } catch (error) {
    console.error("Error generating generic quizzes:", error);
    return [];
  }
};

/**
 * Record a completed quiz session and update stats
 */
export const recordQuizCompletion = async (
  quiz: Quiz,
  answers: {
    questionId: string;
    selectedAnswerIndex: number;
    isCorrect: boolean;
    timeSpent: number;
  }[]
): Promise<QuizResult> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Cannot record quiz completion: No authenticated user");
    }

    // Calculate result statistics
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const totalTimeSpent = answers.reduce((total, answer) => total + answer.timeSpent, 0);
    const now = new Date();

    // Create a result object
    const result: QuizResult = {
      id: `result_${Date.now()}`,
      quizId: quiz.id,
      title: quiz.title,
      score,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      completedAt: now.toISOString(),
      timeSpent: totalTimeSpent,
      difficulty: quiz.difficulty,
      category: quiz.category,
    };

    // Create a full session object
    const session: QuizSession = {
      id: `session_${Date.now()}`,
      quizId: quiz.id,
      startedAt: new Date(now.getTime() - totalTimeSpent).toISOString(),
      completedAt: now.toISOString(),
      answers,
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      totalTimeSpent,
    };

    // Update the quiz completion count
    const quizRef = doc(db, "users", currentUser.uid, "quizzes", quiz.id);
    await updateDoc(quizRef, {
      completions: (quiz.completions || 0) + 1,
      lastCompletedAt: now.toISOString(),
    });

    // Save the session to Firebase
    const sessionsCollection = collection(db, "users", currentUser.uid, "quizSessions");
    await addDoc(sessionsCollection, session);

    // Save the result to Firebase
    const resultsCollection = collection(db, "users", currentUser.uid, "quizResults");
    const resultRef = await addDoc(resultsCollection, result);
    result.id = resultRef.id;

    // Update the user's stats
    await updateUserStatsAfterQuiz(result, quiz.category);

    // Check and award badges
    await checkAndAwardQuizBadges(result);

    // Update local result cache
    const cachedResults = quizResultsCache.get(quiz.id) || [];
    cachedResults.push(result);
    quizResultsCache.set(quiz.id, cachedResults);

    // Update AsyncStorage cache
    try {
      await AsyncStorage.setItem(
        `${QUIZ_RESULTS_CACHE_PREFIX}${quiz.id}`,
        JSON.stringify(cachedResults)
      );
    } catch (asyncError) {
      console.warn("Error caching quiz results to AsyncStorage:", asyncError);
    }

    console.log(`Quiz ${quiz.id} completed with score ${score}%`);
    return result;
  } catch (error) {
    console.error("Error recording quiz completion:", error);
    throw error;
  }
};

/**
 * Update user statistics after completing a quiz
 */
const updateUserStatsAfterQuiz = async (result: QuizResult, category: string): Promise<void> => {
  try {
    // Get current stats
    const currentStats = await getKnowledgeQuestStats();

    // Calculate new stats
    const lastQuizDate = new Date().toISOString();
    const totalQuizzesTaken = currentStats.totalQuizzesTaken + 1;
    const totalQuestionsAnswered = currentStats.totalQuestionsAnswered + result.totalQuestions;
    const totalCorrectAnswers = currentStats.totalCorrectAnswers + result.correctAnswers;
    const accuracy = Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100);

    // Update streak
    let streakDays = currentStats.streakDays;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const lastQuizDateString = currentStats.lastQuizDate
      ? new Date(currentStats.lastQuizDate).toISOString().split("T")[0]
      : "";
    const todayString = new Date().toISOString().split("T")[0];

    if (lastQuizDateString === yesterdayString || lastQuizDateString === todayString) {
      // If last quiz was yesterday or today, increase streak
      streakDays++;
    } else if (lastQuizDateString !== todayString) {
      // If last quiz was before yesterday, reset streak
      streakDays = 1;
    }
    // If last quiz was today already, keep streak the same

    // Update category counts
    const quizzesByCategory = { ...currentStats.quizzesByCategory };
    quizzesByCategory[category] = (quizzesByCategory[category] || 0) + 1;

    // Update difficulty counts
    const quizzesByDifficulty = { ...currentStats.quizzesByDifficulty };
    quizzesByDifficulty[result.difficulty] = (quizzesByDifficulty[result.difficulty] || 0) + 1;

    // Find favorite category (most completed)
    let favoriteCategory = currentStats.favoriteCategory;
    const categoryEntries = Object.entries(quizzesByCategory);
    if (categoryEntries.length > 0) {
      const sortedCategories = categoryEntries.sort((a, b) => b[1] - a[1]);
      favoriteCategory = sortedCategories[0][0];
    }

    // Calculate average time per question
    const totalTime = currentStats.averageTimePerQuestion * currentStats.totalQuestionsAnswered;
    const newTotalTime = totalTime + result.timeSpent;
    const averageTimePerQuestion = Math.round(newTotalTime / totalQuestionsAnswered);

    // Calculate points
    const pointsEarned = calculateQuizPoints(result);
    const totalPoints = currentStats.totalPoints + pointsEarned;

    // Calculate level
    const { level, pointsToNextLevel } = calculateLevel(totalPoints);

    // Update the stats
    const updatedStats: KnowledgeQuestStats = {
      ...currentStats,
      totalQuizzesTaken,
      totalQuestionsAnswered,
      totalCorrectAnswers,
      streakDays,
      lastQuizDate,
      accuracy,
      averageTimePerQuestion,
      quizzesByCategory,
      quizzesByDifficulty,
      favoriteCategory,
      level,
      pointsToNextLevel,
      totalPoints,
    };

    // Save updated stats
    await updateKnowledgeQuestStats(updatedStats);

    console.log(`Updated user stats after quiz: Level ${level}, Points ${totalPoints}`);
  } catch (error) {
    console.error("Error updating user stats after quiz:", error);
  }
};

/**
 * Check if the user should earn badges based on quiz performance
 */
const checkAndAwardQuizBadges = async (result: QuizResult): Promise<string[]> => {
  try {
    const stats = await getKnowledgeQuestStats();
    const badges = await getAllUserBadges();
    const earnedBadgeIds: string[] = [];

    // Filter for quiz-related badges that aren't completed yet
    const quizBadges = badges.filter(
      (badge) =>
        !badge.completed &&
        badge.requirements.some((req) =>
          ["quizCount", "quizStreak", "quizScore", "quizCorrect"].includes(req.type)
        )
    );

    for (const badge of quizBadges) {
      let allRequirementsMet = true;
      let requirementsUpdated = false;

      const updatedRequirements = badge.requirements.map((req) => {
        let current = req.current;
        let requirementMet = false;

        switch (req.type) {
          case "quizCount":
            current = stats.totalQuizzesTaken;
            requirementMet = current >= req.value;
            break;

          case "quizStreak":
            current = stats.streakDays;
            requirementMet = current >= req.value;
            break;

          case "quizScore":
            // Check if the current quiz score meets the requirement
            current = Math.max(current, result.score);
            requirementMet = current >= req.value;
            break;

          case "quizCorrect":
            current = stats.totalCorrectAnswers;
            requirementMet = current >= req.value;
            break;

          default:
            requirementMet = current >= req.value;
        }

        if (!requirementMet) {
          allRequirementsMet = false;
        }

        if (current !== req.current) {
          requirementsUpdated = true;
        }

        return {
          ...req,
          current,
        };
      });

      if (requirementsUpdated) {
        await updateBadgeRequirements(badge.id, updatedRequirements);
      }

      if (allRequirementsMet) {
        await completeBadge(badge.id);
        earnedBadgeIds.push(badge.id);
        console.log(`Badge earned: ${badge.name}`);
      }
    }

    // Update stats with new badges
    if (earnedBadgeIds.length > 0) {
      const updatedBadges = [...stats.badges, ...earnedBadgeIds];
      await updateKnowledgeQuestStats({
        badges: updatedBadges,
      });
    }

    return earnedBadgeIds;
  } catch (error) {
    console.error("Error checking and awarding quiz badges:", error);
    return [];
  }
};

/**
 * Get quiz results for a specific quiz with multi-level caching
 */
export const getQuizResults = async (quizId: string): Promise<QuizResult[]> => {
  try {
    // Check memory cache first
    if (quizResultsCache.has(quizId)) {
      return [...quizResultsCache.get(quizId)!];
    }

    // Try AsyncStorage next
    try {
      const cachedResults = await AsyncStorage.getItem(`${QUIZ_RESULTS_CACHE_PREFIX}${quizId}`);
      if (cachedResults) {
        const results = JSON.parse(cachedResults) as QuizResult[];
        quizResultsCache.set(quizId, results);
        return [...results];
      }
    } catch (asyncError) {
      console.warn("Error reading quiz results from AsyncStorage:", asyncError);
    }

    // Finally try Firebase
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get quiz results: No authenticated user");
      return [];
    }

    const resultsCollection = collection(db, "users", currentUser.uid, "quizResults");
    const q = query(
      resultsCollection,
      where("quizId", "==", quizId),
      orderBy("completedAt", "desc")
    );
    const resultsSnapshot = await getDocs(q);

    if (resultsSnapshot.empty) {
      return [];
    }

    const results: QuizResult[] = resultsSnapshot.docs.map((doc) => {
      const data = doc.data() as QuizResult;
      data.id = doc.id;
      return data;
    });

    // Cache results
    quizResultsCache.set(quizId, results);
    await AsyncStorage.setItem(`${QUIZ_RESULTS_CACHE_PREFIX}${quizId}`, JSON.stringify(results));

    return results;
  } catch (error) {
    console.error(`Error getting results for quiz ${quizId}:`, error);
    return [];
  }
};

/**
 * Get all user's quiz results with multi-level caching
 */
export const getAllQuizResults = async (limitCount = 10): Promise<QuizResult[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get all quiz results: No authenticated user");
      return [];
    }

    // Check if we have any in memory cache first
    if (quizResultsCache.size > 0) {
      const allResults = Array.from(quizResultsCache.values()).flat();
      const sortedResults = allResults.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      return sortedResults.slice(0, limitCount);
    }

    const resultsCollection = collection(db, "users", currentUser.uid, "quizResults");

    // Create the query correctly, using limit as a function
    const resultsQuery = query(
      resultsCollection,
      orderBy("completedAt", "desc"),
      limit(limitCount) // Pass the number to the limit function
    );

    const resultsSnapshot = await getDocs(resultsQuery);

    if (resultsSnapshot.empty) {
      return [];
    }

    const results: QuizResult[] = resultsSnapshot.docs.map((doc) => {
      const data = doc.data() as QuizResult;
      data.id = doc.id;
      return data;
    });

    // Group results by quiz ID for caching
    const resultsByQuiz = new Map<string, QuizResult[]>();
    for (const result of results) {
      const quizResults = resultsByQuiz.get(result.quizId) || [];
      quizResults.push(result);
      resultsByQuiz.set(result.quizId, quizResults);
    }

    // Cache results by quiz
    for (const [quizId, quizResults] of resultsByQuiz.entries()) {
      quizResultsCache.set(quizId, quizResults);
      try {
        await AsyncStorage.setItem(
          `${QUIZ_RESULTS_CACHE_PREFIX}${quizId}`,
          JSON.stringify(quizResults)
        );
      } catch (asyncError) {
        console.warn("Error caching quiz results to AsyncStorage:", asyncError);
      }
    }

    return results;
  } catch (error) {
    console.error("Error getting all quiz results:", error);
    return [];
  }
};

/**
 * Calculate points earned from a quiz result
 */
const calculateQuizPoints = (result: QuizResult): number => {
  const basePoints = 10;
  const correctAnswerPoints = 5;
  const difficultyMultiplier = {
    easy: 1,
    medium: 1.5,
    hard: 2,
  };

  // Calculate time bonus (faster = more points, up to 10)
  const averageSecondsPerQuestion = result.timeSpent / (result.totalQuestions * 1000);
  let timeBonus = 0;
  if (averageSecondsPerQuestion < 10) {
    timeBonus = 10;
  } else if (averageSecondsPerQuestion < 15) {
    timeBonus = 7;
  } else if (averageSecondsPerQuestion < 20) {
    timeBonus = 5;
  } else if (averageSecondsPerQuestion < 30) {
    timeBonus = 2;
  }

  const points = Math.round(
    (basePoints + result.correctAnswers * correctAnswerPoints + timeBonus) *
      difficultyMultiplier[result.difficulty]
  );

  return points;
};

/**
 * Calculate user level based on total points
 */
const calculateLevel = (totalPoints: number): { level: number; pointsToNextLevel: number } => {
  // Level progression formula (more points required for each level)
  // Level 1: 0-100 points
  // Level 2: 101-250 points
  // Level 3: 251-450 points
  // Each level requires 50 more points than the previous level

  let level = 1;
  let pointsRequired = 100;
  let pointsAccumulated = 0;

  while (pointsAccumulated + pointsRequired < totalPoints) {
    pointsAccumulated += pointsRequired;
    level++;
    pointsRequired += 50;
  }

  const pointsToNextLevel = pointsAccumulated + pointsRequired - totalPoints;

  return { level, pointsToNextLevel };
};

/**
 * Clear all caches (memory and AsyncStorage)
 */
export const clearKnowledgeQuestCaches = async (): Promise<void> => {
  try {
    // Clear memory caches
    quizCache.clear();
    quizResultsCache.clear();
    statsCache = null;
    settingsCache = null;

    // Clear AsyncStorage caches
    const keys = await AsyncStorage.getAllKeys();
    const questKeys = keys.filter(
      (key) =>
        key.startsWith(QUIZ_CACHE_PREFIX) ||
        key.startsWith(QUIZ_RESULTS_CACHE_PREFIX) ||
        key === QUEST_STATS_CACHE_KEY ||
        key === QUEST_SETTINGS_CACHE_KEY
    );

    if (questKeys.length > 0) {
      await AsyncStorage.multiRemove(questKeys);
    }

    console.log("All Knowledge Quest caches cleared");
  } catch (error) {
    console.error("Error clearing Knowledge Quest caches:", error);
  }
};

/**
 * Get default stats
 */
const getDefaultStats = (): KnowledgeQuestStats => {
  return {
    totalQuizzesTaken: 0,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    streakDays: 0,
    lastQuizDate: new Date(0).toISOString(),
    accuracy: 0,
    averageTimePerQuestion: 0,
    quizzesByCategory: {},
    quizzesByDifficulty: {},
    masteredRegions: [],
    badges: [],
    level: 1,
    pointsToNextLevel: 100,
    totalPoints: 0,
  };
};

/**
 * Get default settings
 */
const getDefaultSettings = (): KnowledgeQuestSettings => {
  return {
    lastRefreshedAt: 0,
    cacheExpiryDays: CACHE_EXPIRY_DAYS,
    dailyGoal: 1,
    dailyReminderEnabled: false,
  };
};

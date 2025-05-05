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

const CACHE_EXPIRY_DAYS = 30;
const QUIZ_CACHE_PREFIX = "@knowledge_quest:quiz:";
const QUIZ_RESULTS_CACHE_PREFIX = "@knowledge_quest:results:";
const QUEST_STATS_CACHE_KEY = "@knowledge_quest:stats";
const QUEST_SETTINGS_CACHE_KEY = "@knowledge_quest:settings";
const MAX_QUIZZES_PER_REGION = 3;
const DEFAULT_QUESTIONS_PER_QUIZ = 5;
const QUIZZES_TO_CACHE = 10;
const REFRESH_INTERVAL_DAYS = 3;
const quizCache = new Map();
const quizResultsCache = new Map();
let statsCache = null;
let settingsCache = null;

interface RegionContext {
  name: string;
  country?: string;
  placeType?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  formattedAddress?: string;
}

export const initializeKnowledgeQuest = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot initialize Knowledge Quest: No authenticated user");
      return;
    }
    await getKnowledgeQuestSettings();
    await getKnowledgeQuestStats();

    const settings = await getKnowledgeQuestSettings();
    const lastRefreshed = settings.lastRefreshedAt;
    const now = Date.now();
    const daysSinceRefresh = (now - lastRefreshed) / (1000 * 60 * 60 * 24);

    if (daysSinceRefresh >= REFRESH_INTERVAL_DAYS) {
      console.log(
        `Knowledge Quest quizzes need refreshing (${daysSinceRefresh.toFixed(
          1
        )} days since last refresh)`
      );
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

export const getKnowledgeQuestSettings = async (): Promise<KnowledgeQuestSettings> => {
  try {
    if (settingsCache) {
      return { ...settingsCache };
    }

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

      settingsCache = settings;
      await AsyncStorage.setItem(QUEST_SETTINGS_CACHE_KEY, JSON.stringify(settings));

      return { ...settings };
    } else {
      const defaultSettings = getDefaultSettings();
      await setDoc(settingsRef, defaultSettings);

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

export const updateKnowledgeQuestSettings = async (
  settings: Partial<KnowledgeQuestSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update settings: No authenticated user");
      return;
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "knowledgeQuest");
    await setDoc(settingsRef, settings, { merge: true });

    const currentSettings = await getKnowledgeQuestSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    settingsCache = updatedSettings;

    await AsyncStorage.setItem(QUEST_SETTINGS_CACHE_KEY, JSON.stringify(updatedSettings));

    console.log("Knowledge Quest settings updated successfully");
  } catch (error) {
    console.error("Error updating Knowledge Quest settings:", error);
  }
};

export const getKnowledgeQuestStats = async (): Promise<KnowledgeQuestStats> => {
  try {
    if (statsCache) {
      return { ...statsCache };
    }

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

      statsCache = stats;
      await AsyncStorage.setItem(QUEST_STATS_CACHE_KEY, JSON.stringify(stats));

      return { ...stats };
    } else {
      const defaultStats = getDefaultStats();
      await setDoc(statsRef, defaultStats);

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

export const updateKnowledgeQuestStats = async (
  stats: Partial<KnowledgeQuestStats>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update stats: No authenticated user");
      return;
    }

    const statsRef = doc(db, "users", currentUser.uid, "stats", "knowledgeQuest");
    await setDoc(statsRef, stats, { merge: true });

    const currentStats = await getKnowledgeQuestStats();
    const updatedStats = { ...currentStats, ...stats };

    statsCache = updatedStats;

    await AsyncStorage.setItem(QUEST_STATS_CACHE_KEY, JSON.stringify(updatedStats));

    console.log("Knowledge Quest stats updated successfully");
  } catch (error) {
    console.error("Error updating Knowledge Quest stats:", error);
  }
};

export const getAvailableQuizzes = async (limitCount = 10): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get quizzes: No authenticated user");
      return [];
    }

    const settings = await getKnowledgeQuestSettings();
    const now = Date.now();
    const daysSinceRefresh = (now - settings.lastRefreshedAt) / (1000 * 60 * 60 * 24);

    if (daysSinceRefresh >= REFRESH_INTERVAL_DAYS) {
      console.log(
        `Daily quiz refresh needed (${daysSinceRefresh.toFixed(1)} days since last refresh)`
      );
      await refreshQuizzes();

      await updateKnowledgeQuestSettings({
        lastRefreshedAt: now,
      });
    }

    if (quizCache.size > 0) {
      console.log(`Using memory cache for quizzes (${quizCache.size} quizzes available)`);
      const validQuizzes = Array.from(quizCache.values()).filter((quiz) => {
        const expiryDate = new Date(quiz.expiresAt);
        return expiryDate.getTime() > Date.now();
      });

      if (validQuizzes.length > 0) {
        console.log(`Found ${validQuizzes.length} valid quizzes in memory cache`);
        return validQuizzes.slice(0, limitCount);
      }
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      const quizKeys = keys.filter((key) => key.startsWith(QUIZ_CACHE_PREFIX));

      if (quizKeys.length > 0) {
        const quizData = await AsyncStorage.multiGet(quizKeys);
        const quizzes = [];

        for (const [key, value] of quizData) {
          if (value) {
            try {
              const quiz = JSON.parse(value) as Quiz;

              const expiryDate = new Date(quiz.expiresAt);
              if (expiryDate.getTime() > Date.now()) {
                quizCache.set(quiz.id, quiz);
                quizzes.push(quiz);
              } else {
                await AsyncStorage.removeItem(key);
              }
            } catch (parseError) {
              console.warn(`Error parsing quiz from AsyncStorage: ${key}`, parseError);
              await AsyncStorage.removeItem(key);
            }
          }
        }

        if (quizzes.length > 0) {
          console.log(`Using AsyncStorage cache for quizzes (${quizzes.length} valid quizzes)`);
          return quizzes.slice(0, limitCount);
        }
      }
    } catch (asyncError) {
      console.warn("Error reading quizzes from AsyncStorage:", asyncError);
    }

    console.log("Fetching quizzes from Firebase");
    const quizzesCollection = collection(db, "users", currentUser.uid, "quizzes");
    const q = query(quizzesCollection, orderBy("createdAt", "desc"), limit(limitCount * 2));
    const quizzesSnapshot = await getDocs(q);

    if (quizzesSnapshot.empty) {
      console.log("No quizzes found in Firebase, generating new ones");
      return await refreshQuizzes();
    }

    const quizzes = [];
    let invalidQuizCount = 0;

    for (const docSnapshot of quizzesSnapshot.docs) {
      try {
        const quizData = docSnapshot.data() as Quiz;
        quizData.id = docSnapshot.id;

        const expiryDate = new Date(quizData.expiresAt);
        if (expiryDate.getTime() <= Date.now()) {
          invalidQuizCount++;
          continue;
        }

        if (
          !quizData.questions ||
          !Array.isArray(quizData.questions) ||
          quizData.questions.length === 0
        ) {
          invalidQuizCount++;
          continue;
        }

        quizCache.set(quizData.id, quizData);

        try {
          await AsyncStorage.setItem(
            `${QUIZ_CACHE_PREFIX}${quizData.id}`,
            JSON.stringify(quizData)
          );
        } catch (asyncError) {
          console.warn("Error caching quiz to AsyncStorage:", asyncError);
        }

        quizzes.push(quizData);
      } catch (docError) {
        console.warn(`Error processing quiz document: ${docSnapshot.id}`, docError);
        invalidQuizCount++;
      }
    }

    console.log(
      `Retrieved ${quizzes.length} valid quizzes from Firebase (skipped ${invalidQuizCount} invalid/expired quizzes)`
    );

    if (quizzes.length < limitCount / 2) {
      console.log(
        `Found only ${quizzes.length} quizzes, which is less than ${
          limitCount / 2
        }. Generating additional quizzes.`
      );
      const newQuizzes = await refreshQuizzes();

      const allQuizIds = new Set(quizzes.map((q) => q.id));
      const additionalQuizzes = newQuizzes.filter((q) => !allQuizIds.has(q.id));

      quizzes.push(...additionalQuizzes);
      console.log(`Added ${additionalQuizzes.length} newly generated quizzes to the list`);
    }

    const uniqueQuizMap = new Map();
    quizzes.forEach((quiz) => {
      if (!uniqueQuizMap.has(quiz.id)) {
        uniqueQuizMap.set(quiz.id, quiz);
      }
    });

    const uniqueQuizzes = Array.from(uniqueQuizMap.values());
    uniqueQuizzes.sort((a, b) => (a.completions || 0) - (b.completions || 0));

    console.log(
      `Returning ${Math.min(
        uniqueQuizzes.length,
        limitCount
      )} quizzes after deduplication and sorting`
    );
    return uniqueQuizzes.slice(0, limitCount);
  } catch (error) {
    console.error("Error getting available quizzes:", error);
    return [];
  }
};

export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  try {
    if (!quizId) {
      console.error("[QUIZ DEBUG] Invalid quiz ID provided:", quizId);
      return null;
    }

    console.log(`[QUIZ DEBUG] Getting quiz with ID: ${quizId}`);

    if (quizCache.has(quizId)) {
      const cachedQuiz = quizCache.get(quizId);
      console.log(`[QUIZ DEBUG] Found quiz in memory cache: ${quizId}`);

      const expiryDate = new Date(cachedQuiz.expiresAt);
      if (expiryDate.getTime() > Date.now()) {
        if (
          cachedQuiz.title &&
          cachedQuiz.questions &&
          Array.isArray(cachedQuiz.questions) &&
          cachedQuiz.questions.length > 0
        ) {
          return { ...cachedQuiz };
        } else {
          console.warn(
            `[QUIZ DEBUG] Quiz found in memory cache but has invalid structure: ${quizId}`
          );
          quizCache.delete(quizId);
        }
      } else {
        console.log(`[QUIZ DEBUG] Removing expired quiz from memory cache: ${quizId}`);
        quizCache.delete(quizId);
      }
    }

    try {
      const cachedQuiz = await AsyncStorage.getItem(`${QUIZ_CACHE_PREFIX}${quizId}`);
      if (cachedQuiz) {
        console.log(`[QUIZ DEBUG] Found quiz in AsyncStorage: ${quizId}`);
        try {
          const quiz = JSON.parse(cachedQuiz) as Quiz;

          const expiryDate = new Date(quiz.expiresAt);
          if (expiryDate.getTime() > Date.now()) {
            if (
              quiz.title &&
              quiz.questions &&
              Array.isArray(quiz.questions) &&
              quiz.questions.length > 0
            ) {
              quizCache.set(quizId, quiz);
              return { ...quiz };
            } else {
              console.warn(
                `[QUIZ DEBUG] Quiz found in AsyncStorage but has invalid structure: ${quizId}`
              );
              await AsyncStorage.removeItem(`${QUIZ_CACHE_PREFIX}${quizId}`);
            }
          } else {
            console.log(`[QUIZ DEBUG] Removing expired quiz from AsyncStorage: ${quizId}`);
            await AsyncStorage.removeItem(`${QUIZ_CACHE_PREFIX}${quizId}`);
          }
        } catch (parseError) {
          console.error(`[QUIZ DEBUG] Error parsing quiz from AsyncStorage: ${quizId}`, parseError);
          await AsyncStorage.removeItem(`${QUIZ_CACHE_PREFIX}${quizId}`);
        }
      }
    } catch (asyncError) {
      console.warn("[QUIZ DEBUG] Error reading quiz from AsyncStorage:", asyncError);
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("[QUIZ DEBUG] Cannot get quiz: No authenticated user");
      return null;
    }

    try {
      console.log(`[QUIZ DEBUG] Fetching quiz from Firebase: ${quizId}`);
      const quizRef = doc(db, "users", currentUser.uid, "quizzes", quizId);
      const quizDoc = await getDoc(quizRef);

      if (!quizDoc.exists()) {
        console.warn(`[QUIZ DEBUG] Quiz with ID ${quizId} not found in Firebase.`);

        const availableQuizzes = await getAvailableQuizzes(50);
        const matchingQuiz = availableQuizzes.find((q) => q.id === quizId);

        if (matchingQuiz) {
          console.log(
            `[QUIZ DEBUG] Found quiz ${quizId} in available quizzes but not in Firestore. Creating it now.`
          );

          try {
            await setDoc(quizRef, matchingQuiz);
            console.log(`[QUIZ DEBUG] Successfully created quiz document: ${quizId}`);

            quizCache.set(quizId, matchingQuiz);
            await AsyncStorage.setItem(
              `${QUIZ_CACHE_PREFIX}${quizId}`,
              JSON.stringify(matchingQuiz)
            );

            return { ...matchingQuiz };
          } catch (createError) {
            console.error(`[QUIZ DEBUG] Error creating quiz document: ${quizId}`, createError);
            return matchingQuiz;
          }
        }

        quizCache.delete(quizId);
        try {
          await AsyncStorage.removeItem(`${QUIZ_CACHE_PREFIX}${quizId}`);
        } catch (asyncError) {
          console.warn("[QUIZ DEBUG] Error removing quiz from AsyncStorage:", asyncError);
        }
        return null;
      }

      const quizData = quizDoc.data() as Quiz;
      quizData.id = quizDoc.id;

      const expiryDate = new Date(quizData.expiresAt);
      if (expiryDate.getTime() <= Date.now()) {
        console.warn(`[QUIZ DEBUG] Quiz with ID ${quizId} has expired.`);

        console.log(`[QUIZ DEBUG] Extending expiry date for quiz: ${quizId}`);
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + CACHE_EXPIRY_DAYS);
        quizData.expiresAt = newExpiryDate.toISOString();

        await setDoc(quizRef, { expiresAt: quizData.expiresAt }, { merge: true });
      }

      if (
        !quizData.questions ||
        !Array.isArray(quizData.questions) ||
        quizData.questions.length === 0
      ) {
        console.warn(`[QUIZ DEBUG] Quiz with ID ${quizId} has invalid questions structure.`);

        if (!quizData.title) quizData.title = "Quiz";
        if (!quizData.difficulty) quizData.difficulty = "medium";
        if (!quizData.category) quizData.category = "general";
        if (!quizData.relatedRegions) quizData.relatedRegions = ["Unknown"];

        if (
          !quizData.questions ||
          !Array.isArray(quizData.questions) ||
          quizData.questions.length === 0
        ) {
          quizData.questions = [
            {
              id: `default_${Date.now()}`,
              question: "This quiz needs to be refreshed. What would you like to do?",
              options: [
                "Continue anyway",
                "Go back and try another quiz",
                "Refresh the quizzes",
                "Report an issue",
              ],
              correctAnswerIndex: 2,
              explanation: "Refreshing the quizzes might resolve this issue.",
              difficulty: "easy",
            },
          ];
        }
      }

      quizCache.set(quizId, quizData);

      try {
        await AsyncStorage.setItem(`${QUIZ_CACHE_PREFIX}${quizId}`, JSON.stringify(quizData));
      } catch (asyncError) {
        console.warn("[QUIZ DEBUG] Error caching quiz to AsyncStorage:", asyncError);
      }

      return { ...quizData };
    } catch (firestoreError) {
      console.error(`[QUIZ DEBUG] Error fetching quiz from Firestore: ${quizId}`, firestoreError);
      return null;
    }
  } catch (error) {
    console.error(`[QUIZ DEBUG] Error getting quiz with ID ${quizId}:`, error);
    return null;
  }
};

export const refreshQuizzes = async (): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot refresh quizzes: No authenticated user");
      return [];
    }

    console.log("Starting quiz refresh process");

    await clearQuizCaches();

    const visitedPlaces = await fetchUserVisitedPlaces();
    console.log(`Found ${visitedPlaces.length} visited places`);

    if (visitedPlaces.length === 0) {
      console.log("No visited places found, generating generic quizzes");
      return await generateGenericQuizzes();
    }

    const regionContexts = extractRegionsFromPlaces(visitedPlaces);
    console.log(`Extracted ${regionContexts.length} region contexts from places`);

    if (regionContexts.length === 0) {
      console.log("No regions extracted from places, generating generic quizzes");
      return await generateGenericQuizzes();
    }

    const quizzes = await generateQuizzesForRegions(regionContexts);
    console.log(`Generated ${quizzes.length} region-specific quizzes`);

    if (quizzes.length === 0) {
      console.log("Failed to generate region-specific quizzes, falling back to generic quizzes");
      return await generateGenericQuizzes();
    }

    await updateKnowledgeQuestSettings({
      lastRefreshedAt: Date.now(),
    });

    return quizzes;
  } catch (error) {
    console.error("Error refreshing quizzes:", error);
    try {
      console.log("Attempting to generate generic quizzes as fallback");
      return await generateGenericQuizzes();
    } catch (fallbackError) {
      console.error("Error generating fallback quizzes:", fallbackError);
      return [];
    }
  }
};

export const clearQuizCaches = async (): Promise<void> => {
  try {
    quizCache.clear();
    console.log("Cleared quiz memory cache");

    const keys = await AsyncStorage.getAllKeys();
    const quizKeys = keys.filter((key) => key.startsWith(QUIZ_CACHE_PREFIX));

    if (quizKeys.length > 0) {
      await AsyncStorage.multiRemove(quizKeys);
      console.log(`Removed ${quizKeys.length} quiz entries from AsyncStorage cache`);
    }
  } catch (error) {
    console.error("Error clearing quiz caches:", error);
  }
};

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

    console.log(`[QUIZ DEBUG] Recording completion for quiz ID: ${quiz.id}`);

    if (!quiz || !quiz.id || !quiz.title || !quiz.questions || !quiz.difficulty || !quiz.category) {
      console.error("[QUIZ DEBUG] Invalid quiz object:", JSON.stringify(quiz, null, 2));
      throw new Error("Invalid quiz object provided");
    }

    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    const totalTimeSpent = answers.reduce((total, answer) => total + answer.timeSpent, 0);
    const now = new Date();

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

    const quizToSave = {
      ...quiz,
      completions: (quiz.completions || 0) + 1,
      lastCompletedAt: now.toISOString(),
    };

    if (!quiz.expiresAt || new Date(quiz.expiresAt).getTime() <= now.getTime()) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + CACHE_EXPIRY_DAYS);
      quizToSave.expiresAt = expiryDate.toISOString();
    }

    try {
      const quizRef = doc(db, "users", currentUser.uid, "quizzes", quiz.id);
      console.log(`[QUIZ DEBUG] Setting quiz document: ${quiz.id}`);
      await setDoc(quizRef, quizToSave, { merge: true });
      console.log(`[QUIZ DEBUG] Successfully saved quiz document: ${quiz.id}`);
    } catch (quizError) {
      console.error(`[QUIZ DEBUG] Error saving quiz document: ${quiz.id}`, quizError);
    }

    try {
      const sessionsCollection = collection(db, "users", currentUser.uid, "quizSessions");
      await addDoc(sessionsCollection, session);
      console.log("[QUIZ DEBUG] Saved quiz session to Firebase");
    } catch (sessionError) {
      console.error("[QUIZ DEBUG] Error saving quiz session:", sessionError);
    }

    try {
      const resultsCollection = collection(db, "users", currentUser.uid, "quizResults");
      const resultRef = await addDoc(resultsCollection, result);
      result.id = resultRef.id;
      console.log("[QUIZ DEBUG] Saved quiz result to Firebase");
    } catch (resultError) {
      console.error("[QUIZ DEBUG] Error saving quiz result:", resultError);
    }

    try {
      await updateUserStatsAfterQuiz(result, quiz.category);
    } catch (statsError) {
      console.error("[QUIZ DEBUG] Error updating user stats:", statsError);
    }

    try {
      await checkAndAwardQuizBadges(result);
    } catch (badgesError) {
      console.error("[QUIZ DEBUG] Error checking badges:", badgesError);
    }

    try {
      const cachedResults = quizResultsCache.get(quiz.id) || [];
      cachedResults.push(result);
      quizResultsCache.set(quiz.id, cachedResults);

      await AsyncStorage.setItem(
        `${QUIZ_RESULTS_CACHE_PREFIX}${quiz.id}`,
        JSON.stringify(cachedResults)
      );
    } catch (cacheError) {
      console.error("[QUIZ DEBUG] Error updating cache:", cacheError);
    }

    console.log(`[QUIZ DEBUG] Quiz ${quiz.id} completed with score ${score}%`);
    return result;
  } catch (error) {
    console.error("[QUIZ DEBUG] Error in recordQuizCompletion:", error);

    if (quiz && answers) {
      const correctAnswers = answers.filter((a) => a.isCorrect).length;
      const score = Math.round((correctAnswers / quiz.questions.length) * 100);
      const totalTimeSpent = answers.reduce((total, answer) => total + answer.timeSpent, 0);

      const fallbackResult: QuizResult = {
        id: `fallback_${Date.now()}`,
        quizId: quiz.id,
        title: quiz.title || "Unknown Quiz",
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        completedAt: new Date().toISOString(),
        timeSpent: totalTimeSpent,
        difficulty: quiz.difficulty || "medium",
        category: quiz.category || "general",
      };

      return fallbackResult;
    }

    throw error;
  }
};

const extractRegionsFromPlaces = (places: VisitedPlaceDetails[]): RegionContext[] => {
  const regionsMap = new Map<string, RegionContext>();

  places.forEach((place) => {
    if (!place.geometry?.location) return;

    const regionContext: RegionContext = {
      name: "",
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
    };

    if (place.types && place.types.length > 0) {
      const priorityTypes = [
        "locality",
        "administrative_area_level_1",
        "country",
        "point_of_interest",
      ];
      const foundType = place.types.find((type) => priorityTypes.includes(type));
      regionContext.placeType = foundType || place.types[0];
    }

    if (place.formatted_address) {
      const addressParts = place.formatted_address.split(",").map((part) => part.trim());

      if (addressParts.length >= 2) {
        regionContext.name = addressParts[0];
        regionContext.country = addressParts[addressParts.length - 1];
        regionContext.formattedAddress = place.formatted_address;
      } else {
        regionContext.name = place.formatted_address;
      }
    } else if (place.name) {
      regionContext.name = place.name;

      if (place.vicinity) {
        const vicinityParts = place.vicinity.split(",").map((part) => part.trim());
        if (vicinityParts.length > 0) {
          regionContext.country = vicinityParts[vicinityParts.length - 1];
        }
      }
    }

    if (!regionContext.name) return;

    if (regionContext.name.toLowerCase() === "roma") {
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

    const key = `${regionContext.name}${regionContext.country ? "-" + regionContext.country : ""}`;

    if (!regionsMap.has(key)) {
      regionsMap.set(key, regionContext);
    }
  });

  return Array.from(regionsMap.values());
};

const generateQuizzesForRegions = async (regions: RegionContext[]): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot generate quizzes: No authenticated user");
      return [];
    }

    const quizzes = [];
    const categories = ["history", "culture", "geography", "art", "food", "general"];
    const difficulties = ["easy", "medium", "hard"];

    const regionsToProcess = regions.slice(0, 5);

    console.log(
      `Generating quizzes for regions: ${regionsToProcess.map((r) => r.name).join(", ")}`
    );

    for (const region of regionsToProcess) {
      for (let i = 0; i < MAX_QUIZZES_PER_REGION; i++) {
        const category = categories[i % categories.length];
        const difficulty = difficulties[Math.floor(i / 2) % difficulties.length];

        try {
          const contextData = {
            country: region.country,
            placeType: region.placeType,
            coordinates: region.coordinates,
          };

          const newQuiz = await generateQuizWithAI(region.name, category, difficulty, contextData);

          if (newQuiz) {
            quizzes.push(newQuiz);

            const quizzesCollection = collection(db, "users", currentUser.uid, "quizzes");
            const docRef = await addDoc(quizzesCollection, newQuiz);
            newQuiz.id = docRef.id;

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

const generateQuizWithAI = async (
  region: string,
  category: string,
  difficulty: string,
  contextData?: { country?: string; placeType?: string; coordinates?: { lat: number; lng: number } }
): Promise<Quiz | null> => {
  try {
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

    if (!response.title || !response.description || !Array.isArray(response.questions)) {
      throw new Error("Missing required fields in AI response");
    }

    const regionContext = response.regionContext || region;
    const regionType = response.regionType || "unknown";

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
        relatedRegion: regionContext,
      } as QuizQuestion;
    });

    if (validatedQuestions.length < 3) {
      throw new Error("Not enough valid questions generated");
    }

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
      relatedRegions: [regionContext],
      regionType: regionType,
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

const generateGenericQuizzes = async (): Promise<Quiz[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot generate generic quizzes: No authenticated user");
      return [];
    }

    const quizzes = [];
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

        if (!response.title || !response.description || !Array.isArray(response.questions)) {
          throw new Error("Missing required fields in AI response");
        }

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
          relatedRegions: ["World"],
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

        const quizzesCollection = collection(db, "users", currentUser.uid, "quizzes");
        const docRef = await addDoc(quizzesCollection, quiz);
        quiz.id = docRef.id;

        quizCache.set(quiz.id, quiz);
        await AsyncStorage.setItem(`${QUIZ_CACHE_PREFIX}${quiz.id}`, JSON.stringify(quiz));

        quizzes.push(quiz);
        console.log(`Generated and saved generic ${difficulty} ${category} quiz about ${topic}`);
      } catch (genError) {
        console.error(`Error generating generic quiz for ${topic}:`, genError);
      }
    }

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

const updateUserStatsAfterQuiz = async (result: QuizResult, category: string): Promise<void> => {
  try {
    const currentStats = await getKnowledgeQuestStats();

    const lastQuizDate = new Date().toISOString();
    const totalQuizzesTaken = currentStats.totalQuizzesTaken + 1;
    const totalQuestionsAnswered = currentStats.totalQuestionsAnswered + result.totalQuestions;
    const totalCorrectAnswers = currentStats.totalCorrectAnswers + result.correctAnswers;
    const accuracy = Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100);

    let streakDays = currentStats.streakDays;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];
    const lastQuizDateString = currentStats.lastQuizDate
      ? new Date(currentStats.lastQuizDate).toISOString().split("T")[0]
      : "";
    const todayString = new Date().toISOString().split("T")[0];

    if (lastQuizDateString === yesterdayString || lastQuizDateString === todayString) {
      streakDays++;
    } else if (lastQuizDateString !== todayString) {
      streakDays = 1;
    }

    const quizzesByCategory = { ...currentStats.quizzesByCategory };
    quizzesByCategory[category] = (quizzesByCategory[category] || 0) + 1;

    const quizzesByDifficulty = { ...currentStats.quizzesByDifficulty };
    quizzesByDifficulty[result.difficulty] = (quizzesByDifficulty[result.difficulty] || 0) + 1;

    let favoriteCategory = currentStats.favoriteCategory;
    const categoryEntries = Object.entries(quizzesByCategory);
    if (categoryEntries.length > 0) {
      const sortedCategories = categoryEntries.sort((a, b) => b[1] - a[1]);
      favoriteCategory = sortedCategories[0][0];
    }

    const totalTime = currentStats.averageTimePerQuestion * currentStats.totalQuestionsAnswered;
    const newTotalTime = totalTime + result.timeSpent;
    const averageTimePerQuestion = Math.round(newTotalTime / totalQuestionsAnswered);

    const pointsEarned = calculateQuizPoints(result);
    const totalPoints = currentStats.totalPoints + pointsEarned;

    const { level, pointsToNextLevel } = calculateLevel(totalPoints);

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

    await updateKnowledgeQuestStats(updatedStats);

    console.log(`Updated user stats after quiz: Level ${level}, Points ${totalPoints}`);
  } catch (error) {
    console.error("Error updating user stats after quiz:", error);
  }
};

const checkAndAwardQuizBadges = async (result: QuizResult): Promise<string[]> => {
  try {
    const stats = await getKnowledgeQuestStats();
    const badges = await getAllUserBadges();
    const earnedBadgeIds = [];

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

export const getQuizResults = async (quizId: string): Promise<QuizResult[]> => {
  try {
    if (quizResultsCache.has(quizId)) {
      return [...quizResultsCache.get(quizId)];
    }

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

    const results = resultsSnapshot.docs.map((doc) => {
      const data = doc.data() as QuizResult;
      data.id = doc.id;
      return data;
    });

    quizResultsCache.set(quizId, results);
    await AsyncStorage.setItem(`${QUIZ_RESULTS_CACHE_PREFIX}${quizId}`, JSON.stringify(results));

    return results;
  } catch (error) {
    console.error(`Error getting results for quiz ${quizId}:`, error);
    return [];
  }
};

export const getAllQuizResults = async (limitCount = 10): Promise<QuizResult[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get all quiz results: No authenticated user");
      return [];
    }

    if (quizResultsCache.size > 0) {
      const allResults = Array.from(quizResultsCache.values()).flat();
      const sortedResults = allResults.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      return sortedResults.slice(0, limitCount);
    }

    const resultsCollection = collection(db, "users", currentUser.uid, "quizResults");
    const resultsQuery = query(
      resultsCollection,
      orderBy("completedAt", "desc"),
      limit(limitCount)
    );

    const resultsSnapshot = await getDocs(resultsQuery);

    if (resultsSnapshot.empty) {
      return [];
    }

    const results = resultsSnapshot.docs.map((doc) => {
      const data = doc.data() as QuizResult;
      data.id = doc.id;
      return data;
    });

    const resultsByQuiz = new Map<string, QuizResult[]>();
    for (const result of results) {
      const quizResults = resultsByQuiz.get(result.quizId) || [];
      quizResults.push(result);
      resultsByQuiz.set(result.quizId, quizResults);
    }

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

const calculateQuizPoints = (result: QuizResult): number => {
  const basePoints = 10;
  const correctAnswerPoints = 5;
  const difficultyMultiplier = {
    easy: 1,
    medium: 1.5,
    hard: 2,
  };

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

const calculateLevel = (totalPoints: number): { level: number; pointsToNextLevel: number } => {
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

export const clearKnowledgeQuestCaches = async (): Promise<void> => {
  try {
    quizCache.clear();
    quizResultsCache.clear();
    statsCache = null;
    settingsCache = null;

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

const getDefaultSettings = (): KnowledgeQuestSettings => {
  return {
    lastRefreshedAt: 0,
    cacheExpiryDays: CACHE_EXPIRY_DAYS,
    dailyGoal: 1,
    dailyReminderEnabled: false,
  };
};

// services/LearnScreen/aiLanguageService.ts
import { generateContent } from "../Gemini/geminiService";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  Timestamp,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { Phrase, PhrasebookSettings } from "../../types/LearnScreen/LanguageTypes";
import { VisitedPlaceDetails } from "../../types/MapTypes";

// Constants
const PHRASEBOOK_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DAILY_REQUESTS = 5; // Maximum requests per day
const MAX_PHRASES_PER_REQUEST = 10; // Maximum phrases returned per request

// Add to PhrasebookSettings interface in LanguageTypes.ts
interface RequestLimitInfo {
  requestCount: number; // Number of requests made today
  lastRequestDate: string; // Date of last request (ISO string)
  nextAvailableTime?: string; // When user can make another request if at limit
}

/**
 * Check if user has reached their daily request limit
 */
export const checkRequestLimit = async (): Promise<{
  canRequest: boolean;
  requestsRemaining: number;
  nextAvailableTime?: string;
}> => {
  try {
    const settings = await getPhrasebookSettings();
    const requestLimits = settings.requestLimits || {
      requestCount: 0,
      lastRequestDate: new Date(0).toISOString(),
    };

    // Check if we're on a new day (reset counter)
    const lastDate = new Date(requestLimits.lastRequestDate);
    const today = new Date();
    const isNewDay =
      lastDate.getDate() !== today.getDate() ||
      lastDate.getMonth() !== today.getMonth() ||
      lastDate.getFullYear() !== today.getFullYear();

    if (isNewDay) {
      // Reset count for new day
      return {
        canRequest: true,
        requestsRemaining: MAX_DAILY_REQUESTS,
      };
    }

    // Check if limit reached
    const requestsRemaining = MAX_DAILY_REQUESTS - requestLimits.requestCount;
    return {
      canRequest: requestsRemaining > 0,
      requestsRemaining,
      nextAvailableTime: requestLimits.nextAvailableTime,
    };
  } catch (error) {
    console.error("Error checking request limit:", error);
    // Default to allowing requests on error
    return {
      canRequest: true,
      requestsRemaining: MAX_DAILY_REQUESTS,
    };
  }
};

/**
 * Update request counter after making a request
 */
export const updateRequestCounter = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const settings = await getPhrasebookSettings();
    const requestLimits = settings.requestLimits || {
      requestCount: 0,
      lastRequestDate: new Date(0).toISOString(),
    };

    // Check if we're on a new day (reset counter)
    const lastDate = new Date(requestLimits.lastRequestDate);
    const today = new Date();
    const isNewDay =
      lastDate.getDate() !== today.getDate() ||
      lastDate.getMonth() !== today.getMonth() ||
      lastDate.getFullYear() !== today.getFullYear();

    let newCount = isNewDay ? 1 : requestLimits.requestCount + 1;

    // Create base request limits object without the optional field
    let updatedRequestLimits: any = {
      requestCount: newCount,
      lastRequestDate: today.toISOString(),
    };

    if (newCount >= MAX_DAILY_REQUESTS) {
      // Calculate when next request will be available (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Only add nextAvailableTime field when it has a value
      updatedRequestLimits.nextAvailableTime = tomorrow.toISOString();
    }

    await updatePhrasebookSettings({
      requestLimits: updatedRequestLimits,
    });
  } catch (error) {
    console.error("Error updating request counter:", error);
  }
};

/**
 * Generate language phrases using Gemini AI with request limiting
 */
export const generateLanguagePhrases = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<Phrase[]> => {
  try {
    if (visitedPlaces.length === 0) {
      return [];
    }

    // Check request limit
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      throw new Error(
        `Daily request limit reached. Try again ${
          limitInfo.nextAvailableTime
            ? `after ${new Date(limitInfo.nextAvailableTime).toLocaleTimeString()}`
            : "tomorrow"
        }`
      );
    }

    // Extract locations from visited places
    const locations = visitedPlaces.map((place) => place.vicinity || "").filter(Boolean);

    if (locations.length === 0) {
      return [];
    }

    const prompt = `
      Create useful language phrases for a traveler who has visited these locations: ${locations.join(
        ", "
      )}.
      For each location, provide useful phrases in the local language.
      
      IMPORTANT: Return exactly 10 phrases TOTAL across all languages/locations. Do not exceed 10 phrases.
      
      Format your response as a JSON array with this structure:
      [
        {
          "language": "The local language name",
          "phrase": "The phrase in local language",
          "translation": "English translation",
          "useContext": "When to use this phrase",
          "pronunciation": "Simple pronunciation guide",
          "region": "Country or region where this phrase is used"
        }
      ]

      Focus on practical, common phrases that would be useful for tourists, like greetings, asking for directions, ordering food, etc.
      Make sure each phrase has a region field that specifies which country or region the phrase is from.
    `;

    const generatedPhrases = await generateContent({
      prompt,
      responseFormat: "json",
    });

    // Update request counter after successful request
    await updateRequestCounter();

    if (Array.isArray(generatedPhrases)) {
      // Limit to MAX_PHRASES_PER_REQUEST and add unique IDs and timestamps
      const limitedPhrases = generatedPhrases.slice(0, MAX_PHRASES_PER_REQUEST);
      return limitedPhrases.map((phrase, index) => ({
        ...phrase,
        id: `phrase-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      }));
    }

    return [];
  } catch (error) {
    console.error("Error generating language phrases:", error);
    throw error; // Re-throw to handle in UI
  }
};

// Fix the toggleFavoritePhrase function to handle missing phrases in phrases collection
export const toggleFavoritePhrase = async (
  phraseId: string,
  isFavorite: boolean,
  phrase: Phrase
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    // Update the phrase in phrases collection if it exists
    const phraseRef = doc(db, "users", currentUser.uid, "phrases", phraseId);
    const phraseDoc = await getDoc(phraseRef);

    if (phraseDoc.exists()) {
      await setDoc(
        phraseRef,
        {
          isFavorite: isFavorite,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      // If the phrase doesn't exist in phrases collection,
      // don't try to update it and don't log a warning
      // This happens with phrases from the savedPhrases collection
      console.log(`Phrase ${phraseId} not in phrases collection, skipping update`);
    }

    // Handle savedPhrases collection
    if (isFavorite) {
      // Add to saved phrases
      await savePhrase({
        ...phrase,
        isFavorite: true,
      });
    } else {
      // Remove from saved phrases
      const savedPhrasesRef = collection(db, "users", currentUser.uid, "savedPhrases");
      const q = query(
        savedPhrasesRef,
        where("phrase", "==", phrase.phrase),
        where("language", "==", phrase.language)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        await deleteDoc(querySnapshot.docs[0].ref);
      }
    }
  } catch (error) {
    console.error("Error toggling favorite phrase:", error);
    throw error;
  }
};

/**
 * Save a phrase to the user's savedPhrases collection
 */
export const savePhrase = async (phrase: Phrase): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const savedPhrasesRef = collection(db, "users", currentUser.uid, "savedPhrases");

    // Check if this phrase is already saved (to avoid duplicates)
    const q = query(
      savedPhrasesRef,
      where("phrase", "==", phrase.phrase),
      where("language", "==", phrase.language)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Phrase already exists, return its ID
      return querySnapshot.docs[0].id;
    }

    // Add new phrase
    const newPhraseDoc = await addDoc(savedPhrasesRef, {
      ...phrase,
      savedAt: new Date().toISOString(),
      isFavorite: true,
    });

    return newPhraseDoc.id;
  } catch (error) {
    console.error("Error saving phrase:", error);
    return null;
  }
};

/**
 * Remove a phrase from the user's savedPhrases collection
 */
export const removeSavedPhrase = async (phraseId: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    const phraseRef = doc(db, "users", currentUser.uid, "savedPhrases", phraseId);
    await deleteDoc(phraseRef);
    return true;
  } catch (error) {
    console.error("Error removing saved phrase:", error);
    return false;
  }
};

/**
 * Get all saved phrases for the current user
 */
export const getSavedPhrases = async (): Promise<Phrase[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    const savedPhrasesRef = collection(db, "users", currentUser.uid, "savedPhrases");
    const querySnapshot = await getDocs(savedPhrasesRef);

    return querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
      isFavorite: true, // All saved phrases are favorites
    })) as Phrase[];
  } catch (error) {
    console.error("Error getting saved phrases:", error);
    return [];
  }
};

/**
 * Get language phrases for visited places
 */
export const getLanguagePhrases = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<Phrase[]> => {
  try {
    // First, check if we have cached phrases
    const cachedPhrases = await getCachedPhrases();

    // Return cached phrases if they exist, regardless of whether they need refresh
    // Let the caller decide whether to refresh based on needsRefresh value
    if (cachedPhrases.phrases.length > 0) {
      console.log("Using cached phrases from Firebase");
      return cachedPhrases.phrases;
    }

    // No cached phrases, check request limit
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      console.log("Request limit reached and no cache available");
      return createMockPhrases(); // Return mock phrases if at limit with no cache
    }

    // Generate new phrases
    console.log("Generating new phrases via API");
    const phrases = await generateLanguagePhrases(visitedPlaces);

    // Cache the phrases for future use
    await cachePhrases(phrases);

    return phrases;
  } catch (error) {
    console.error("Error getting language phrases:", error);
    return createMockPhrases(); // Return mock phrases on error
  }
};

/**
 * Get phrases for a specific country/region
 */
export const getPhrasesForCountry = async (country: string): Promise<Phrase[]> => {
  try {
    // Check request limit before generating phrases
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      throw new Error(
        `Daily request limit reached. Try again ${
          limitInfo.nextAvailableTime
            ? `after ${new Date(limitInfo.nextAvailableTime).toLocaleTimeString()}`
            : "tomorrow"
        }`
      );
    }

    const prompt = `
      Create useful language phrases for a traveler visiting ${country}.
      Provide 5-7 useful phrases in the local language of ${country}.
      
      Format your response as a JSON array with this structure:
      [
        {
          "language": "The local language name",
          "phrase": "The phrase in local language",
          "translation": "English translation",
          "useContext": "When to use this phrase",
          "pronunciation": "Simple pronunciation guide",
          "region": "${country}",
          "category": "Category like greeting, food, emergency, etc."
        }
      ]

      Include a variety of practical phrases that would be useful for tourists, such as:
      - Greetings and basic expressions (hello, thank you, please, you're welcome)
      - Asking for directions
      - Ordering food and drinks
      - Shopping phrases
      - Emergency phrases
      - Transportation phrases
      - Cultural appreciation phrases
    `;

    const generatedPhrases = await generateContent({
      prompt,
      responseFormat: "json",
    });

    // Update request counter after successful request
    await updateRequestCounter();

    if (Array.isArray(generatedPhrases)) {
      // Add unique IDs and timestamps
      return generatedPhrases.map((phrase, index) => ({
        ...phrase,
        id: `phrase-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error generating phrases for ${country}:`, error);
    throw error; // Re-throw to handle in UI
  }
};

/**
 * Get a comprehensive phrasebook with more phrases for visited places
 */
export const getComprehensivePhrasebook = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<Phrase[]> => {
  try {
    // If no places visited, return empty array early
    if (visitedPlaces.length === 0) {
      return [];
    }

    // Extract locations from visited places for later use if needed
    const locations = visitedPlaces.map((place) => place.vicinity || "").filter(Boolean);
    if (locations.length === 0) {
      return [];
    }

    // Check if we have cached phrases first - but DON'T auto-fetch based on needsRefresh
    // Let the calling component decide what to do based on needsRefresh and requestLimits
    const cachedPhrases = await getCachedPhrases();
    if (cachedPhrases.phrases.length > 0) {
      console.log(
        `Found ${cachedPhrases.phrases.length} cached phrases, needsRefresh: ${cachedPhrases.needsRefresh}`
      );

      // We're changing this function to ALWAYS return cached phrases if they exist
      // The calling component will decide whether to make a new request based on needsRefresh
      return cachedPhrases.phrases;
    }

    // No cached phrases - check request limit before generating new ones
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      throw new Error(
        `Daily request limit reached. Try again ${
          limitInfo.nextAvailableTime
            ? `after ${new Date(limitInfo.nextAvailableTime).toLocaleTimeString()}`
            : "tomorrow"
        }`
      );
    }

    console.log("Generating new phrases via API request");

    const prompt = `
      Create a comprehensive phrasebook for a traveler who has visited these locations: ${locations.join(
        ", "
      )}.
      For each location, provide 5-7 useful phrases in the local language.
      
      Format your response as a JSON array with this structure:
      [
        {
          "language": "The local language name",
          "phrase": "The phrase in local language",
          "translation": "English translation",
          "useContext": "When to use this phrase",
          "pronunciation": "Simple pronunciation guide",
          "region": "Country or region where this phrase is used",
          "category": "Category like greeting, food, emergency, etc."
        }
      ]

      Include a variety of practical phrases that would be useful for tourists, such as:
      - Greetings and basic expressions (hello, thank you, please, you're welcome)
      - Asking for directions
      - Ordering food and drinks
      - Shopping phrases
      - Emergency phrases
      - Transportation phrases
      - Cultural appreciation phrases
    `;

    const generatedPhrases = await generateContent({
      prompt,
      responseFormat: "json",
    });

    // Update request counter after successful request
    await updateRequestCounter();

    if (Array.isArray(generatedPhrases)) {
      // Add unique IDs and timestamps
      const phrasesWithIds = generatedPhrases.map((phrase, index) => ({
        ...phrase,
        id: `phrase-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      }));

      // Cache the newly generated phrases
      await cachePhrases(phrasesWithIds);

      return phrasesWithIds;
    }

    return [];
  } catch (error) {
    console.error("Error generating comprehensive phrasebook:", error);
    throw error;
  }
};

/**
 * Get suggested countries to explore
 */
export const getSuggestedCountries = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<string[]> => {
  try {
    // Extract locations from visited places
    const locations = visitedPlaces.map((place) => place.vicinity || "").filter(Boolean);

    if (locations.length === 0) {
      // Return default countries if no places visited
      return ["France", "Italy", "Spain", "Japan", "Thailand"];
    }

    // Check for saved suggested countries first to avoid unnecessary API calls
    const settings = await getPhrasebookSettings();
    if (settings.explorableCountries && settings.explorableCountries.length > 0) {
      return settings.explorableCountries;
    }

    // Check request limit - suggestions count as a request too
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      // If limit reached, return default countries instead of throwing an error
      return ["France", "Italy", "Spain", "Japan", "Thailand"];
    }

    const prompt = `
      Based on these locations a traveler has visited: ${locations.join(", ")},
      suggest 5 other countries they might be interested in exploring.
      
      Return a JSON array of country names only, like: ["Country1", "Country2", "Country3", "Country4", "Country5"]
    `;

    const generatedCountries = await generateContent({
      prompt,
      responseFormat: "json",
    });

    // Update request counter after successful request
    await updateRequestCounter();

    if (Array.isArray(generatedCountries)) {
      // Save the suggested countries to avoid future API calls
      await updatePhrasebookSettings({
        explorableCountries: generatedCountries,
      });

      return generatedCountries;
    }

    return ["France", "Italy", "Spain", "Japan", "Thailand"];
  } catch (error) {
    console.error("Error generating suggested countries:", error);
    return ["France", "Italy", "Spain", "Japan", "Thailand"];
  }
};

/**
 * Get cached phrases from Firebase
 */
export const getCachedPhrases = async (): Promise<{ phrases: Phrase[]; needsRefresh: boolean }> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { phrases: [], needsRefresh: true };
    }

    // Get phrasebook settings
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "phrasebook");
    const settingsDoc = await getDoc(settingsRef);

    // Check if settings exist and if refresh is needed
    let needsRefresh = true;
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data() as PhrasebookSettings;
      const now = Date.now();
      const age = now - settings.lastUpdatedAt;

      // Log when the data was last updated
      const lastUpdateDate = new Date(settings.lastUpdatedAt).toLocaleString();
      console.log(
        `Last phrases update: ${lastUpdateDate}, age: ${(age / (60 * 60 * 1000)).toFixed(1)} hours`
      );

      if (age < PHRASEBOOK_REFRESH_INTERVAL) {
        needsRefresh = false;
      }
    }

    // Get phrases from subcollection
    const phrasesRef = collection(db, "users", currentUser.uid, "phrases");
    const querySnapshot = await getDocs(phrasesRef);

    if (querySnapshot.empty) {
      console.log("No phrases found in cache");
      return { phrases: [], needsRefresh: true };
    }

    const phrases = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      } as Phrase;
    });

    console.log(`Retrieved ${phrases.length} phrases from cache, needsRefresh: ${needsRefresh}`);
    return { phrases, needsRefresh };
  } catch (error) {
    console.error("Error getting cached phrases:", error);
    return { phrases: [], needsRefresh: true };
  }
};

/**
 * Cache phrases to Firebase
 */
export const cachePhrases = async (phrases: Phrase[]): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, cannot cache phrases");
      return;
    }

    // First, clear existing phrases that aren't favorites
    console.log("Clearing non-favorite phrases before caching new ones");
    await clearNonFavoritePhrases();

    // Add new phrases to subcollection
    const phrasesRef = collection(db, "users", currentUser.uid, "phrases");

    console.log(`Caching ${phrases.length} new phrases to Firebase`);
    for (const phrase of phrases) {
      // Check if this phrase is already in favorites
      // We don't want to overwrite favorite status
      const q = query(
        phrasesRef,
        where("phrase", "==", phrase.phrase),
        where("language", "==", phrase.language),
        where("isFavorite", "==", true)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Skip this phrase as it's already a favorite
        console.log(`Skipping phrase "${phrase.phrase}" as it's already a favorite`);
        continue;
      }

      await addDoc(phrasesRef, {
        ...phrase,
        updatedAt: new Date().toISOString(),
      });
    }

    // Update settings with last updated timestamp
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "phrasebook");
    const now = Date.now();
    await setDoc(
      settingsRef,
      {
        lastUpdatedAt: now,
        lastUpdatedAtReadable: new Date(now).toLocaleString(),
      },
      { merge: true }
    );

    console.log("Phrases cached successfully at", new Date(now).toLocaleString());
  } catch (error) {
    console.error("Error caching phrases:", error);
  }
};

/**
 * Clear non-favorite phrases from Firebase
 */
export const clearNonFavoritePhrases = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const phrasesRef = collection(db, "users", currentUser.uid, "phrases");
    const q = query(phrasesRef, where("isFavorite", "==", false));
    const querySnapshot = await getDocs(q);

    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref);
    }

    console.log(`Cleared ${querySnapshot.size} non-favorite phrases`);
  } catch (error) {
    console.error("Error clearing non-favorite phrases:", error);
  }
};

/**
 * Add a phrase from another country to the user's phrasebook
 */
export const addPhraseToPhrasebook = async (phrase: Phrase): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const phrasesRef = collection(db, "users", currentUser.uid, "phrases");

    const newPhraseDoc = await addDoc(phrasesRef, {
      ...phrase,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: true, // Default to favorite when manually added
    });

    return newPhraseDoc.id;
  } catch (error) {
    console.error("Error adding phrase to phrasebook:", error);
    return null;
  }
};

/**
 * Get all favorite phrases
 */
export const getFavoritePhrases = async (): Promise<Phrase[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    const phrasesRef = collection(db, "users", currentUser.uid, "phrases");
    const q = query(phrasesRef, where("isFavorite", "==", true));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
      } as Phrase;
    });
  } catch (error) {
    console.error("Error getting favorite phrases:", error);
    return [];
  }
};

/**
 * Get phrasebook settings
 */
export const getPhrasebookSettings = async (): Promise<PhrasebookSettings> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        lastUpdatedAt: 0,
        favoriteLanguages: [],
        explorableCountries: ["France", "Italy", "Spain", "Japan", "Thailand"],
      };
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "phrasebook");
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data() as PhrasebookSettings;
    } else {
      // Create default settings
      const defaultSettings = {
        lastUpdatedAt: 0,
        favoriteLanguages: [],
        explorableCountries: ["France", "Italy", "Spain", "Japan", "Thailand"],
      };

      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error("Error getting phrasebook settings:", error);
    return {
      lastUpdatedAt: 0,
      favoriteLanguages: [],
      explorableCountries: ["France", "Italy", "Spain", "Japan", "Thailand"],
    };
  }
};

/**
 * Update phrasebook settings
 */
export const updatePhrasebookSettings = async (
  settings: Partial<PhrasebookSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "phrasebook");
    await setDoc(settingsRef, settings, { merge: true });
  } catch (error) {
    console.error("Error updating phrasebook settings:", error);
  }
};

/**
 * Create mock phrases for fallback
 */
export const createMockPhrases = (): Phrase[] => {
  return [
    {
      id: "phrase-1",
      language: "French",
      phrase: "Bonjour, comment allez-vous?",
      translation: "Hello, how are you?",
      useContext: "General greeting",
      pronunciation: "Bon-zhoor, ko-mohn tah-lay voo",
      region: "France",
      category: "Greeting",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "phrase-2",
      language: "French",
      phrase: "Je voudrais un café, s'il vous plaît",
      translation: "I would like a coffee, please",
      useContext: "Ordering at a café",
      pronunciation: "Zhuh voo-dray uhn kah-fay, seel voo play",
      region: "France",
      category: "Food",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "phrase-3",
      language: "Italian",
      phrase: "Buongiorno, come stai?",
      translation: "Good morning, how are you?",
      useContext: "Morning greeting",
      pronunciation: "Bwon-jor-no, ko-may sty",
      region: "Italy",
      category: "Greeting",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "phrase-4",
      language: "Spanish",
      phrase: "¿Dónde está el museo?",
      translation: "Where is the museum?",
      useContext: "Asking for directions",
      pronunciation: "Don-deh eh-stah el moo-say-oh",
      region: "Spain",
      category: "Directions",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

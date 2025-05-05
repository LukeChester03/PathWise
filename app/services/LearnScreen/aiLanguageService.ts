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

const PHRASEBOOK_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_DAILY_REQUESTS = 5;
const MAX_PHRASES_PER_REQUEST = 10;

interface RequestLimitInfo {
  requestCount: number;
  lastRequestDate: string;
  nextAvailableTime?: string;
}

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

    const lastDate = new Date(requestLimits.lastRequestDate);
    const today = new Date();
    const isNewDay =
      lastDate.getDate() !== today.getDate() ||
      lastDate.getMonth() !== today.getMonth() ||
      lastDate.getFullYear() !== today.getFullYear();

    if (isNewDay) {
      return {
        canRequest: true,
        requestsRemaining: MAX_DAILY_REQUESTS,
      };
    }
    const requestsRemaining = MAX_DAILY_REQUESTS - requestLimits.requestCount;
    return {
      canRequest: requestsRemaining > 0,
      requestsRemaining,
      nextAvailableTime: requestLimits.nextAvailableTime,
    };
  } catch (error) {
    console.error("Error checking request limit:", error);
    return {
      canRequest: true,
      requestsRemaining: MAX_DAILY_REQUESTS,
    };
  }
};

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

    const lastDate = new Date(requestLimits.lastRequestDate);
    const today = new Date();
    const isNewDay =
      lastDate.getDate() !== today.getDate() ||
      lastDate.getMonth() !== today.getMonth() ||
      lastDate.getFullYear() !== today.getFullYear();

    let newCount = isNewDay ? 1 : requestLimits.requestCount + 1;

    let updatedRequestLimits: any = {
      requestCount: newCount,
      lastRequestDate: today.toISOString(),
    };

    if (newCount >= MAX_DAILY_REQUESTS) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      updatedRequestLimits.nextAvailableTime = tomorrow.toISOString();
    }

    await updatePhrasebookSettings({
      requestLimits: updatedRequestLimits,
    });
  } catch (error) {
    console.error("Error updating request counter:", error);
  }
};

export const generateLanguagePhrases = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<Phrase[]> => {
  try {
    if (visitedPlaces.length === 0) {
      return [];
    }
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

    await updateRequestCounter();

    if (Array.isArray(generatedPhrases)) {
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
    throw error;
  }
};

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
      console.log(`Phrase ${phraseId} not in phrases collection, skipping update`);
    }

    if (isFavorite) {
      await savePhrase({
        ...phrase,
        isFavorite: true,
      });
    } else {
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

export const savePhrase = async (phrase: Phrase): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const savedPhrasesRef = collection(db, "users", currentUser.uid, "savedPhrases");
    const q = query(
      savedPhrasesRef,
      where("phrase", "==", phrase.phrase),
      where("language", "==", phrase.language)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
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
      isFavorite: true,
    })) as Phrase[];
  } catch (error) {
    console.error("Error getting saved phrases:", error);
    return [];
  }
};

export const getLanguagePhrases = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<Phrase[]> => {
  try {
    const cachedPhrases = await getCachedPhrases();
    if (cachedPhrases.phrases.length > 0) {
      console.log("Using cached phrases from Firebase");
      return cachedPhrases.phrases;
    }
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      console.log("Request limit reached and no cache available");
      return createMockPhrases();
    }
    console.log("Generating new phrases via API");
    const phrases = await generateLanguagePhrases(visitedPlaces);
    await cachePhrases(phrases);

    return phrases;
  } catch (error) {
    console.error("Error getting language phrases:", error);
    return createMockPhrases();
  }
};

export const getPhrasesForCountry = async (country: string): Promise<Phrase[]> => {
  try {
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
    await updateRequestCounter();

    if (Array.isArray(generatedPhrases)) {
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
    throw error;
  }
};

export const getComprehensivePhrasebook = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<Phrase[]> => {
  try {
    if (visitedPlaces.length === 0) {
      return [];
    }
    const locations = visitedPlaces.map((place) => place.vicinity || "").filter(Boolean);
    if (locations.length === 0) {
      return [];
    }
    const cachedPhrases = await getCachedPhrases();
    if (cachedPhrases.phrases.length > 0) {
      console.log(
        `Found ${cachedPhrases.phrases.length} cached phrases, needsRefresh: ${cachedPhrases.needsRefresh}`
      );
      return cachedPhrases.phrases;
    }
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
    await updateRequestCounter();

    if (Array.isArray(generatedPhrases)) {
      const phrasesWithIds = generatedPhrases.map((phrase, index) => ({
        ...phrase,
        id: `phrase-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: false,
      }));
      await cachePhrases(phrasesWithIds);

      return phrasesWithIds;
    }

    return [];
  } catch (error) {
    console.error("Error generating comprehensive phrasebook:", error);
    throw error;
  }
};

export const getSuggestedCountries = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<string[]> => {
  try {
    const locations = visitedPlaces.map((place) => place.vicinity || "").filter(Boolean);

    if (locations.length === 0) {
      return ["France", "Italy", "Spain", "Japan", "Thailand"];
    }
    const settings = await getPhrasebookSettings();
    if (settings.explorableCountries && settings.explorableCountries.length > 0) {
      return settings.explorableCountries;
    }
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
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
    await updateRequestCounter();

    if (Array.isArray(generatedCountries)) {
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

export const getCachedPhrases = async (): Promise<{ phrases: Phrase[]; needsRefresh: boolean }> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { phrases: [], needsRefresh: true };
    }
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "phrasebook");
    const settingsDoc = await getDoc(settingsRef);
    let needsRefresh = true;
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data() as PhrasebookSettings;
      const now = Date.now();
      const age = now - settings.lastUpdatedAt;
      const lastUpdateDate = new Date(settings.lastUpdatedAt).toLocaleString();
      console.log(
        `Last phrases update: ${lastUpdateDate}, age: ${(age / (60 * 60 * 1000)).toFixed(1)} hours`
      );

      if (age < PHRASEBOOK_REFRESH_INTERVAL) {
        needsRefresh = false;
      }
    }
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

export const cachePhrases = async (phrases: Phrase[]): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("No user logged in, cannot cache phrases");
      return;
    }

    console.log("Clearing non-favorite phrases before caching new ones");
    await clearNonFavoritePhrases();
    const phrasesRef = collection(db, "users", currentUser.uid, "phrases");

    console.log(`Caching ${phrases.length} new phrases to Firebase`);
    for (const phrase of phrases) {
      const q = query(
        phrasesRef,
        where("phrase", "==", phrase.phrase),
        where("language", "==", phrase.language),
        where("isFavorite", "==", true)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        console.log(`Skipping phrase "${phrase.phrase}" as it's already a favorite`);
        continue;
      }

      await addDoc(phrasesRef, {
        ...phrase,
        updatedAt: new Date().toISOString(),
      });
    }
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
      isFavorite: true,
    });

    return newPhraseDoc.id;
  } catch (error) {
    console.error("Error adding phrase to phrasebook:", error);
    return null;
  }
};

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

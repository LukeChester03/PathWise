import { generateContent } from "../Gemini/geminiService";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../config/firebaseConfig";
import {
  CulturalInsight,
  CulturalContextSettings,
  RequestLimitInfo,
  EnhancedCulturalInsight,
  Recommendation,
} from "../../types/LearnScreen/CulturalContextTypes";
import { VisitedPlaceDetails } from "../../types/MapTypes";

const CULTURAL_CONTEXT_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_DAILY_REQUESTS = 10;
const ASYNC_STORAGE_PREFIX = "@cultural_insights:";
const ASYNC_STORAGE_SETTINGS_KEY = "@cultural_settings";
const memoryCache: Record<string, EnhancedCulturalInsight> = {};
let memoryCacheTimestamp = 0;
let memoryCacheSettings: CulturalContextSettings | null = null;

export const extractRegionFromVicinity = (vicinity: string): string | null => {
  if (!vicinity) return null;
  const cleanVicinity = vicinity.trim();
  const parts = cleanVicinity.split(",").map((part) => part.trim());
  if (parts.length === 1) {
    return formatRegionName(parts[0]);
  }
  if (parts.length >= 3) {
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      const postalCityMatch = part.match(/^\d+\s*(?:[A-Za-z]+\s+)+([A-Za-z\s]+)/);
      if (postalCityMatch && postalCityMatch[1]) {
        return formatRegionName(postalCityMatch[1]);
      }
      if (!/^\d+$/.test(part) && /[A-Za-z]/.test(part)) {
        return formatRegionName(part);
      }
    }
  }
  if (parts.length >= 3) {
    const potentialCity = parts[parts.length - 2];
    if (/[A-Za-z]/.test(potentialCity) && !/^\d+$/.test(potentialCity)) {
      return formatRegionName(potentialCity);
    }
  }
  if (parts.length === 2) {
    if (/[A-Za-z]/.test(parts[0]) && !/^\d+$/.test(parts[0])) {
      return formatRegionName(parts[0]);
    }
  }
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];
    if (/[A-Za-z]/.test(part) && !/^\d+$/.test(part)) {
      return formatRegionName(part);
    }
  }
  return formatRegionName(parts[parts.length - 1]);
};

export const formatRegionName = (regionName: string): string => {
  if (!regionName) return "Unknown Region";
  let formatted = regionName.split(/[-–—]/)[0].trim();
  formatted = formatted.replace(/\b\d{5}\b/, "");
  formatted = formatted.replace(/\b[A-Z]{2}\b/, "");

  formatted = formatted
    .replace(/ am Main\b/i, "")
    .replace(/ an der [A-Za-z]+\b/i, "")
    .replace(/ on the [A-Za-z]+\b/i, "")
    .replace(/ della [A-Za-z]+\b/i, "")
    .replace(/ di [A-Za-z]+\b/i, "")
    .replace(/ sur [A-Za-z]+\b/i, "")
    .replace(/ al [A-Za-z]+\b/i, "")
    .trim();

  formatted = formatted.replace(/\s+/g, " ").trim();
  return formatted || "Unknown Region";
};

export const extractAndValidateRegionsWithAI = async (
  addressStrings: string[]
): Promise<string[]> => {
  try {
    if (!addressStrings || addressStrings.length === 0) {
      return [];
    }

    console.log("Sending full addresses to AI for region extraction:", addressStrings);
    const prompt = `
      I have the following full address strings from places a user has visited:
      ${addressStrings.join("\n")}

      For each address, please identify and extract the most relevant region name for a traveler.
      This could be:
      - A city (like "Paris", "Rome", "Loughborough")
      - A county or province (like "Leicestershire", "Tuscany")
      - A distinct area or neighborhood if significant enough (like "Manhattan", "Montmartre")
      
      Guidelines:
      1. Pick the most culturally distinct and meaningful level for a traveler (usually the city, but sometimes a county or province)
      2. Use standardized English names where appropriate
      3. Remove any street addresses, building numbers, or postal codes
      4. Remove qualifiers like "am Main" from "Frankfurt am Main"
      5. Return only the cleanest form of the name (e.g., "Frankfurt", "Rome", "Loughborough", "Leicestershire")
      
      Return ONLY a JSON array of the extracted region names with duplicates removed.
      Example: ["Paris", "Rome", "Loughborough"]
      
      If you can't extract a valid region from an address, don't include it in the results.
    `;
    const validatedRegions = await generateContent({
      prompt,
      responseFormat: "json",
    });

    if (Array.isArray(validatedRegions) && validatedRegions.length > 0) {
      console.log("AI extracted these regions from full addresses:", validatedRegions);
      return validatedRegions;
    }

    console.log("AI region extraction failed, using basic extraction");
    return addressStrings
      .map((addr) => extractRegionFromVicinity(addr))
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("Error extracting regions with AI:", error);
    return addressStrings
      .map((addr) => extractRegionFromVicinity(addr))
      .filter(Boolean) as string[];
  }
};

export const checkRequestLimit = async (): Promise<{
  canRequest: boolean;
  requestsRemaining: number;
  nextAvailableTime?: string;
}> => {
  try {
    const settings = await getCulturalContextSettings();
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

    const settings = await getCulturalContextSettings();
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

    await updateCulturalContextSettings({
      requestLimits: updatedRequestLimits,
    });
  } catch (error) {
    console.error("Error updating request counter:", error);
  }
};

export const generateCulturalInsights = async (
  region: string
): Promise<EnhancedCulturalInsight> => {
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

    if (!region) {
      throw new Error("Region is required to generate cultural insights");
    }

    const prompt = `
      Create comprehensive cultural context information for a traveler visiting ${region}.
      Include information about local customs, traditions, cultural norms, appropriate behaviors, and historical context.
      Only include information you know is accurate and can be supported by real facts.
      Format your response as a JSON object with this structure:
      {
        "region": "${region}",
        "customs": [
          {
            "title": "Custom or tradition name",
            "description": "Detailed explanation of the custom or tradition"
          }
        ],
        "etiquette": "Description of appropriate behaviors and etiquette",
        "diningTips": "Tips for dining and eating in this region",
        "restaurants": [
          {
            "name": "Restaurant name",
            "description": "Brief description of the restaurant",
            "specialty": "What the restaurant is known for"
          }
        ],
        "bars": [
          {
            "name": "Bar or venue name",
            "description": "Brief description of the bar or venue",
            "specialty": "What the bar is known for"
          }
        ],
        "localTips": [
          "Practical tip 1",
          "Practical tip 2",
          "Practical tip 3",
          "Practical tip 4"
        ]
      }

      Include at least 4 customs or traditions in the customs array.
      Include at least 3 restaurant recommendations.
      Include at least 3 bar or nightlife venue recommendations.
      Include at least 4 practical local tips.
      Focus on authentic, specific information that would be useful for tourists.
    `;

    const generatedInsight = await generateContent({
      prompt,
      responseFormat: "json",
    });

    await updateRequestCounter();

    if (generatedInsight && typeof generatedInsight === "object") {
      const formattedRegion = formatRegionName(region);

      const baseInsight: CulturalInsight = {
        region: formattedRegion,
        customs: Array.isArray(generatedInsight.customs) ? generatedInsight.customs : [],
        etiquette: typeof generatedInsight.etiquette === "string" ? generatedInsight.etiquette : "",
        diningTips:
          typeof generatedInsight.diningTips === "string" ? generatedInsight.diningTips : "",
      };

      const enhancedInsight: EnhancedCulturalInsight = {
        ...baseInsight,
        restaurants: Array.isArray(generatedInsight.restaurants)
          ? generatedInsight.restaurants
          : generateFallbackRestaurants(formattedRegion),
        bars: Array.isArray(generatedInsight.bars)
          ? generatedInsight.bars
          : generateFallbackBars(formattedRegion),
        localTips: Array.isArray(generatedInsight.localTips)
          ? generatedInsight.localTips
          : generateFallbackLocalTips(formattedRegion),
      };

      return enhancedInsight;
    }

    throw new Error("Failed to generate cultural insights");
  } catch (error) {
    console.error("Error generating cultural insights:", error);
    throw error;
  }
};

export const getCulturalInsights = async (region: string): Promise<EnhancedCulturalInsight> => {
  try {
    const formattedRegion = formatRegionName(region);

    const memoryInsight = getFromMemoryCache(formattedRegion);
    if (memoryInsight) {
      console.log("Using in-memory cached cultural insights");
      return memoryInsight;
    }

    const asyncStorageInsight = await getFromAsyncStorage(formattedRegion);
    if (asyncStorageInsight) {
      addToMemoryCache(asyncStorageInsight);
      console.log("Using AsyncStorage cached cultural insights");
      return asyncStorageInsight;
    }

    const cachedInsight = await getCachedInsightForRegion(formattedRegion);
    if (cachedInsight) {
      const enhancedInsight = convertToEnhancedInsight(cachedInsight);

      addToMemoryCache(enhancedInsight);
      await saveToAsyncStorage(enhancedInsight);

      console.log("Using Firebase cached cultural insights");
      return enhancedInsight;
    }

    const insights = await generateCulturalInsights(region);

    addToMemoryCache(insights);
    await saveToAsyncStorage(insights);
    await cacheInsight(insights);

    return insights;
  } catch (error) {
    console.error("Error getting cultural insights:", error);
    throw error;
  }
};

export const getCulturalInsightsForVisitedPlaces = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<EnhancedCulturalInsight[]> => {
  try {
    if (!visitedPlaces || visitedPlaces.length === 0) {
      return [];
    }

    console.log(`Processing ${visitedPlaces.length} visited places for cultural insights`);

    const fullAddresses = visitedPlaces
      .map((place) => place.vicinity || "")
      .filter((addr) => addr.trim() !== "");

    if (fullAddresses.length === 0) {
      return [];
    }

    let regions: string[];
    try {
      regions = await extractAndValidateRegionsWithAI(fullAddresses);
    } catch (e) {
      console.error("AI region extraction failed, using basic extraction:", e);
      regions = fullAddresses
        .map((addr) => extractRegionFromVicinity(addr))
        .filter(Boolean) as string[];
    }

    const uniqueRegions = [...new Set(regions)];

    if (uniqueRegions.length === 0) {
      console.warn("No valid regions found after extraction");
      return [];
    }

    console.log(`Found ${uniqueRegions.length} unique regions:`, uniqueRegions);

    const insights: EnhancedCulturalInsight[] = [];

    for (const region of uniqueRegions) {
      try {
        const insight = await getCulturalInsights(region);
        insights.push(insight);
      } catch (error) {
        console.error(`Error getting insights for ${region}:`, error);
      }
    }

    return insights;
  } catch (error) {
    console.error("Error getting cultural insights for visited places:", error);
    return [];
  }
};

export const getSuggestedRegions = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<string[]> => {
  try {
    if (
      memoryCacheSettings?.explorableRegions &&
      memoryCacheSettings.explorableRegions.length > 0
    ) {
      console.log("Using memory cached regions");
      return memoryCacheSettings.explorableRegions;
    }
    const asyncSettings = await getSettingsFromAsyncStorage();
    if (asyncSettings?.explorableRegions && asyncSettings.explorableRegions.length > 0) {
      console.log("Using AsyncStorage cached regions");
      return asyncSettings.explorableRegions;
    }
    const settings = await getCulturalContextSettings();
    if (settings.explorableRegions && settings.explorableRegions.length > 0) {
      console.log("Using Firebase cached regions");
      return settings.explorableRegions;
    }
    const fullAddresses = visitedPlaces
      .map((place) => place.vicinity || "")
      .filter((addr) => addr.trim() !== "");

    if (fullAddresses.length === 0) {
      console.log("No addresses found, using default regions");
      return getDefaultExploreRegions();
    }
    let regions: string[];
    try {
      regions = await extractAndValidateRegionsWithAI(fullAddresses);
    } catch (e) {
      console.error("AI region extraction failed, using basic extraction:", e);
      regions = fullAddresses
        .map((addr) => extractRegionFromVicinity(addr))
        .filter(Boolean) as string[];
    }
    const uniqueRegions = [...new Set(regions)];

    if (uniqueRegions.length === 0) {
      console.warn("No valid regions found after extraction");
      return getDefaultExploreRegions();
    }
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      console.log("Request limit reached, using default regions");
      return getDefaultExploreRegions();
    }

    console.log("Generating suggested regions based on:", uniqueRegions.join(", "));
    const prompt = `
      Based on these locations a traveler has visited: ${uniqueRegions.join(", ")},
      suggest 5 other culturally distinct regions they might be interested in exploring.
      
      Return a JSON array of region names only, like: ["Region1", "Region2", "Region3", "Region4", "Region5"]
      Each region should be specific, like "Kyoto, Japan" rather than just "Japan".
    `;

    const generatedRegions = await generateContent({
      prompt,
      responseFormat: "json",
    });
    await updateRequestCounter();

    if (Array.isArray(generatedRegions)) {
      await updateCulturalContextSettings({
        explorableRegions: generatedRegions,
      });

      return generatedRegions;
    }

    return getDefaultExploreRegions();
  } catch (error) {
    console.error("Error generating suggested regions:", error);
    return getDefaultExploreRegions();
  }
};

export const getCachedInsightForRegion = async (
  region: string
): Promise<CulturalInsight | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }
    const formattedRegion = formatRegionName(region);
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const q = query(insightsRef, where("region", "==", formattedRegion));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const insightDoc = querySnapshot.docs[0];
    const insightData = insightDoc.data();
    const settings = await getCulturalContextSettings();
    const now = Date.now();
    const age = now - settings.lastUpdatedAt;

    if (age > CULTURAL_CONTEXT_REFRESH_INTERVAL) {
      return null;
    }
    if (
      !insightData.region ||
      !insightData.customs ||
      !insightData.etiquette ||
      !insightData.diningTips
    ) {
      console.warn(`Cached insight for ${formattedRegion} is missing required properties`);
      return null;
    }
    return {
      ...insightData,
      id: insightDoc.id,
    } as CulturalInsight;
  } catch (error) {
    console.error("Error getting cached insight for region:", error);
    return null;
  }
};

export const cacheInsight = async (insight: EnhancedCulturalInsight): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const insightWithFormattedRegion = {
      ...insight,
      region: formatRegionName(insight.region),
    };

    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const q = query(insightsRef, where("region", "==", insightWithFormattedRegion.region));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const insightDoc = querySnapshot.docs[0];
      await setDoc(
        insightDoc.ref,
        {
          ...insightWithFormattedRegion,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      await addDoc(insightsRef, {
        ...insightWithFormattedRegion,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "culturalContext");
    await setDoc(
      settingsRef,
      {
        lastUpdatedAt: Date.now(),
      },
      { merge: true }
    );

    console.log("Cultural insight cached successfully to Firebase");
  } catch (error) {
    console.error("Error caching cultural insight to Firebase:", error);
  }
};

export const getAllCachedInsights = async (): Promise<EnhancedCulturalInsight[]> => {
  try {
    const asyncStorageInsights = await getAllFromAsyncStorage();
    if (asyncStorageInsights.length > 0) {
      asyncStorageInsights.forEach((insight) => addToMemoryCache(insight));
      console.log("Using AsyncStorage for all cached insights");
      return asyncStorageInsights;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const querySnapshot = await getDocs(insightsRef);

    if (querySnapshot.empty) {
      return [];
    }
    const validInsights = querySnapshot.docs
      .map((doc) => {
        const data = doc.data();

        if (!data.region || !data.customs || !data.etiquette || !data.diningTips) {
          console.warn(`Cached insight ${doc.id} is missing required properties, skipping`);
          return null;
        }
        const baseInsight = {
          ...data,
          id: doc.id,
        } as CulturalInsight;

        return convertToEnhancedInsight(baseInsight);
      })
      .filter((insight): insight is EnhancedCulturalInsight => insight !== null);
    const formattedInsights = validInsights.map((insight) => ({
      ...insight,
      region: formatRegionName(insight.region),
    }));
    formattedInsights.forEach((insight) => {
      addToMemoryCache(insight);
      saveToAsyncStorage(insight).catch((error) =>
        console.error(`Error saving insight to AsyncStorage: ${error}`)
      );
    });

    return formattedInsights;
  } catch (error) {
    console.error("Error getting all cached insights:", error);
    return [];
  }
};

export const getCulturalContextSettings = async (): Promise<CulturalContextSettings> => {
  try {
    if (memoryCacheSettings) {
      return memoryCacheSettings;
    }
    const asyncSettings = await getSettingsFromAsyncStorage();
    if (asyncSettings) {
      memoryCacheSettings = asyncSettings;
      return asyncSettings;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return getDefaultSettings();
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "culturalContext");
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      const settings = settingsDoc.data() as CulturalContextSettings;
      memoryCacheSettings = settings;
      await saveSettingsToAsyncStorage(settings);

      return settings;
    } else {
      const defaultSettings = getDefaultSettings();
      await setDoc(settingsRef, defaultSettings);
      memoryCacheSettings = defaultSettings;
      await saveSettingsToAsyncStorage(defaultSettings);

      return defaultSettings;
    }
  } catch (error) {
    console.error("Error getting cultural context settings:", error);
    return getDefaultSettings();
  }
};

export const updateCulturalContextSettings = async (
  settings: Partial<CulturalContextSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "culturalContext");
    await setDoc(settingsRef, settings, { merge: true });

    const currentSettings = await getCulturalContextSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    memoryCacheSettings = updatedSettings;
    await saveSettingsToAsyncStorage(updatedSettings);

    console.log("Cultural context settings updated successfully");
  } catch (error) {
    console.error("Error updating cultural context settings:", error);
  }
};

export const createFallbackCulturalInsights = (regions: string[]): EnhancedCulturalInsight[] => {
  return regions.map((region) => {
    // Format the region name
    const formattedRegion = formatRegionName(region);

    return {
      region: formattedRegion,
      customs: [
        {
          title: "Traditional Greeting",
          description: "The common way people greet each other in this region.",
        },
        {
          title: "Local Customs",
          description: "General customs and traditions observed in daily life.",
        },
        {
          title: "Business Etiquette",
          description: "How business and formal interactions are typically conducted.",
        },
        {
          title: "Religious Practices",
          description: "Common religious customs and considerations for visitors.",
        },
      ],
      etiquette: "General etiquette guidelines for visitors to this region.",
      diningTips: "Common dining practices and food etiquette in this region.",
      restaurants: generateFallbackRestaurants(formattedRegion),
      bars: generateFallbackBars(formattedRegion),
      localTips: generateFallbackLocalTips(formattedRegion),
    };
  });
};

const addToMemoryCache = (insight: EnhancedCulturalInsight): void => {
  const formattedRegion = formatRegionName(insight.region);
  const key = formattedRegion.toLowerCase();
  const formattedInsight = {
    ...insight,
    region: formattedRegion,
  };

  memoryCache[key] = formattedInsight;
  memoryCacheTimestamp = Date.now();
};

const getFromMemoryCache = (region: string): EnhancedCulturalInsight | null => {
  const now = Date.now();
  const age = now - memoryCacheTimestamp;

  if (age > 10 * 60 * 1000) {
    Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
    return null;
  }
  const formattedRegion = formatRegionName(region);
  const key = formattedRegion.toLowerCase();
  return memoryCache[key] || null;
};

export const clearMemoryCache = (): void => {
  Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  memoryCacheSettings = null;
  memoryCacheTimestamp = 0;
};

const saveToAsyncStorage = async (insight: EnhancedCulturalInsight): Promise<void> => {
  try {
    const formattedRegion = formatRegionName(insight.region);
    const formattedInsight = {
      ...insight,
      region: formattedRegion,
    };
    const key = `${ASYNC_STORAGE_PREFIX}${formattedRegion.toLowerCase()}`;
    await AsyncStorage.setItem(key, JSON.stringify(formattedInsight));
  } catch (error) {
    console.error("Error saving to AsyncStorage:", error);
  }
};

const getFromAsyncStorage = async (region: string): Promise<EnhancedCulturalInsight | null> => {
  try {
    const formattedRegion = formatRegionName(region);
    const key = `${ASYNC_STORAGE_PREFIX}${formattedRegion.toLowerCase()}`;
    const jsonValue = await AsyncStorage.getItem(key);

    if (jsonValue) {
      return JSON.parse(jsonValue) as EnhancedCulturalInsight;
    }

    return null;
  } catch (error) {
    console.error("Error getting from AsyncStorage:", error);
    return null;
  }
};

const getAllFromAsyncStorage = async (): Promise<EnhancedCulturalInsight[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const insightKeys = keys.filter((key) => key.startsWith(ASYNC_STORAGE_PREFIX));

    if (insightKeys.length === 0) {
      return [];
    }

    const jsonValues = await AsyncStorage.multiGet(insightKeys);
    const insights: EnhancedCulturalInsight[] = [];

    for (const [key, value] of jsonValues) {
      if (value) {
        const insight = JSON.parse(value) as EnhancedCulturalInsight;
        insight.region = formatRegionName(insight.region);
        insights.push(insight);
      }
    }

    return insights;
  } catch (error) {
    console.error("Error getting all insights from AsyncStorage:", error);
    return [];
  }
};

const saveSettingsToAsyncStorage = async (settings: CulturalContextSettings): Promise<void> => {
  try {
    const formattedSettings = { ...settings };
    if (formattedSettings.explorableRegions) {
      formattedSettings.explorableRegions = formattedSettings.explorableRegions.map((region) =>
        formatRegionName(region)
      );
    }

    await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(formattedSettings));
  } catch (error) {
    console.error("Error saving settings to AsyncStorage:", error);
  }
};

const getSettingsFromAsyncStorage = async (): Promise<CulturalContextSettings | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);

    if (jsonValue) {
      const settings = JSON.parse(jsonValue) as CulturalContextSettings;
      if (settings.explorableRegions) {
        settings.explorableRegions = settings.explorableRegions.map((region) =>
          formatRegionName(region)
        );
      }

      return settings;
    }

    return null;
  } catch (error) {
    console.error("Error getting settings from AsyncStorage:", error);
    return null;
  }
};

export const clearAsyncStorageCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const insightKeys = keys.filter(
      (key) => key.startsWith(ASYNC_STORAGE_PREFIX) || key === ASYNC_STORAGE_SETTINGS_KEY
    );

    if (insightKeys.length > 0) {
      await AsyncStorage.multiRemove(insightKeys);
    }
  } catch (error) {
    console.error("Error clearing AsyncStorage cache:", error);
  }
};

const getDefaultSettings = (): CulturalContextSettings => {
  return {
    lastUpdatedAt: 0,
    explorableRegions: getDefaultExploreRegions(),
  };
};

const getDefaultExploreRegions = (): string[] => {
  return ["Paris", "Rome", "Tokyo", "Istanbul", "Marrakech"];
};

const convertToEnhancedInsight = (insight: CulturalInsight): EnhancedCulturalInsight => {
  const formattedRegion = formatRegionName(insight.region);
  const enhancedInsight: EnhancedCulturalInsight = {
    ...insight,
    region: formattedRegion,
  };
  if (!enhancedInsight.restaurants) {
    enhancedInsight.restaurants = generateFallbackRestaurants(formattedRegion);
  }

  if (!enhancedInsight.bars) {
    enhancedInsight.bars = generateFallbackBars(formattedRegion);
  }

  if (!enhancedInsight.localTips) {
    enhancedInsight.localTips = generateFallbackLocalTips(formattedRegion);
  }

  return enhancedInsight;
};

const generateFallbackRestaurants = (region: string): Recommendation[] => {
  const formattedRegion = formatRegionName(region);

  return [
    {
      name: `${formattedRegion} Traditional Restaurant`,
      description: `A local establishment serving authentic cuisine from the ${formattedRegion} region.`,
      specialty: `Local specialties prepared using traditional methods and ingredients.`,
    },
    {
      name: `${formattedRegion} Fine Dining`,
      description: `An upscale dining experience featuring contemporary interpretations of local cuisine.`,
      specialty: `Seasonal tasting menus showcasing regional ingredients.`,
    },
    {
      name: `${formattedRegion} Street Food`,
      description: `A casual spot where locals go for authentic and affordable regional dishes.`,
      specialty: `Quick, flavorful dishes that represent the area's culinary heritage.`,
    },
  ];
};

const generateFallbackBars = (region: string): Recommendation[] => {
  const formattedRegion = formatRegionName(region);

  return [
    {
      name: `${formattedRegion} Historic Bar`,
      description: `A traditional drinking establishment with historical significance to the area.`,
      specialty: `Local spirits and beverages served in a authentic atmosphere.`,
    },
    {
      name: `${formattedRegion} Modern Lounge`,
      description: `A contemporary venue popular with locals and visitors alike.`,
      specialty: `Craft cocktails inspired by local ingredients and traditions.`,
    },
    {
      name: `${formattedRegion} Night Spot`,
      description: `A lively venue where you can experience the local nightlife scene.`,
      specialty: `Regional drinks and a vibrant social atmosphere.`,
    },
  ];
};

const generateFallbackLocalTips = (region: string): string[] => {
  const formattedRegion = formatRegionName(region);
  return [
    `When visiting attractions in ${formattedRegion}, arrive early in the morning to avoid crowds.`,
    `Public transportation is generally a convenient way to get around ${formattedRegion}.`,
    `Learning a few basic phrases in the local language is appreciated by residents of ${formattedRegion}.`,
    `Weather in ${formattedRegion} can vary by season, so check conditions before your trip.`,
  ];
};

export const clearAllCaches = async (): Promise<void> => {
  clearMemoryCache();
  await clearAsyncStorageCache();
  console.log("All cultural insights caches cleared");
};

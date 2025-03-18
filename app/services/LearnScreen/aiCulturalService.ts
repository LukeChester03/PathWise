// services/LearnScreen/aiCulturalService.ts
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

// Constants
const CULTURAL_CONTEXT_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_DAILY_REQUESTS = 5; // Maximum requests per day
const ASYNC_STORAGE_PREFIX = "@cultural_insights:";
const ASYNC_STORAGE_SETTINGS_KEY = "@cultural_settings";

// In-memory cache for faster repeated access
const memoryCache: Record<string, EnhancedCulturalInsight> = {};
let memoryCacheTimestamp = 0;
let memoryCacheSettings: CulturalContextSettings | null = null;

/**
 * Check if user has reached their daily request limit
 */
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

    const settings = await getCulturalContextSettings();
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

    await updateCulturalContextSettings({
      requestLimits: updatedRequestLimits,
    });
  } catch (error) {
    console.error("Error updating request counter:", error);
  }
};

/**
 * Generate cultural context insights using Gemini AI with request limiting
 */
export const generateCulturalInsights = async (
  region: string
): Promise<EnhancedCulturalInsight> => {
  try {
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

    if (!region) {
      throw new Error("Region is required to generate cultural insights");
    }

    const prompt = `
      Create comprehensive cultural context information for a traveler visiting ${region}.
      Include information about local customs, traditions, cultural norms, appropriate behaviors, and historical context.
      
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

    // Update request counter after successful request
    await updateRequestCounter();

    if (generatedInsight && typeof generatedInsight === "object") {
      // Start with the base insight properties
      const baseInsight: CulturalInsight = {
        region: region,
        customs: Array.isArray(generatedInsight.customs) ? generatedInsight.customs : [],
        etiquette: typeof generatedInsight.etiquette === "string" ? generatedInsight.etiquette : "",
        diningTips:
          typeof generatedInsight.diningTips === "string" ? generatedInsight.diningTips : "",
      };

      // Create an enhanced insight with additional properties
      const enhancedInsight: EnhancedCulturalInsight = {
        ...baseInsight,
        restaurants: Array.isArray(generatedInsight.restaurants)
          ? generatedInsight.restaurants
          : generateFallbackRestaurants(region),
        bars: Array.isArray(generatedInsight.bars)
          ? generatedInsight.bars
          : generateFallbackBars(region),
        localTips: Array.isArray(generatedInsight.localTips)
          ? generatedInsight.localTips
          : generateFallbackLocalTips(region),
      };

      return enhancedInsight;
    }

    throw new Error("Failed to generate cultural insights");
  } catch (error) {
    console.error("Error generating cultural insights:", error);
    throw error; // Re-throw to handle in UI
  }
};

/**
 * Get cultural insights for a region using multi-level caching
 */
export const getCulturalInsights = async (region: string): Promise<EnhancedCulturalInsight> => {
  try {
    // 1. Try memory cache first (fastest)
    const memoryInsight = getFromMemoryCache(region);
    if (memoryInsight) {
      console.log("Using in-memory cached cultural insights");
      return memoryInsight;
    }

    // 2. Try AsyncStorage next (fast, persistent)
    const asyncStorageInsight = await getFromAsyncStorage(region);
    if (asyncStorageInsight) {
      // Add to memory cache for future requests
      addToMemoryCache(asyncStorageInsight);
      console.log("Using AsyncStorage cached cultural insights");
      return asyncStorageInsight;
    }

    // 3. Try Firebase cache (slower, synced)
    const cachedInsight = await getCachedInsightForRegion(region);
    if (cachedInsight) {
      // Convert to enhanced insight
      const enhancedInsight = convertToEnhancedInsight(cachedInsight);

      // Add to both memory and AsyncStorage caches
      addToMemoryCache(enhancedInsight);
      await saveToAsyncStorage(enhancedInsight);

      console.log("Using Firebase cached cultural insights");
      return enhancedInsight;
    }

    // 4. Generate new insights (slowest, counts against quota)
    const insights = await generateCulturalInsights(region);

    // Cache the insights at all levels
    addToMemoryCache(insights);
    await saveToAsyncStorage(insights);
    await cacheInsight(insights);

    return insights;
  } catch (error) {
    console.error("Error getting cultural insights:", error);
    throw error;
  }
};

/**
 * Get cultural insights for visited places with multi-level caching
 */
export const getCulturalInsightsForVisitedPlaces = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<EnhancedCulturalInsight[]> => {
  try {
    // Extract locations from visited places
    const locations = visitedPlaces
      .map((place) => {
        const vicinity = place.vicinity || "";
        // Extract country or city from vicinity (usually in format "City, Country")
        const parts = vicinity.split(",");
        return parts.length > 1 ? parts[parts.length - 1].trim() : vicinity.trim();
      })
      .filter(Boolean);

    // Remove duplicates
    const uniqueLocations = [...new Set(locations)];

    if (uniqueLocations.length === 0) {
      return [];
    }

    // Get insights for each location
    const insights: EnhancedCulturalInsight[] = [];

    for (const location of uniqueLocations) {
      try {
        const insight = await getCulturalInsights(location);
        insights.push(insight);
      } catch (error) {
        console.error(`Error getting insights for ${location}:`, error);
        // Continue with other locations
      }
    }

    return insights;
  } catch (error) {
    console.error("Error getting cultural insights for visited places:", error);
    return [];
  }
};

/**
 * Get suggested regions to explore using multi-level caching
 */
export const getSuggestedRegions = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<string[]> => {
  try {
    // Extract locations from visited places
    const locations = visitedPlaces.map((place) => place.vicinity || "").filter(Boolean);

    if (locations.length === 0) {
      // Return default regions if no places visited
      return getDefaultExploreRegions();
    }

    // Check memory cache for settings
    if (
      memoryCacheSettings?.explorableRegions &&
      memoryCacheSettings.explorableRegions.length > 0
    ) {
      return memoryCacheSettings.explorableRegions;
    }

    // Check AsyncStorage for settings
    const asyncSettings = await getSettingsFromAsyncStorage();
    if (asyncSettings?.explorableRegions && asyncSettings.explorableRegions.length > 0) {
      return asyncSettings.explorableRegions;
    }

    // Check for saved suggested regions in Firebase
    const settings = await getCulturalContextSettings();
    if (settings.explorableRegions && settings.explorableRegions.length > 0) {
      return settings.explorableRegions;
    }

    // Check request limit - suggestions count as a request too
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      // If limit reached, return default regions
      return getDefaultExploreRegions();
    }

    const prompt = `
      Based on these locations a traveler has visited: ${locations.join(", ")},
      suggest 5 other culturally distinct regions they might be interested in exploring.
      
      Return a JSON array of region names only, like: ["Region1", "Region2", "Region3", "Region4", "Region5"]
      Each region should be specific, like "Kyoto, Japan" rather than just "Japan".
    `;

    const generatedRegions = await generateContent({
      prompt,
      responseFormat: "json",
    });

    // Update request counter after successful request
    await updateRequestCounter();

    if (Array.isArray(generatedRegions)) {
      // Save the suggested regions to all cache levels
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

/**
 * Get cached insight for a specific region from Firebase
 */
export const getCachedInsightForRegion = async (
  region: string
): Promise<CulturalInsight | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    // Get cultural insights collection
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const q = query(insightsRef, where("region", "==", region));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    // Get the first matching insight
    const insightDoc = querySnapshot.docs[0];
    const insightData = insightDoc.data();

    // Check if the insight needs to be refreshed
    const settings = await getCulturalContextSettings();
    const now = Date.now();
    const age = now - settings.lastUpdatedAt;

    if (age > CULTURAL_CONTEXT_REFRESH_INTERVAL) {
      // Insight is too old, should refresh
      return null;
    }

    // Check if insightData has all required properties of CulturalInsight
    if (
      !insightData.region ||
      !insightData.customs ||
      !insightData.etiquette ||
      !insightData.diningTips
    ) {
      console.warn(`Cached insight for ${region} is missing required properties`);
      return null;
    }

    // Now it's safe to cast to CulturalInsight
    return {
      ...insightData,
      id: insightDoc.id,
    } as CulturalInsight;
  } catch (error) {
    console.error("Error getting cached insight for region:", error);
    return null;
  }
};

/**
 * Cache insight to Firebase
 */
export const cacheInsight = async (insight: EnhancedCulturalInsight): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    // Add or update insight in subcollection
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const q = query(insightsRef, where("region", "==", insight.region));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Update existing insight
      const insightDoc = querySnapshot.docs[0];
      await setDoc(
        insightDoc.ref,
        {
          ...insight,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } else {
      // Add new insight
      await addDoc(insightsRef, {
        ...insight,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Update settings with last updated timestamp
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

/**
 * Get all cached cultural insights with multi-level caching
 */
export const getAllCachedInsights = async (): Promise<EnhancedCulturalInsight[]> => {
  try {
    // First try to get all insights from AsyncStorage
    const asyncStorageInsights = await getAllFromAsyncStorage();
    if (asyncStorageInsights.length > 0) {
      // Update memory cache for future requests
      asyncStorageInsights.forEach((insight) => addToMemoryCache(insight));
      console.log("Using AsyncStorage for all cached insights");
      return asyncStorageInsights;
    }

    // If AsyncStorage is empty, try Firebase
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return [];
    }

    // Get cultural insights collection
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const querySnapshot = await getDocs(insightsRef);

    if (querySnapshot.empty) {
      return [];
    }

    // Filter out documents that don't have the required properties
    const validInsights = querySnapshot.docs
      .map((doc) => {
        const data = doc.data();

        // Check if data has all required properties of CulturalInsight
        if (!data.region || !data.customs || !data.etiquette || !data.diningTips) {
          console.warn(`Cached insight ${doc.id} is missing required properties, skipping`);
          return null;
        }

        // Enhance with additional fields if needed
        const baseInsight = {
          ...data,
          id: doc.id,
        } as CulturalInsight;

        return convertToEnhancedInsight(baseInsight);
      })
      .filter((insight): insight is EnhancedCulturalInsight => insight !== null);

    // Cache these insights in AsyncStorage and memory for future requests
    validInsights.forEach((insight) => {
      addToMemoryCache(insight);
      saveToAsyncStorage(insight).catch((error) =>
        console.error(`Error saving insight to AsyncStorage: ${error}`)
      );
    });

    return validInsights;
  } catch (error) {
    console.error("Error getting all cached insights:", error);
    return [];
  }
};

/**
 * Get cultural context settings with multi-level caching
 */
export const getCulturalContextSettings = async (): Promise<CulturalContextSettings> => {
  try {
    // Check memory cache first
    if (memoryCacheSettings) {
      return memoryCacheSettings;
    }

    // Then try AsyncStorage
    const asyncSettings = await getSettingsFromAsyncStorage();
    if (asyncSettings) {
      memoryCacheSettings = asyncSettings;
      return asyncSettings;
    }

    // Finally, try Firebase
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return getDefaultSettings();
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "culturalContext");
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      const settings = settingsDoc.data() as CulturalContextSettings;

      // Cache in memory and AsyncStorage
      memoryCacheSettings = settings;
      await saveSettingsToAsyncStorage(settings);

      return settings;
    } else {
      // Create default settings
      const defaultSettings = getDefaultSettings();

      await setDoc(settingsRef, defaultSettings);

      // Cache in memory and AsyncStorage
      memoryCacheSettings = defaultSettings;
      await saveSettingsToAsyncStorage(defaultSettings);

      return defaultSettings;
    }
  } catch (error) {
    console.error("Error getting cultural context settings:", error);
    return getDefaultSettings();
  }
};

/**
 * Update cultural context settings with multi-level caching
 */
export const updateCulturalContextSettings = async (
  settings: Partial<CulturalContextSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    // Update Firebase
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "culturalContext");
    await setDoc(settingsRef, settings, { merge: true });

    // Get the current settings to update memory and AsyncStorage
    const currentSettings = await getCulturalContextSettings();
    const updatedSettings = { ...currentSettings, ...settings };

    // Update memory cache
    memoryCacheSettings = updatedSettings;

    // Update AsyncStorage
    await saveSettingsToAsyncStorage(updatedSettings);

    console.log("Cultural context settings updated successfully");
  } catch (error) {
    console.error("Error updating cultural context settings:", error);
  }
};

/**
 * Create AI-generated fallback cultural insights when data is missing
 */
export const createFallbackCulturalInsights = (regions: string[]): EnhancedCulturalInsight[] => {
  return regions.map((region) => ({
    region,
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
    restaurants: generateFallbackRestaurants(region),
    bars: generateFallbackBars(region),
    localTips: generateFallbackLocalTips(region),
  }));
};

// ======== Memory Caching Functions ========

/**
 * Add insight to memory cache
 */
const addToMemoryCache = (insight: EnhancedCulturalInsight): void => {
  // Normalize region name as key (lowercase)
  const key = insight.region.toLowerCase();
  memoryCache[key] = insight;
  memoryCacheTimestamp = Date.now();
};

/**
 * Get insight from memory cache
 */
const getFromMemoryCache = (region: string): EnhancedCulturalInsight | null => {
  // Check if cache is still valid (less than 10 minutes old)
  const now = Date.now();
  const age = now - memoryCacheTimestamp;

  if (age > 10 * 60 * 1000) {
    // Clear cache if it's more than 10 minutes old
    Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
    return null;
  }

  // Normalize region name as key (lowercase)
  const key = region.toLowerCase();
  return memoryCache[key] || null;
};

/**
 * Clear memory cache
 */
export const clearMemoryCache = (): void => {
  Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  memoryCacheSettings = null;
  memoryCacheTimestamp = 0;
};

// ======== AsyncStorage Functions ========

/**
 * Save insight to AsyncStorage
 */
const saveToAsyncStorage = async (insight: EnhancedCulturalInsight): Promise<void> => {
  try {
    // Normalize region name as key (lowercase)
    const key = `${ASYNC_STORAGE_PREFIX}${insight.region.toLowerCase()}`;
    await AsyncStorage.setItem(key, JSON.stringify(insight));
  } catch (error) {
    console.error("Error saving to AsyncStorage:", error);
  }
};

/**
 * Get insight from AsyncStorage
 */
const getFromAsyncStorage = async (region: string): Promise<EnhancedCulturalInsight | null> => {
  try {
    // Normalize region name as key (lowercase)
    const key = `${ASYNC_STORAGE_PREFIX}${region.toLowerCase()}`;
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

/**
 * Get all insights from AsyncStorage
 */
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
        insights.push(JSON.parse(value) as EnhancedCulturalInsight);
      }
    }

    return insights;
  } catch (error) {
    console.error("Error getting all insights from AsyncStorage:", error);
    return [];
  }
};

/**
 * Save settings to AsyncStorage
 */
const saveSettingsToAsyncStorage = async (settings: CulturalContextSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings to AsyncStorage:", error);
  }
};

/**
 * Get settings from AsyncStorage
 */
const getSettingsFromAsyncStorage = async (): Promise<CulturalContextSettings | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);

    if (jsonValue) {
      return JSON.parse(jsonValue) as CulturalContextSettings;
    }

    return null;
  } catch (error) {
    console.error("Error getting settings from AsyncStorage:", error);
    return null;
  }
};

/**
 * Clear AsyncStorage cache
 */
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

// ======== Helper Functions ========

/**
 * Get default settings object
 */
const getDefaultSettings = (): CulturalContextSettings => {
  return {
    lastUpdatedAt: 0,
    explorableRegions: getDefaultExploreRegions(),
  };
};

/**
 * Get default regions for exploration
 */
const getDefaultExploreRegions = (): string[] => {
  return ["Paris, France", "Rome, Italy", "Tokyo, Japan", "Istanbul, Turkey", "Marrakech, Morocco"];
};

/**
 * Convert basic cultural insight to enhanced version
 */
const convertToEnhancedInsight = (insight: CulturalInsight): EnhancedCulturalInsight => {
  // Start with the base insight
  const enhancedInsight: EnhancedCulturalInsight = { ...insight };

  // Add enhanced properties if they don't exist
  if (!enhancedInsight.restaurants) {
    enhancedInsight.restaurants = generateFallbackRestaurants(insight.region);
  }

  if (!enhancedInsight.bars) {
    enhancedInsight.bars = generateFallbackBars(insight.region);
  }

  if (!enhancedInsight.localTips) {
    enhancedInsight.localTips = generateFallbackLocalTips(insight.region);
  }

  return enhancedInsight;
};

/**
 * Generate fallback restaurant recommendations based on region
 */
const generateFallbackRestaurants = (region: string): Recommendation[] => {
  // Extract city/country from region
  const locationName = region.split(",")[0].trim();

  return [
    {
      name: `${locationName} Traditional Restaurant`,
      description: `A local establishment serving authentic cuisine from the ${locationName} region.`,
      specialty: `Local specialties prepared using traditional methods and ingredients.`,
    },
    {
      name: `${locationName} Fine Dining`,
      description: `An upscale dining experience featuring contemporary interpretations of local cuisine.`,
      specialty: `Seasonal tasting menus showcasing regional ingredients.`,
    },
    {
      name: `${locationName} Street Food`,
      description: `A casual spot where locals go for authentic and affordable regional dishes.`,
      specialty: `Quick, flavorful dishes that represent the area's culinary heritage.`,
    },
  ];
};

/**
 * Generate fallback bar recommendations based on region
 */
const generateFallbackBars = (region: string): Recommendation[] => {
  // Extract city/country from region
  const locationName = region.split(",")[0].trim();

  return [
    {
      name: `${locationName} Historic Bar`,
      description: `A traditional drinking establishment with historical significance to the area.`,
      specialty: `Local spirits and beverages served in a authentic atmosphere.`,
    },
    {
      name: `${locationName} Modern Lounge`,
      description: `A contemporary venue popular with locals and visitors alike.`,
      specialty: `Craft cocktails inspired by local ingredients and traditions.`,
    },
    {
      name: `${locationName} Night Spot`,
      description: `A lively venue where you can experience the local nightlife scene.`,
      specialty: `Regional drinks and a vibrant social atmosphere.`,
    },
  ];
};

/**
 * Generate fallback local tips based on region
 */
const generateFallbackLocalTips = (region: string): string[] => {
  // Extract city/country from region
  const locationName = region.split(",")[0].trim();

  return [
    `When visiting attractions in ${locationName}, arrive early in the morning to avoid crowds.`,
    `Public transportation is generally a convenient way to get around ${locationName}.`,
    `Learning a few basic phrases in the local language is appreciated by residents of ${locationName}.`,
    `Weather in ${locationName} can vary by season, so check conditions before your trip.`,
  ];
};

/**
 * Clear all caches (memory and AsyncStorage)
 */
export const clearAllCaches = async (): Promise<void> => {
  clearMemoryCache();
  await clearAsyncStorageCache();
  console.log("All cultural insights caches cleared");
};

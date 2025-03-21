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
const MAX_DAILY_REQUESTS = 10; // Maximum requests per day
const ASYNC_STORAGE_PREFIX = "@cultural_insights:";
const ASYNC_STORAGE_SETTINGS_KEY = "@cultural_settings";

// In-memory cache for faster repeated access
const memoryCache: Record<string, EnhancedCulturalInsight> = {};
let memoryCacheTimestamp = 0;
let memoryCacheSettings: CulturalContextSettings | null = null;

/**
 * Extracts the region name from an address or vicinity string.
 * Intelligently handles various address formats to find the actual city/region.
 *
 * Examples:
 * - "Piazza Venezia, 5, 00186 Roma RM, Italy" -> "Roma"
 * - "123 Main St, Frankfurt am Main, Germany" -> "Frankfurt"
 * - "Unter den Linden 77, 10117 Berlin, Germany" -> "Berlin"
 */
export const extractRegionFromVicinity = (vicinity: string): string | null => {
  if (!vicinity) return null;

  // Clean up the vicinity string
  const cleanVicinity = vicinity.trim();

  // Split by commas
  const parts = cleanVicinity.split(",").map((part) => part.trim());

  // If there's only one part, return it formatted
  if (parts.length === 1) {
    return formatRegionName(parts[0]);
  }

  // Check if we have a proper address with city and country
  // Most address formats will have the city in parts before the country
  // Usually 2nd to last or 3rd to last element has the city

  // Handle common patterns:

  // Pattern 1: Full address with postal code: "Street, Number, Postal City, Country"
  // Example: "Piazza Venezia, 5, 00186 Roma RM, Italy"
  // The city part typically contains postal code followed by city name
  if (parts.length >= 3) {
    // Check each part from position 2 onwards for city patterns
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];

      // Look for parts that have postal codes followed by city names
      // Postal code patterns (digits followed by letters or spaces then letters)
      const postalCityMatch = part.match(/^\d+\s*(?:[A-Za-z]+\s+)+([A-Za-z\s]+)/);
      if (postalCityMatch && postalCityMatch[1]) {
        return formatRegionName(postalCityMatch[1]);
      }

      // Check if this part contains letters (likely a city name, not just a number)
      // Exclude parts that are just numbers or postal codes
      if (!/^\d+$/.test(part) && /[A-Za-z]/.test(part)) {
        // If we find a part with letters after position 1, it's likely a city or region
        return formatRegionName(part);
      }
    }
  }

  // Pattern 2: Basic address: "Street, City, Country"
  // The city is typically the second-to-last part
  if (parts.length >= 3) {
    const potentialCity = parts[parts.length - 2];
    // Check if it looks like a city name (contains letters, not just numbers)
    if (/[A-Za-z]/.test(potentialCity) && !/^\d+$/.test(potentialCity)) {
      return formatRegionName(potentialCity);
    }
  }

  // Pattern 3: Simple format with just "City, Country"
  if (parts.length === 2) {
    // First part could be the city if it's not just a number
    if (/[A-Za-z]/.test(parts[0]) && !/^\d+$/.test(parts[0])) {
      return formatRegionName(parts[0]);
    }
  }

  // Pattern 4: Complex format with multiple parts, look for the last part with alphabetic characters
  // before the country
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];
    // Find a part that's not just numbers and has letters
    if (/[A-Za-z]/.test(part) && !/^\d+$/.test(part)) {
      return formatRegionName(part);
    }
  }

  // Fallback: Use the last part (usually the country) if everything else fails
  return formatRegionName(parts[parts.length - 1]);
};

/**
 * Formats a region name for display by removing unnecessary qualifiers
 */
export const formatRegionName = (regionName: string): string => {
  if (!regionName) return "Unknown Region";

  // Remove everything after hyphen/dash (including the hyphen)
  let formatted = regionName.split(/[-–—]/)[0].trim();

  // Remove postal codes and region/state codes
  formatted = formatted.replace(/\b\d{5}\b/, ""); // Remove 5-digit postal codes
  formatted = formatted.replace(/\b[A-Z]{2}\b/, ""); // Remove 2-letter state/region codes

  // Remove qualifiers like "am Main", "an der", etc.
  formatted = formatted
    .replace(/ am Main\b/i, "")
    .replace(/ an der [A-Za-z]+\b/i, "")
    .replace(/ on the [A-Za-z]+\b/i, "")
    .replace(/ della [A-Za-z]+\b/i, "")
    .replace(/ di [A-Za-z]+\b/i, "")
    .replace(/ sur [A-Za-z]+\b/i, "")
    .replace(/ al [A-Za-z]+\b/i, "")
    .trim();

  // Remove any extra spaces
  formatted = formatted.replace(/\s+/g, " ").trim();

  // If we ended up with an empty string, return Unknown
  return formatted || "Unknown Region";
};

/**
 * Uses AI to extract and validate region names from full address strings
 *
 * @param addressStrings Array of full address strings from visited places
 * @returns Array of validated, standardized region names
 */
export const extractAndValidateRegionsWithAI = async (
  addressStrings: string[]
): Promise<string[]> => {
  try {
    if (!addressStrings || addressStrings.length === 0) {
      return [];
    }

    console.log("Sending full addresses to AI for region extraction:", addressStrings);

    // Create a prompt asking the AI to extract proper region names from full addresses
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

    // Use the Gemini service to get the extracted regions
    const validatedRegions = await generateContent({
      prompt,
      responseFormat: "json",
    });

    // Check if we got a valid response
    if (Array.isArray(validatedRegions) && validatedRegions.length > 0) {
      console.log("AI extracted these regions from full addresses:", validatedRegions);
      return validatedRegions;
    }

    // If AI validation failed, fall back to basic extraction
    console.log("AI region extraction failed, using basic extraction");
    return addressStrings
      .map((addr) => extractRegionFromVicinity(addr))
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("Error extracting regions with AI:", error);
    // On error, fall back to the original extraction method
    return addressStrings
      .map((addr) => extractRegionFromVicinity(addr))
      .filter(Boolean) as string[];
  }
};

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

    // Update request counter after successful request
    await updateRequestCounter();

    if (generatedInsight && typeof generatedInsight === "object") {
      // Format the region name before creating the insight
      const formattedRegion = formatRegionName(region);

      // Start with the base insight properties
      const baseInsight: CulturalInsight = {
        region: formattedRegion, // Use the formatted name
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
    throw error; // Re-throw to handle in UI
  }
};

/**
 * Get cultural insights for a region using multi-level caching
 */
export const getCulturalInsights = async (region: string): Promise<EnhancedCulturalInsight> => {
  try {
    // Format the region name first
    const formattedRegion = formatRegionName(region);

    // 1. Try memory cache first (fastest)
    const memoryInsight = getFromMemoryCache(formattedRegion);
    if (memoryInsight) {
      console.log("Using in-memory cached cultural insights");
      return memoryInsight;
    }

    // 2. Try AsyncStorage next (fast, persistent)
    const asyncStorageInsight = await getFromAsyncStorage(formattedRegion);
    if (asyncStorageInsight) {
      // Add to memory cache for future requests
      addToMemoryCache(asyncStorageInsight);
      console.log("Using AsyncStorage cached cultural insights");
      return asyncStorageInsight;
    }

    // 3. Try Firebase cache (slower, synced)
    const cachedInsight = await getCachedInsightForRegion(formattedRegion);
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
    if (!visitedPlaces || visitedPlaces.length === 0) {
      return [];
    }

    console.log(`Processing ${visitedPlaces.length} visited places for cultural insights`);

    // Extract the full address/vicinity strings from visited places
    const fullAddresses = visitedPlaces
      .map((place) => place.vicinity || "")
      .filter((addr) => addr.trim() !== "");

    if (fullAddresses.length === 0) {
      return [];
    }

    // Send full addresses to AI for region extraction
    let regions: string[];
    try {
      regions = await extractAndValidateRegionsWithAI(fullAddresses);
    } catch (e) {
      console.error("AI region extraction failed, using basic extraction:", e);
      regions = fullAddresses
        .map((addr) => extractRegionFromVicinity(addr))
        .filter(Boolean) as string[];
    }

    // Remove duplicates
    const uniqueRegions = [...new Set(regions)];

    if (uniqueRegions.length === 0) {
      console.warn("No valid regions found after extraction");
      return [];
    }

    console.log(`Found ${uniqueRegions.length} unique regions:`, uniqueRegions);

    // Get insights for each validated region
    const insights: EnhancedCulturalInsight[] = [];

    for (const region of uniqueRegions) {
      try {
        const insight = await getCulturalInsights(region);
        insights.push(insight);
      } catch (error) {
        console.error(`Error getting insights for ${region}:`, error);
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
    // First check memory cache for settings
    if (
      memoryCacheSettings?.explorableRegions &&
      memoryCacheSettings.explorableRegions.length > 0
    ) {
      console.log("Using memory cached regions");
      return memoryCacheSettings.explorableRegions;
    }

    // Check AsyncStorage for settings
    const asyncSettings = await getSettingsFromAsyncStorage();
    if (asyncSettings?.explorableRegions && asyncSettings.explorableRegions.length > 0) {
      console.log("Using AsyncStorage cached regions");
      return asyncSettings.explorableRegions;
    }

    // Check for saved suggested regions in Firebase
    const settings = await getCulturalContextSettings();
    if (settings.explorableRegions && settings.explorableRegions.length > 0) {
      console.log("Using Firebase cached regions");
      return settings.explorableRegions;
    }

    // Extract the full address/vicinity strings from visited places
    const fullAddresses = visitedPlaces
      .map((place) => place.vicinity || "")
      .filter((addr) => addr.trim() !== "");

    if (fullAddresses.length === 0) {
      console.log("No addresses found, using default regions");
      return getDefaultExploreRegions();
    }

    // Extract regions using AI from full addresses
    let regions: string[];
    try {
      regions = await extractAndValidateRegionsWithAI(fullAddresses);
    } catch (e) {
      console.error("AI region extraction failed, using basic extraction:", e);
      regions = fullAddresses
        .map((addr) => extractRegionFromVicinity(addr))
        .filter(Boolean) as string[];
    }

    // Remove duplicates
    const uniqueRegions = [...new Set(regions)];

    if (uniqueRegions.length === 0) {
      console.warn("No valid regions found after extraction");
      return getDefaultExploreRegions();
    }

    // Check request limit - suggestions count as a request too
    const limitInfo = await checkRequestLimit();
    if (!limitInfo.canRequest) {
      // If limit reached, return default regions
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

    // Format the region name for consistent storage/retrieval
    const formattedRegion = formatRegionName(region);

    // Get cultural insights collection
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const q = query(insightsRef, where("region", "==", formattedRegion));
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
      console.warn(`Cached insight for ${formattedRegion} is missing required properties`);
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

    // Format the region name before caching
    const insightWithFormattedRegion = {
      ...insight,
      region: formatRegionName(insight.region),
    };

    // Add or update insight in subcollection
    const insightsRef = collection(db, "users", currentUser.uid, "culturalInsights");
    const q = query(insightsRef, where("region", "==", insightWithFormattedRegion.region));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Update existing insight
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
      // Add new insight
      await addDoc(insightsRef, {
        ...insightWithFormattedRegion,
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

    // Format region names for all insights
    const formattedInsights = validInsights.map((insight) => ({
      ...insight,
      region: formatRegionName(insight.region),
    }));

    // Cache these insights in AsyncStorage and memory for future requests
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

// ======== Memory Caching Functions ========

/**
 * Add insight to memory cache
 */
const addToMemoryCache = (insight: EnhancedCulturalInsight): void => {
  // Format the region name and normalize as key (lowercase)
  const formattedRegion = formatRegionName(insight.region);
  const key = formattedRegion.toLowerCase();

  // Make sure the insight has the formatted region name
  const formattedInsight = {
    ...insight,
    region: formattedRegion,
  };

  memoryCache[key] = formattedInsight;
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
  const formattedRegion = formatRegionName(region);
  const key = formattedRegion.toLowerCase();
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
    // Format the region name
    const formattedRegion = formatRegionName(insight.region);

    // Make sure the insight has the formatted region name
    const formattedInsight = {
      ...insight,
      region: formattedRegion,
    };

    // Normalize region name as key (lowercase)
    const key = `${ASYNC_STORAGE_PREFIX}${formattedRegion.toLowerCase()}`;
    await AsyncStorage.setItem(key, JSON.stringify(formattedInsight));
  } catch (error) {
    console.error("Error saving to AsyncStorage:", error);
  }
};

/**
 * Get insight from AsyncStorage
 */
const getFromAsyncStorage = async (region: string): Promise<EnhancedCulturalInsight | null> => {
  try {
    // Format and normalize region name as key (lowercase)
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
        const insight = JSON.parse(value) as EnhancedCulturalInsight;
        // Ensure region name is formatted
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

/**
 * Save settings to AsyncStorage
 */
const saveSettingsToAsyncStorage = async (settings: CulturalContextSettings): Promise<void> => {
  try {
    // Format any region names in the settings
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

/**
 * Get settings from AsyncStorage
 */
const getSettingsFromAsyncStorage = async (): Promise<CulturalContextSettings | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);

    if (jsonValue) {
      const settings = JSON.parse(jsonValue) as CulturalContextSettings;

      // Format any region names in the settings
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
  return ["Paris", "Rome", "Tokyo", "Istanbul", "Marrakech"];
};

/**
 * Convert basic cultural insight to enhanced version
 */
const convertToEnhancedInsight = (insight: CulturalInsight): EnhancedCulturalInsight => {
  // Format the region name
  const formattedRegion = formatRegionName(insight.region);

  // Start with the base insight
  const enhancedInsight: EnhancedCulturalInsight = {
    ...insight,
    region: formattedRegion,
  };

  // Add enhanced properties if they don't exist
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

/**
 * Generate fallback restaurant recommendations based on region
 */
const generateFallbackRestaurants = (region: string): Recommendation[] => {
  // Make sure the region name is formatted
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

/**
 * Generate fallback bar recommendations based on region
 */
const generateFallbackBars = (region: string): Recommendation[] => {
  // Make sure the region name is formatted
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

/**
 * Generate fallback local tips based on region
 */
const generateFallbackLocalTips = (region: string): string[] => {
  // Make sure the region name is formatted
  const formattedRegion = formatRegionName(region);

  return [
    `When visiting attractions in ${formattedRegion}, arrive early in the morning to avoid crowds.`,
    `Public transportation is generally a convenient way to get around ${formattedRegion}.`,
    `Learning a few basic phrases in the local language is appreciated by residents of ${formattedRegion}.`,
    `Weather in ${formattedRegion} can vary by season, so check conditions before your trip.`,
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

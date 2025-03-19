// services/LearnScreen/aiTravelAnalysisService.ts
import { generateContent } from "../Gemini/geminiService";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../config/firebaseConfig";
import {
  AdvancedTravelAnalysis,
  AdvancedAnalysisSettings,
  AnalysisRequestLimitInfo,
  AnalysisGenerationProgress,
} from "../../types/LearnScreen/TravelAnalysisTypes";
import { VisitedPlaceDetails } from "../../types/MapTypes";

// Constants
const ANALYSIS_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_DAILY_REQUESTS = 5; // More limited than standard profile generation
const ASYNC_STORAGE_KEY = "@advanced_travel_analysis";
const ASYNC_STORAGE_SETTINGS_KEY = "@advanced_analysis_settings";
const ASYNC_STORAGE_PROGRESS_KEY = "@advanced_analysis_progress";

// In-memory cache for faster repeated access
let memoryCache: AdvancedTravelAnalysis | null = null;
let memoryCacheTimestamp = 0;
let memoryCacheSettings: AdvancedAnalysisSettings | null = null;

/**
 * Check if user has reached their daily request limit
 */
export const checkAdvancedAnalysisRequestLimit = async (): Promise<AnalysisRequestLimitInfo> => {
  try {
    const settings = await getAdvancedAnalysisSettings();
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
    console.error("Error checking advanced analysis request limit:", error);
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
export const updateAdvancedAnalysisRequestCounter = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    const settings = await getAdvancedAnalysisSettings();
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

    await updateAdvancedAnalysisSettings({
      requestLimits: updatedRequestLimits,
    });
  } catch (error) {
    console.error("Error updating advanced analysis request counter:", error);
  }
};

/**
 * Set the progress status for analysis generation
 */
export const setAdvancedAnalysisProgress = async (
  progressInfo: AnalysisGenerationProgress
): Promise<void> => {
  try {
    // Save to AsyncStorage
    await AsyncStorage.setItem(ASYNC_STORAGE_PROGRESS_KEY, JSON.stringify(progressInfo));

    // If user is authenticated, save to Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
      const progressRef = doc(db, "users", currentUser.uid, "settings", "advancedAnalysisProgress");
      await setDoc(progressRef, {
        ...progressInfo,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Error setting advanced analysis progress:", error);
  }
};

/**
 * Get the current progress status for analysis generation
 */
export const getAdvancedAnalysisProgress = async (): Promise<AnalysisGenerationProgress | null> => {
  try {
    // Try AsyncStorage first
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_PROGRESS_KEY);
    if (jsonValue) {
      return JSON.parse(jsonValue) as AnalysisGenerationProgress;
    }

    // If not in AsyncStorage, try Firestore if user is authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      const progressRef = doc(db, "users", currentUser.uid, "settings", "advancedAnalysisProgress");
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        const progress = progressDoc.data() as AnalysisGenerationProgress;

        // Cache in AsyncStorage
        await AsyncStorage.setItem(ASYNC_STORAGE_PROGRESS_KEY, JSON.stringify(progress));

        return progress;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting advanced analysis progress:", error);
    return null;
  }
};

/**
 * Generate comprehensive advanced travel analysis using Gemini AI
 */
export const generateAdvancedTravelAnalysis = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<AdvancedTravelAnalysis> => {
  try {
    // Check request limit
    const limitInfo = await checkAdvancedAnalysisRequestLimit();
    if (!limitInfo.canRequest) {
      throw new Error(
        `Daily request limit reached. Try again ${
          limitInfo.nextAvailableTime
            ? `after ${new Date(limitInfo.nextAvailableTime).toLocaleTimeString()}`
            : "tomorrow"
        }`
      );
    }

    if (!visitedPlaces || visitedPlaces.length === 0) {
      throw new Error("No visited places provided to generate analysis");
    }

    // Set progress to starting
    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 5,
      stage: "Preparing visit data for advanced analysis",
    });

    // Extract and enrich data from visited places
    const placesData = visitedPlaces.map((place) => ({
      name: place.name || "Unknown",
      location: place.vicinity || place.location || "Unknown",
      placeType:
        place.placeType || (place.types && place.types.length > 0 ? place.types[0] : "unknown"),
      categories: place.types || [],
      visitDate: place.visitDate || new Date(place.visitedAt).toLocaleDateString(),
      visitedAt: place.visitedAt, // Raw ISO date string
      coordinates: place.geometry?.location || { lat: 0, lng: 0 },
      tags: place.tags || place.types || [],
      rating: place.rating || 0,
    }));

    // Sort places chronologically
    const chronologicalPlaces = [...placesData].sort((a, b) => {
      return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
    });

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 15,
      stage: "Analyzing temporal travel patterns",
    });

    // Generate temporal analysis
    const temporalPrompt = `
      Analyze this chronologically ordered travel history for temporal patterns:
      ${JSON.stringify(chronologicalPlaces)}
      
      Create a comprehensive temporal analysis that includes:
      1. A detailed progression of their travel habits year-by-year
      2. Seasonal patterns in their travel preferences
      3. Monthly visit distribution analysis
      
      Provide a detailed analysis of how their travel patterns have evolved over time. 
      If there isn't enough data for certain timeframes, make reasonable inferences based on available information.
      
      Return the analysis as a detailed JSON object with this exact structure:
      {
        "yearlyProgression": {
          "YYYY": {
            "totalVisits": number,
            "uniqueLocations": number,
            "dominantCategory": string,
            "explorationRadius": number,
            "topDestination": string
          }
        },
        "seasonalPatterns": {
          "winter": {
            "visitPercentage": number,
            "preferredCategories": string[],
            "averageDuration": string
          },
          "spring": {...},
          "summer": {...},
          "fall": {...}
        },
        "monthlyDistribution": {
          "January": number,
          "February": number,
          ...
        }
      }
      
      Format your response as valid JSON only. No explanations outside the JSON.
    `;

    const temporalAnalysisResponse = await generateContent({
      prompt: temporalPrompt,
      responseFormat: "json",
    });

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 30,
      stage: "Analyzing spatial relationships",
    });

    // Generate spatial analysis with explicit structure
    const spatialPrompt = `
      Analyze the spatial relationships and geographical patterns in this travel history:
      ${JSON.stringify(placesData)}
      
      Create a detailed spatial analysis that includes:
      1. Travel radius metrics (average, maximum, minimum distances traveled)
      2. Location clustering analysis (identifying geographical clusters of visits)
      3. Directional tendencies in travel movements
      4. Analysis of regional diversity in their travel
      
      Consider the coordinates of each place to determine spatial relationships. 
      If coordinate data is limited, use location names to estimate relationships.
      
      Return the analysis as a detailed JSON object with this exact structure:
      {
        "explorationRadius": {
          "average": number,
          "maximum": number,
          "minimum": number,
          "growthRate": number
        },
        "locationClusters": [
          {
            "clusterName": string,
            "centerPoint": string,
            "numberOfVisits": number,
            "topCategories": string[],
            "visits": number
          }
        ],
        "directionTendencies": {
          "primaryDirection": string,
          "secondaryDirection": string,
          "directionPercentages": {
            "N": number,
            "S": number,
            "E": number,
            "W": number,
            ...
          },
          "insight": string
        },
        "regionDiversity": {
          "uniqueRegions": number,
          "mostExploredRegion": string,
          "leastExploredRegion": string,
          "regionSpread": number,
          "diversityInsight": string
        }
      }
      
      Format your response as valid JSON only. No explanations outside the JSON.
    `;

    const spatialAnalysisResponse = await generateContent({
      prompt: spatialPrompt,
      responseFormat: "json",
    });

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 45,
      stage: "Analyzing behavioral patterns",
    });

    // Generate behavioral analysis
    const behavioralPrompt = `
        Analyze the psychological and behavioral patterns in this travel history:
        ${JSON.stringify(placesData)}
        
        Create a detailed behavioral analysis that includes:
        1. Exploration style metrics (spontaneity vs. planning, variety-seeking, etc.)
        2. Travel personality assessment (openness, cultural engagement, etc.)
        3. Motivational factors driving their travel choices
        4. Decision-making patterns (consistency, decision speed, etc.)
        
        Look for patterns in the types of places visited, frequency of visits, and timing 
        to infer deeper psychological and behavioral tendencies.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "explorationStyle": {
            "spontaneityScore": number,
            "planningLevel": number,
            "varietySeeking": number,
            "returnVisitRate": number,
            "noveltyPreference": number
          },
          "travelPersonality": {
            "openness": number,
            "cultureEngagement": number,
            "socialOrientation": number,
            "activityLevel": number,
            "adventurousness": number
          },
          "motivationalFactors": [
            {
              "factor": string,
              "strength": number,
              "insight": string
            }
          ],
          "decisionPatterns": {
            "decisionSpeed": number,
            "consistencyScore": number,
            "influenceFactors": string[],
            "insight": string
          }
        }
        
        Format your response as valid JSON only. No explanations outside the JSON.
      `;

    const behavioralAnalysisResponse = await generateContent({
      prompt: behavioralPrompt,
      responseFormat: "json",
    });

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 60,
      stage: "Generating predictive analysis",
    });

    // Generate predictive analysis
    const predictivePrompt = `
        Based on this travel history, predict future travel patterns and interests:
        ${JSON.stringify(placesData)}
        
        Create a detailed predictive analysis that includes:
        1. Recommended future destinations with confidence scores
        2. Predicted emerging travel trends for this user
        3. Evolution of interests over time
        4. Overall travel trajectory analysis
        
        Make predictions based on established patterns, evolving preferences, and 
        emerging trends in their travel history.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "recommendedDestinations": [
            {
              "name": string,
              "confidenceScore": number,
              "reasoningFactors": string[],
              "bestTimeToVisit": string,
              "expectedInterestLevel": number
            }
          ],
          "predictedTrends": [
            {
              "trend": string,
              "likelihood": number,
              "timeframe": string,
              "explanation": string
            }
          ],
          "interestEvolution": {
            "emergingInterests": string[],
            "decliningInterests": string[],
            "steadyInterests": string[],
            "newSuggestions": string[]
          },
          "travelTrajectory": {
            "explorationRate": number,
            "radiusChange": number,
            "nextPhase": string,
            "insightSummary": string
          }
        }
        
        Format your response as valid JSON only. No explanations outside the JSON.
      `;

    const predictiveAnalysisResponse = await generateContent({
      prompt: predictivePrompt,
      responseFormat: "json",
    });

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 75,
      stage: "Deriving analytical insights",
    });

    // Generate analytical insights
    const insightsPrompt = `
        Extract profound analytical insights from this travel history:
        ${JSON.stringify(placesData)}
        
        Create a sophisticated set of analytical insights that includes:
        1. Key behavioral insights with confidence scores
        2. Pattern analysis with strength metrics
        3. Anomalies and unique behaviors in their travel
        4. Correlations between different factors in their travel choices
        
        Focus on insights that would not be immediately obvious from basic analysis.
        Look for subtle patterns, unexpected connections, and distinctive behaviors.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "keyInsights": [
            {
              "title": string,
              "description": string,
              "confidenceScore": number,
              "category": string,
              "tags": string[]
            }
          ],
          "patternInsights": [
            {
              "pattern": string,
              "strength": number,
              "examples": string[],
              "implications": string
            }
          ],
          "anomalies": [
            {
              "description": string,
              "significance": number,
              "explanation": string
            }
          ],
          "correlations": [
            {
              "factor1": string,
              "factor2": string,
              "correlationStrength": number,
              "insight": string
            }
          ]
        }
        
        Format your response as valid JSON only. No explanations outside the JSON.
      `;

    const analyticalInsightsResponse = await generateContent({
      prompt: insightsPrompt,
      responseFormat: "json",
    });

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 90,
      stage: "Creating comparative analysis",
    });

    // Generate comparative analysis
    const comparativePrompt = `
        Compare this traveler's profile against general traveler archetypes and benchmarks:
        ${JSON.stringify(placesData)}
        
        Create a detailed comparative analysis that includes:
        1. Persona comparison (which established traveler persona they most resemble)
        2. Traveler archetype analysis (primary and secondary archetypes)
        3. Benchmark comparisons against typical travel patterns
        4. Uniqueness factors that distinguish their travel behavior
        
        Compare against common traveler archetypes like "Cultural Explorer," "Adventure Seeker," 
        "Urban Navigator," "Historical Enthusiast," etc. Identify what makes their 
        travel patterns unique or typical.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "personaComparison": {
            "mostSimilarPersona": string,
            "similarityScore": number,
            "keyDifferences": string[],
            "distinctiveTraits": string[]
          },
          "archetypeAnalysis": {
            "primaryArchetype": string,
            "archetypeScore": number,
            "secondaryArchetype": string,
            "secondaryScore": number,
            "atypicalTraits": string[]
          },
          "benchmarks": [
            {
              "category": string,
              "userScore": number,
              "averageScore": number,
              "percentile": number,
              "insight": string
            }
          ],
          "uniquenessFactors": [
            {
              "factor": string,
              "uniquenessScore": number,
              "explanation": string
            }
          ]
        }
        
        Format your response as valid JSON only. No explanations outside the JSON.
      `;

    const comparativeAnalysisResponse = await generateContent({
      prompt: comparativePrompt,
      responseFormat: "json",
    });

    // Calculate confidence and quality scores based on data richness
    const dataQualityScore = Math.min(
      100,
      20 + // Base score
        Math.min(40, visitedPlaces.length * 2) + // Score based on number of places (max 40)
        Math.min(20, Object.keys(getYearsFromVisits(visitedPlaces)).length * 5) + // Score based on time span (max 20)
        Math.min(20, getUniqueCategories(visitedPlaces).length * 2) // Score based on variety (max 20)
    );

    const confidenceScore = Math.max(50, dataQualityScore); // Minimum 50% confidence

    // Calculate next refresh date (7 days from now)
    const nextRefreshDate = new Date();
    nextRefreshDate.setDate(nextRefreshDate.getDate() + 7);

    // Combine all the generated data
    const analysisData: AdvancedTravelAnalysis = {
      userId: auth.currentUser?.uid || "anonymous",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isGenerating: false,
      basedOnPlaces: visitedPlaces.length,
      temporalAnalysis: temporalAnalysisResponse,
      spatialAnalysis: spatialAnalysisResponse,
      behavioralAnalysis: behavioralAnalysisResponse,
      predictiveAnalysis: predictiveAnalysisResponse,
      analyticalInsights: analyticalInsightsResponse,
      comparativeAnalysis: comparativeAnalysisResponse,
      analysisQuality: dataQualityScore,
      confidenceScore: confidenceScore,
      lastRefreshed: new Date().toISOString(),
      nextRefreshDue: nextRefreshDate.toISOString(),
    };

    // Save the analysis
    await saveAdvancedTravelAnalysis(analysisData);

    // Set progress to complete
    await setAdvancedAnalysisProgress({
      isGenerating: false,
      progress: 100,
      stage: "Advanced analysis complete",
    });

    return analysisData;
  } catch (error) {
    console.error("Error generating advanced travel analysis:", error);

    // Set progress to failed
    await setAdvancedAnalysisProgress({
      isGenerating: false,
      progress: 0,
      stage: "Analysis failed",
    });

    throw error;
  }
};

/**
 * Save advanced travel analysis directly to Firestore and local cache
 */
export const saveAdvancedTravelAnalysis = async (
  analysis: AdvancedTravelAnalysis
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    // Update timestamp
    const updatedAnalysis = {
      ...analysis,
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore directly
    const analysisRef = collection(db, "users", currentUser.uid, "advancedTravelAnalysis");
    await addDoc(analysisRef, updatedAnalysis);

    // Update settings with last updated timestamp
    await updateAdvancedAnalysisSettings({
      lastUpdatedAt: Date.now(),
    });

    // Update caches
    memoryCache = updatedAnalysis;
    memoryCacheTimestamp = Date.now();
    await saveToAsyncStorage(updatedAnalysis);

    console.log("Advanced travel analysis saved successfully");
  } catch (error) {
    console.error("Error saving advanced travel analysis:", error);
    throw error;
  }
};

/**
 * Get advanced travel analysis with multi-level caching
 */
export const getAdvancedTravelAnalysis = async (
  forceRefresh = false
): Promise<AdvancedTravelAnalysis | null> => {
  try {
    // Check for ongoing generation
    const progress = await getAdvancedAnalysisProgress();
    if (progress?.isGenerating) {
      // Return a loading state with progress information
      return {
        userId: auth.currentUser?.uid || "anonymous",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGenerating: true,
        basedOnPlaces: 0,
        temporalAnalysis: {},
        spatialAnalysis: {},
        behavioralAnalysis: {},
        predictiveAnalysis: {},
        analyticalInsights: {},
        comparativeAnalysis: {},
        analysisQuality: 0,
        confidenceScore: 0,
        lastRefreshed: new Date().toISOString(),
        nextRefreshDue: new Date().toISOString(),
      };
    }

    if (forceRefresh) {
      // Skip cache if force refresh requested
      clearMemoryCache();
      await clearAsyncStorageCache();
    } else {
      // Try memory cache first (fastest)
      if (memoryCache && Date.now() - memoryCacheTimestamp < 5 * 60 * 1000) {
        // 5 minutes
        return memoryCache;
      }

      // Try AsyncStorage next
      const cachedAnalysis = await getFromAsyncStorage();
      if (cachedAnalysis) {
        // Update memory cache
        memoryCache = cachedAnalysis;
        memoryCacheTimestamp = Date.now();
        return cachedAnalysis;
      }
    }

    // Try Firestore if user is authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Check if we need to refresh based on settings
      const settings = await getAdvancedAnalysisSettings();
      const now = Date.now();
      const needsRefresh = now - settings.lastUpdatedAt > settings.refreshInterval;

      if (!forceRefresh && !needsRefresh) {
        // Try to get latest analysis from Firestore
        const analysisData = await getLatestAnalysisFromFirestore();

        if (analysisData) {
          // Cache in memory and AsyncStorage
          memoryCache = analysisData;
          memoryCacheTimestamp = Date.now();
          await saveToAsyncStorage(analysisData);

          return analysisData;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting advanced travel analysis:", error);
    return null;
  }
};

/**
 * Get latest analysis from Firestore
 */
const getLatestAnalysisFromFirestore = async (): Promise<AdvancedTravelAnalysis | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const analysisRef = collection(db, "users", currentUser.uid, "advancedTravelAnalysis");
    const q = query(analysisRef, orderBy("createdAt", "desc"), limit(1));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docData = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...docData,
    } as AdvancedTravelAnalysis;
  } catch (error) {
    console.error("Error getting latest analysis from Firestore:", error);
    return null;
  }
};

/**
 * Get advanced travel analysis settings
 */
export const getAdvancedAnalysisSettings = async (): Promise<AdvancedAnalysisSettings> => {
  try {
    // Check memory cache first
    if (memoryCacheSettings) {
      return memoryCacheSettings;
    }

    // Try AsyncStorage
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);
    if (jsonValue) {
      const settings = JSON.parse(jsonValue) as AdvancedAnalysisSettings;
      memoryCacheSettings = settings;
      return settings;
    }

    // Try Firestore if user is authenticated
    const currentUser = auth.currentUser;
    if (currentUser) {
      const settingsRef = doc(db, "users", currentUser.uid, "settings", "advancedTravelAnalysis");
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as AdvancedAnalysisSettings;

        // Cache settings
        memoryCacheSettings = settings;
        await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(settings));

        return settings;
      }
    }

    // Create default settings if none exist
    const defaultSettings: AdvancedAnalysisSettings = {
      lastUpdatedAt: 0,
      refreshInterval: ANALYSIS_REFRESH_INTERVAL,
    };

    // Save default settings
    if (currentUser) {
      const settingsRef = doc(db, "users", currentUser.uid, "settings", "advancedTravelAnalysis");
      await setDoc(settingsRef, defaultSettings);
    }

    // Cache settings
    memoryCacheSettings = defaultSettings;
    await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(defaultSettings));

    return defaultSettings;
  } catch (error) {
    console.error("Error getting advanced analysis settings:", error);

    // Return default settings on error
    return {
      lastUpdatedAt: 0,
      refreshInterval: ANALYSIS_REFRESH_INTERVAL,
    };
  }
};

/**
 * Update advanced travel analysis settings
 */
export const updateAdvancedAnalysisSettings = async (
  settings: Partial<AdvancedAnalysisSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    // Get current settings
    const currentSettings = await getAdvancedAnalysisSettings();

    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update Firestore
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "advancedTravelAnalysis");
    await setDoc(settingsRef, updatedSettings, { merge: true });

    // Update caches
    memoryCacheSettings = updatedSettings;
    await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(updatedSettings));

    console.log("Advanced travel analysis settings updated successfully");
  } catch (error) {
    console.error("Error updating advanced analysis settings:", error);
  }
};

/**
 * Clear memory cache
 */
export const clearMemoryCache = (): void => {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  memoryCacheSettings = null;
};

/**
 * Clear AsyncStorage cache
 */
export const clearAsyncStorageCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
    await AsyncStorage.removeItem(ASYNC_STORAGE_SETTINGS_KEY);
    await AsyncStorage.removeItem(ASYNC_STORAGE_PROGRESS_KEY);
  } catch (error) {
    console.error("Error clearing AsyncStorage cache:", error);
  }
};

/**
 * Get analysis from AsyncStorage
 */
const getFromAsyncStorage = async (): Promise<AdvancedTravelAnalysis | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (jsonValue) {
      return JSON.parse(jsonValue) as AdvancedTravelAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Error getting from AsyncStorage:", error);
    return null;
  }
};

/**
 * Save analysis to AsyncStorage
 */
const saveToAsyncStorage = async (analysis: AdvancedTravelAnalysis): Promise<void> => {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(analysis));
  } catch (error) {
    console.error("Error saving to AsyncStorage:", error);
  }
};

// Helper functions to extract metadata from visited places
const getYearsFromVisits = (visitedPlaces: VisitedPlaceDetails[]): Record<string, boolean> => {
  const years: Record<string, boolean> = {};
  visitedPlaces.forEach((place) => {
    const visitDate = new Date(place.visitedAt);
    const year = visitDate.getFullYear().toString();
    years[year] = true;
  });
  return years;
};

const getUniqueCategories = (visitedPlaces: VisitedPlaceDetails[]): string[] => {
  const categories = new Set<string>();
  visitedPlaces.forEach((place) => {
    if (place.types) {
      place.types.forEach((type) => categories.add(type));
    }
  });
  return Array.from(categories);
};

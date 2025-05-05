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

const ANALYSIS_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_DAILY_REQUESTS = 5;
const ASYNC_STORAGE_KEY = "@advanced_travel_analysis";
const ASYNC_STORAGE_SETTINGS_KEY = "@advanced_analysis_settings";
const ASYNC_STORAGE_PROGRESS_KEY = "@advanced_analysis_progress";
const LAST_AUTO_UPDATE_CHECK_KEY = "@last_auto_update_check";

let memoryCache: AdvancedTravelAnalysis | null = null;
let memoryCacheTimestamp = 0;
let memoryCacheSettings: AdvancedAnalysisSettings | null = null;

export const checkAdvancedAnalysisRequestLimit = async (): Promise<AnalysisRequestLimitInfo> => {
  try {
    const settings = await getAdvancedAnalysisSettings();
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
    console.error("Error checking advanced analysis request limit:", error);
    return {
      canRequest: true,
      requestsRemaining: MAX_DAILY_REQUESTS,
    };
  }
};

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

    await updateAdvancedAnalysisSettings({
      requestLimits: updatedRequestLimits,
    });
  } catch (error) {
    console.error("Error updating advanced analysis request counter:", error);
  }
};

export const checkAndPerformAutomaticUpdate = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<void> => {
  try {
    if (!auth.currentUser || visitedPlaces.length === 0) {
      return;
    }
    const lastCheckStr = await AsyncStorage.getItem(LAST_AUTO_UPDATE_CHECK_KEY);
    const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
    const now = Date.now();
    if (now - lastCheck < 60 * 60 * 1000) {
      return;
    }
    await AsyncStorage.setItem(LAST_AUTO_UPDATE_CHECK_KEY, now.toString());
    const currentAnalysis = await getAdvancedTravelAnalysis(false);
    const settings = await getAdvancedAnalysisSettings();
    if (
      !currentAnalysis ||
      now - new Date(currentAnalysis.updatedAt).getTime() > settings.refreshInterval
    ) {
      console.log("Automatic update triggered for travel analysis");
      const limitInfo = await checkAdvancedAnalysisRequestLimit();
      if (!limitInfo.canRequest) {
        console.log("Cannot perform automatic update: daily limit reached");
        return;
      }
      try {
        await generateAdvancedTravelAnalysis(visitedPlaces);
        console.log("Automatic update completed successfully");
      } catch (error) {
        console.error("Automatic update failed:", error);
      }
    }
  } catch (error) {
    console.error("Error checking for automatic update:", error);
  }
};

export const setAdvancedAnalysisProgress = async (
  progressInfo: AnalysisGenerationProgress
): Promise<void> => {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_PROGRESS_KEY, JSON.stringify(progressInfo));
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

export const getAdvancedAnalysisProgress = async (): Promise<AnalysisGenerationProgress | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_PROGRESS_KEY);
    if (jsonValue) {
      return JSON.parse(jsonValue) as AnalysisGenerationProgress;
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      const progressRef = doc(db, "users", currentUser.uid, "settings", "advancedAnalysisProgress");
      const progressDoc = await getDoc(progressRef);

      if (progressDoc.exists()) {
        const progress = progressDoc.data() as AnalysisGenerationProgress;
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

export const generateAdvancedTravelAnalysis = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<AdvancedTravelAnalysis> => {
  try {
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

    await setAdvancedAnalysisProgress({
      isGenerating: true,
      progress: 5,
      stage: "Preparing visit data for advanced analysis",
    });

    const placesData = visitedPlaces.map((place) => ({
      name: place.name || "Unknown",
      location: place.vicinity || place.location || "Unknown",
      placeType:
        place.placeType || (place.types && place.types.length > 0 ? place.types[0] : "unknown"),
      categories: place.types || [],
      visitDate: place.visitDate || new Date(place.visitedAt).toLocaleDateString(),
      visitedAt: place.visitedAt,
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
      
      Create a comprehensive temporal analysis that addresses the user directly in second person.
      Include:
      1. A detailed progression of your travel habits year-by-year
      2. Seasonal patterns in your travel preferences
      3. Monthly visit distribution analysis
      
      Provide a detailed analysis of how your travel patterns have evolved over time. 
      If there isn't enough data for certain timeframes, make reasonable inferences based on available information.
      
      Return the analysis as a detailed JSON object with this exact structure:
      {
        "yearlyProgression": {
          "YYYY": {
            "totalVisits": number,
            "uniqueLocations": number,
            "dominantCategory": string,
            "explorationRadius": number,
            "topDestination": string,
            "personalInsight": string // Add a personal insight addressed to the user
          }
        },
        "seasonalPatterns": {
          "winter": {
            "visitPercentage": number, // This should be 0-100, not decimal
            "preferredCategories": string[],
            "averageDuration": string,
            "personalInsight": string // Add a personal insight addressed to the user
          },
          "spring": {...},
          "summer": {...},
          "fall": {...}
        },
        "monthlyDistribution": {
          "January": number, // This should be a whole number, not a percentage
          "February": number,
          // Other months
        },
        "temporalSummary": string // A summary that addresses the user directly about their travel patterns
      }
      
      IMPORTANT:
      - Use whole numbers for visit counts
      - Use percentage values between 0-100 (not 0-1)
      - Make sure insights are meaningful and address the user directly as "you" and "your"
      - Format your response as valid JSON only. No explanations outside the JSON.
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

    // Generate spatial analysis
    const spatialPrompt = `
      Analyze the spatial relationships and geographical patterns in your travel history:
      ${JSON.stringify(placesData)}
      
      Create a detailed spatial analysis that addresses the user directly in second person.
      Include:
      1. Your travel radius metrics (average, maximum, minimum distances traveled)
      2. Location clustering analysis (identifying geographical clusters of your visits)
      3. Directional tendencies in your travel movements
      4. Analysis of regional diversity in your travel
      
      Consider the coordinates of each place to determine spatial relationships. 
      If coordinate data is limited, use location names to estimate relationships.
      
      Return the analysis as a detailed JSON object with this exact structure:
      {
        "explorationRadius": {
          "average": number, // in kilometers
          "maximum": number, // in kilometers
          "minimum": number, // in kilometers
          "growthRate": number, // use percentage (0-100), not decimal
          "personalInsight": string // Direct second-person insight about their travel radius
        },
        "locationClusters": [
          {
            "clusterName": string,
            "centerPoint": string,
            "numberOfVisits": number, // whole number
            "topCategories": string[],
            "visits": number, // whole number
            "personalRecommendation": string // Recommendation based on this cluster
          }
        ],
        "directionTendencies": {
          "primaryDirection": string,
          "secondaryDirection": string,
          "directionPercentages": {
            "N": number, // percentage 0-100
            "S": number, // percentage 0-100
            "E": number, // percentage 0-100
            "W": number, // percentage 0-100
            // Other directions
          },
          "insight": string // Direct second-person insight about directional preferences
        },
        "regionDiversity": {
          "uniqueRegions": number, // whole number
          "mostExploredRegion": string,
          "leastExploredRegion": string,
          "regionSpread": number, // percentage 0-100
          "diversityInsight": string // Direct second-person insight about region diversity
        },
        "spatialSummary": string // A summary that addresses the user directly about their spatial travel patterns
      }
      
      IMPORTANT:
      - Use whole numbers for visit counts
      - Use percentage values between 0-100 (not 0-1)
      - Make sure insights are meaningful and address the user directly as "you" and "your"
      - Ensure all numerical values are realistic and proportional (no tiny percentages like 0.85%)
      - Format your response as valid JSON only. No explanations outside the JSON.
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
        Analyze the psychological and behavioral patterns in your travel history:
        ${JSON.stringify(placesData)}
        
        Create a detailed behavioral analysis that addresses the user directly in second person.
        Include:
        1. Your exploration style metrics (spontaneity vs. planning, variety-seeking, etc.)
        2. Your travel personality assessment (openness, cultural engagement, etc.)
        3. Motivational factors driving your travel choices
        4. Your decision-making patterns (consistency, decision speed, etc.)
        
        Look for patterns in the types of places visited, frequency of visits, and timing 
        to infer deeper psychological and behavioral tendencies.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "explorationStyle": {
            "spontaneityScore": number, // score from 0-100
            "planningLevel": number, // score from 0-100
            "varietySeeking": number, // score from 0-100
            "returnVisitRate": number, // percentage from 0-100
            "noveltyPreference": number, // score from 0-100
            "personalInsight": string // Direct insight about their exploration style
          },
          "travelPersonality": {
            "openness": number, // score from 0-100
            "cultureEngagement": number, // score from 0-100
            "socialOrientation": number, // score from 0-100
            "activityLevel": number, // score from 0-100
            "adventurousness": number, // score from 0-100
            "personalInsight": string // Direct insight about their travel personality
          },
          "motivationalFactors": [
            {
              "factor": string,
              "strength": number, // score from 0-100
              "insight": string // How this factor influences their choices
            }
          ],
          "decisionPatterns": {
            "decisionSpeed": number, // score from 0-100
            "consistencyScore": number, // score from 0-100
            "influenceFactors": string[],
            "insight": string // Direct insight about their decision patterns
          },
          "behavioralSummary": string // A summary that addresses the user directly about their travel behavior
        }
        
        IMPORTANT:
        - All scores and percentages should be on a scale of 0-100, not 0-1
        - Make sure all insights directly address the user as "you" and "your"
        - Ensure scores are realistic and meaningful (avoid extremely low values unless truly warranted)
        - Format your response as valid JSON only. No explanations outside the JSON.
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
        Based on your travel history, let's predict your future travel patterns and interests:
        ${JSON.stringify(placesData)}
        
        Create a detailed predictive analysis that addresses the user directly in second person.
        Include:
        1. Recommended future destinations for you with confidence scores
        2. Predicted emerging travel trends for you
        3. Evolution of your interests over time
        4. Overall trajectory analysis of your travel journey
        
        Make predictions based on established patterns, evolving preferences, and 
        emerging trends in their travel history.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "recommendedDestinations": [
            {
              "name": string,
              "confidenceScore": number, // score from 0-100
              "reasoningFactors": string[],
              "bestTimeToVisit": string,
              "expectedInterestLevel": number, // score from 0-100
              "personalRecommendation": string // Why you specifically would enjoy this destination
            }
          ],
          "predictedTrends": [
            {
              "trend": string,
              "likelihood": number, // percentage from 0-100
              "timeframe": string,
              "explanation": string // How this trend relates to your past travel choices
            }
          ],
          "interestEvolution": {
            "emergingInterests": string[],
            "decliningInterests": string[],
            "steadyInterests": string[],
            "newSuggestions": string[],
            "personalInsight": string // Insight about how your interests are evolving
          },
          "travelTrajectory": {
            "explorationRate": number, // score from 0-100
            "radiusChange": number, // percentage change, e.g., 25 for 25% increase
            "nextPhase": string,
            "insightSummary": string // Direct insight about where your travel journey is heading
          },
          "predictiveSummary": string // A summary that addresses the user directly about their future travel potential
        }
        
        IMPORTANT:
        - All scores and percentages should be on a scale of 0-100, not 0-1
        - Make sure all insights directly address the user as "you" and "your"
        - Ensure all recommendations are personalized and specific to the user's profile
        - Format your response as valid JSON only. No explanations outside the JSON.
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
        Extract profound analytical insights from your travel history:
        ${JSON.stringify(placesData)}
        
        Create a sophisticated set of analytical insights that addresses the user directly in second person.
        Include:
        1. Key behavioral insights about your travel style with confidence scores
        2. Pattern analysis with strength metrics
        3. Anomalies and unique behaviors in your travel
        4. Correlations between different factors in your travel choices
        
        Focus on insights that would not be immediately obvious from basic analysis.
        Look for subtle patterns, unexpected connections, and distinctive behaviors.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "keyInsights": [
            {
              "title": string,
              "description": string, // Written directly to the user ("you prefer...")
              "confidenceScore": number, // score from 0-100
              "category": string,
              "tags": string[],
              "actionableAdvice": string // Something they could do based on this insight
            }
          ],
          "patternInsights": [
            {
              "pattern": string,
              "strength": number, // score from 0-100
              "examples": string[],
              "implications": string, // How this pattern affects their travel experience
              "personalRecommendation": string // Recommendation based on this pattern
            }
          ],
          "anomalies": [
            {
              "description": string, // Written directly to the user
              "significance": number, // score from 0-100
              "explanation": string, // Why this behavior stands out
              "potentialBenefit": string // How this anomaly might benefit them
            }
          ],
          "correlations": [
            {
              "factor1": string,
              "factor2": string,
              "correlationStrength": number, // score from 0-100
              "insight": string, // How these correlated factors influence their travel
              "actionableTip": string // Something they could do with this correlation
            }
          ],
          "insightsSummary": string // A summary that addresses the user directly about the key insights
        }
        
        IMPORTANT:
        - All scores and strengths should be on a scale of 0-100, not 0-1
        - Make sure all insights directly address the user as "you" and "your"
        - Ensure insights are meaningful and substantive, not vague generalities
        - Include actionable advice with each insight category
        - Format your response as valid JSON only. No explanations outside the JSON.
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
        Compare your travel profile against general traveler archetypes and benchmarks:
        ${JSON.stringify(placesData)}
        
        Create a detailed comparative analysis that addresses the user directly in second person.
        Include:
        1. Persona comparison (which established traveler persona you most resemble)
        2. Traveler archetype analysis (your primary and secondary archetypes)
        3. Benchmark comparisons against typical travel patterns
        4. Uniqueness factors that distinguish your travel behavior
        
        Compare against common traveler archetypes like "Cultural Explorer," "Adventure Seeker," 
        "Urban Navigator," "Historical Enthusiast," etc. Identify what makes their 
        travel patterns unique or typical.
        
        Return the analysis as a detailed JSON object with this exact structure:
        {
          "personaComparison": {
            "mostSimilarPersona": string,
            "similarityScore": number, // score from 0-100, use meaningful values (e.g., 85 not 0.85)
            "keyDifferences": string[], // How you differ from this persona
            "distinctiveTraits": string[], // Your unique traits compared to this persona
            "personalRecommendation": string // What you could learn from this persona
          },
          "archetypeAnalysis": {
            "primaryArchetype": string,
            "archetypeScore": number, // score from 0-100
            "secondaryArchetype": string,
            "secondaryScore": number, // score from 0-100
            "atypicalTraits": string[], // Traits that don't fit your archetypes
            "personalInsight": string // How understanding your archetype can help you
          },
          "benchmarks": [
            {
              "category": string,
              "userScore": number, // score from 0-100
              "averageScore": number, // score from 0-100
              "percentile": number, // 0-100, represents where you fall compared to others
              "insight": string // What this benchmark reveals about you
            }
          ],
          "uniquenessFactors": [
            {
              "factor": string,
              "uniquenessScore": number, // score from 0-100
              "explanation": string, // Why this makes you unique
              "howToLeverage": string // How you can use this unique quality
            }
          ],
          "comparativeSummary": string // A summary that addresses the user directly about how they compare to other travelers
        }
        
        IMPORTANT:
        - All scores MUST be on a scale of 0-100, not decimals like 0.85
        - Similarity scores should be meaningful (e.g., if there's a strong match, use 80-95, not 0.85)
        - Make sure all insights directly address the user as "you" and "your"
        - Ensure all analysis is substantive and specific, not generic
        - The response should help the user understand their travel style in relation to others
        - Format your response as valid JSON only. No explanations outside the JSON.
    `;

    const comparativeAnalysisResponse = await generateContent({
      prompt: comparativePrompt,
      responseFormat: "json",
    });

    // Calculate confidence and quality scores based on data
    const dataQualityScore = Math.min(
      100,
      20 +
        Math.min(40, visitedPlaces.length * 2) +
        Math.min(20, Object.keys(getYearsFromVisits(visitedPlaces)).length * 5) +
        Math.min(20, getUniqueCategories(visitedPlaces).length * 2)
    );

    const confidenceScore = Math.max(50, dataQualityScore);

    const nextRefreshDate = new Date();
    nextRefreshDate.setDate(nextRefreshDate.getDate() + 1);

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

    await saveAdvancedTravelAnalysis(analysisData);
    await setAdvancedAnalysisProgress({
      isGenerating: false,
      progress: 100,
      stage: "Advanced analysis complete",
    });

    return analysisData;
  } catch (error) {
    console.error("Error generating advanced travel analysis:", error);

    await setAdvancedAnalysisProgress({
      isGenerating: false,
      progress: 0,
      stage: "Analysis failed",
    });

    throw error;
  }
};

export const saveAdvancedTravelAnalysis = async (
  analysis: AdvancedTravelAnalysis
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    const updatedAnalysis = {
      ...analysis,
      updatedAt: new Date().toISOString(),
    };
    const analysisRef = collection(db, "users", currentUser.uid, "advancedTravelAnalysis");
    await addDoc(analysisRef, updatedAnalysis);
    await updateAdvancedAnalysisSettings({
      lastUpdatedAt: Date.now(),
    });
    memoryCache = updatedAnalysis;
    memoryCacheTimestamp = Date.now();
    await saveToAsyncStorage(updatedAnalysis);
    console.log("Advanced travel analysis saved successfully");
  } catch (error) {
    console.error("Error saving advanced travel analysis:", error);
    throw error;
  }
};

export const getAdvancedTravelAnalysis = async (
  forceRefresh = false
): Promise<AdvancedTravelAnalysis | null> => {
  try {
    const progress = await getAdvancedAnalysisProgress();
    if (progress?.isGenerating) {
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
      clearMemoryCache();
      await clearAsyncStorageCache();
    } else {
      if (memoryCache && Date.now() - memoryCacheTimestamp < 5 * 60 * 1000) {
        return memoryCache;
      }
      const cachedAnalysis = await getFromAsyncStorage();
      if (cachedAnalysis) {
        memoryCache = cachedAnalysis;
        memoryCacheTimestamp = Date.now();
        return cachedAnalysis;
      }
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      const settings = await getAdvancedAnalysisSettings();
      const now = Date.now();
      const needsRefresh = now - settings.lastUpdatedAt > settings.refreshInterval;
      if (!forceRefresh && !needsRefresh) {
        const analysisData = await getLatestAnalysisFromFirestore();

        if (analysisData) {
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

export const getLatestAnalysisFromFirestore = async (): Promise<AdvancedTravelAnalysis | null> => {
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

export const getAdvancedAnalysisSettings = async (): Promise<AdvancedAnalysisSettings> => {
  try {
    if (memoryCacheSettings) {
      return memoryCacheSettings;
    }
    const jsonValue = await AsyncStorage.getItem(ASYNC_STORAGE_SETTINGS_KEY);
    if (jsonValue) {
      const settings = JSON.parse(jsonValue) as AdvancedAnalysisSettings;
      memoryCacheSettings = settings;
      return settings;
    }
    const currentUser = auth.currentUser;
    if (currentUser) {
      const settingsRef = doc(db, "users", currentUser.uid, "settings", "advancedTravelAnalysis");
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as AdvancedAnalysisSettings;
        memoryCacheSettings = settings;
        await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(settings));

        return settings;
      }
    }
    const defaultSettings: AdvancedAnalysisSettings = {
      lastUpdatedAt: 0,
      refreshInterval: ANALYSIS_REFRESH_INTERVAL,
    };

    if (currentUser) {
      const settingsRef = doc(db, "users", currentUser.uid, "settings", "advancedTravelAnalysis");
      await setDoc(settingsRef, defaultSettings);
    }
    memoryCacheSettings = defaultSettings;
    await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(defaultSettings));

    return defaultSettings;
  } catch (error) {
    console.error("Error getting advanced analysis settings:", error);
    return {
      lastUpdatedAt: 0,
      refreshInterval: ANALYSIS_REFRESH_INTERVAL,
    };
  }
};

export const updateAdvancedAnalysisSettings = async (
  settings: Partial<AdvancedAnalysisSettings>
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }
    const currentSettings = await getAdvancedAnalysisSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };
    const settingsRef = doc(db, "users", currentUser.uid, "settings", "advancedTravelAnalysis");
    await setDoc(settingsRef, updatedSettings, { merge: true });

    memoryCacheSettings = updatedSettings;
    await AsyncStorage.setItem(ASYNC_STORAGE_SETTINGS_KEY, JSON.stringify(updatedSettings));

    console.log("Advanced travel analysis settings updated successfully");
  } catch (error) {
    console.error("Error updating advanced analysis settings:", error);
  }
};

export const clearMemoryCache = (): void => {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  memoryCacheSettings = null;
};

export const clearAsyncStorageCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
    await AsyncStorage.removeItem(ASYNC_STORAGE_SETTINGS_KEY);
    await AsyncStorage.removeItem(ASYNC_STORAGE_PROGRESS_KEY);
  } catch (error) {
    console.error("Error clearing AsyncStorage cache:", error);
  }
};

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

const saveToAsyncStorage = async (analysis: AdvancedTravelAnalysis): Promise<void> => {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(analysis));
  } catch (error) {
    console.error("Error saving to AsyncStorage:", error);
  }
};

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

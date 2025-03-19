// types/LearnScreen/AdvancedTravelAnalysisTypes.ts
import { VisitedPlaceDetails } from "../MapTypes";

/**
 * Time-based progression analysis for visits
 */
export interface TemporalAnalysis {
  // Travel evolution over time
  yearlyProgression: {
    [year: string]: {
      totalVisits: number;
      uniqueLocations: number;
      dominantCategory: string;
      explorationRadius: number; // Average distance from home base in km
      topDestination: string;
    };
  };

  // Seasonality patterns
  seasonalPatterns: {
    winter: {
      visitPercentage: number;
      preferredCategories: string[];
      averageDuration: string;
    };
    spring: {
      visitPercentage: number;
      preferredCategories: string[];
      averageDuration: string;
    };
    summer: {
      visitPercentage: number;
      preferredCategories: string[];
      averageDuration: string;
    };
    fall: {
      visitPercentage: number;
      preferredCategories: string[];
      averageDuration: string;
    };
  };

  // Monthly visit distribution
  monthlyDistribution: {
    [month: string]: number; // Percentage of visits in each month
  };
}

/**
 * Geographical patterns and spatial analysis
 */
export interface SpatialAnalysis {
  // Travel radius metrics
  explorationRadius: {
    average: number; // In kilometers
    maximum: number;
    minimum: number;
    growthRate: number; // Percentage change in radius over time
  };

  // Clustering analysis
  locationClusters: {
    clusterName: string;
    centerPoint: string; // Main location name
    numberOfVisits: number;
    topCategories: string[];
    visits: number;
  }[];

  // Directional tendencies
  directionTendencies: {
    primaryDirection: string; // N, S, E, W, NE, etc.
    secondaryDirection: string;
    directionPercentages: {
      [direction: string]: number;
    };
    insight: string;
  };

  // Region diversity
  regionDiversity: {
    uniqueRegions: number;
    mostExploredRegion: string;
    leastExploredRegion: string;
    regionSpread: number; // 0-100 score of geographical spread
    diversityInsight: string;
  };
}

/**
 * Behavioral patterns and psychological analysis
 */
export interface BehavioralAnalysis {
  // Exploration style
  explorationStyle: {
    spontaneityScore: number; // 0-100
    planningLevel: number; // 0-100
    varietySeeking: number; // 0-100
    returnVisitRate: number; // Percentage of repeat visits
    noveltyPreference: number; // 0-100
  };

  // Travel personality traits
  travelPersonality: {
    openness: number; // 0-100
    cultureEngagement: number; // 0-100
    socialOrientation: number; // 0-100 (low = solitary, high = social)
    activityLevel: number; // 0-100 (low = relaxed, high = active)
    adventurousness: number; // 0-100
  };

  // Motivational factors
  motivationalFactors: {
    factor: string;
    strength: number; // 0-100
    insight: string;
  }[];

  // Decision patterns
  decisionPatterns: {
    decisionSpeed: number; // 0-100 (low = deliberate, high = quick)
    consistencyScore: number; // 0-100 (low = varied, high = consistent)
    influenceFactors: string[];
    insight: string;
  };
}

/**
 * Predictive travel analytics
 */
export interface PredictiveAnalysis {
  // Next likely destinations
  recommendedDestinations: {
    name: string;
    confidenceScore: number; // 0-100
    reasoningFactors: string[];
    bestTimeToVisit: string;
    expectedInterestLevel: number; // 0-100
  }[];

  // Future travel trends
  predictedTrends: {
    trend: string;
    likelihood: number; // 0-100
    timeframe: string; // "Short-term", "Medium-term", "Long-term"
    explanation: string;
  }[];

  // Interest evolution
  interestEvolution: {
    emergingInterests: string[];
    decliningInterests: string[];
    steadyInterests: string[];
    newSuggestions: string[];
  };

  // Travel trajectory
  travelTrajectory: {
    explorationRate: number; // Predicted change in visit frequency
    radiusChange: number; // Predicted change in exploration radius
    nextPhase: string; // Description of predicted next travel phase
    insightSummary: string;
  };
}

/**
 * Interactive analytical insights
 */
export interface AnalyticalInsights {
  // Key behavioral insights
  keyInsights: {
    title: string;
    description: string;
    confidenceScore: number; // 0-100
    category: string;
    tags: string[];
  }[];

  // Pattern analysis
  patternInsights: {
    pattern: string;
    strength: number; // 0-100
    examples: string[];
    implications: string;
  }[];

  // Anomalies and unique behaviors
  anomalies: {
    description: string;
    significance: number; // 0-100
    explanation: string;
  }[];

  // Correlations between factors
  correlations: {
    factor1: string;
    factor2: string;
    correlationStrength: number; // -100 to 100
    insight: string;
  }[];
}

/**
 * Comparative analytics against benchmarks
 */
export interface ComparativeAnalysis {
  // Persona comparison
  personaComparison: {
    mostSimilarPersona: string;
    similarityScore: number; // 0-100
    keyDifferences: string[];
    distinctiveTraits: string[];
  };

  // Traveler archetype analysis
  archetypeAnalysis: {
    primaryArchetype: string;
    archetypeScore: number; // 0-100
    secondaryArchetype: string;
    secondaryScore: number; // 0-100
    atypicalTraits: string[];
  };

  // Benchmark comparisons
  benchmarks: {
    category: string;
    userScore: number;
    averageScore: number;
    percentile: number; // 0-100
    insight: string;
  }[];

  // Uniqueness factors
  uniquenessFactors: {
    factor: string;
    uniquenessScore: number; // 0-100
    explanation: string;
  }[];
}

/**
 * Main Advanced Travel Analysis object
 */
export interface AdvancedTravelAnalysis {
  id?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isGenerating: boolean;
  basedOnPlaces: number;

  // Primary analysis sections
  temporalAnalysis: TemporalAnalysis;
  spatialAnalysis: SpatialAnalysis;
  behavioralAnalysis: BehavioralAnalysis;
  predictiveAnalysis: PredictiveAnalysis;
  analyticalInsights: AnalyticalInsights;
  comparativeAnalysis: ComparativeAnalysis;

  // Meta information
  analysisQuality: number; // 0-100 score based on data quality
  confidenceScore: number; // 0-100 score of overall confidence
  lastRefreshed: string;
  nextRefreshDue: string;
}

/**
 * Settings for advanced travel analysis service
 */
export interface AdvancedAnalysisSettings {
  lastUpdatedAt: number;
  refreshInterval: number; // Milliseconds
  requestLimits?: {
    requestCount: number;
    lastRequestDate: string;
    nextAvailableTime?: string;
  };
}

/**
 * Analysis request limits information
 */
export interface AnalysisRequestLimitInfo {
  canRequest: boolean;
  requestsRemaining: number;
  nextAvailableTime?: string;
}

/**
 * Progress information for analysis generation
 */
export interface AnalysisGenerationProgress {
  isGenerating: boolean;
  progress: number; // 0-100
  stage: string;
  estimatedTimeRemaining?: number; // Seconds
  startedAt?: number; // Timestamp
}

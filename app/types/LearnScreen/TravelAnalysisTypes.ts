export interface TemporalAnalysis {
  yearlyProgression?: {
    [year: string]: {
      totalVisits: number;
      uniqueLocations: number;
      dominantCategory: string;
      explorationRadius: number;
      topDestination: string;
    };
  };

  seasonalPatterns?: {
    winter?: {
      visitPercentage: number;
      preferredCategories?: string[];
      averageDuration?: string;
    };
    spring?: {
      visitPercentage: number;
      preferredCategories?: string[];
      averageDuration?: string;
    };
    summer?: {
      visitPercentage: number;
      preferredCategories?: string[];
      averageDuration?: string;
    };
    fall?: {
      visitPercentage: number;
      preferredCategories?: string[];
      averageDuration?: string;
    };
  };

  monthlyDistribution?: {
    [month: string]: number;
  };
}

/**
 * Geographical patterns and spatial analysis
 */
export interface SpatialAnalysis {
  // Travel radius metrics
  explorationRadius?: {
    average: number;
    maximum: number;
    minimum: number;
    growthRate: number;
  };

  // Clustering analysis
  locationClusters?: {
    clusterName: string;
    centerPoint: string;
    numberOfVisits: number;
    topCategories?: string[];
    visits: number;
  }[];

  // Directional tendencies
  directionTendencies?: {
    primaryDirection: string;
    secondaryDirection: string;
    directionPercentages?: {
      [direction: string]: number;
    };
    insight?: string;
  };

  // Region diversity
  regionDiversity?: {
    uniqueRegions: number;
    mostExploredRegion: string;
    leastExploredRegion: string;
    regionSpread: number;
    diversityInsight?: string;
  };
}

/**
 * Behavioral patterns and psychological analysis
 */
export interface BehavioralAnalysis {
  // Exploration style
  explorationStyle?: {
    spontaneityScore: number;
    planningLevel: number;
    varietySeeking: number;
    returnVisitRate: number;
    noveltyPreference: number;
  };

  // Travel personality traits
  travelPersonality?: {
    openness: number;
    cultureEngagement: number;
    socialOrientation: number;
    activityLevel: number;
    adventurousness: number;
  };

  // Motivational factors
  motivationalFactors?: {
    factor: string;
    strength: number;
    insight?: string;
  }[];

  // Decision patterns
  decisionPatterns?: {
    decisionSpeed: number;
    consistencyScore: number;
    influenceFactors?: string[];
    insight?: string;
  };
}

/**
 * Predictive travel analytics
 */
export interface PredictiveAnalysis {
  // Next likely destinations
  recommendedDestinations?: {
    name: string;
    confidenceScore: number;
    reasoningFactors?: string[];
    bestTimeToVisit?: string;
    expectedInterestLevel: number;
  }[];

  // Future travel trends
  predictedTrends?: {
    trend: string;
    likelihood: number;
    timeframe: string;
    explanation?: string;
  }[];

  // Interest evolution
  interestEvolution?: {
    emergingInterests?: string[];
    decliningInterests?: string[];
    steadyInterests?: string[];
    newSuggestions?: string[];
  };

  // Travel trajectory
  travelTrajectory?: {
    explorationRate: number;
    radiusChange: number;
    nextPhase?: string;
    insightSummary?: string;
  };
}

/**
 * Interactive analytical insights
 */
export interface AnalyticalInsights {
  // Key behavioral insights
  keyInsights?: {
    title: string;
    description?: string;
    confidenceScore: number;
    category?: string;
    tags?: string[];
  }[];

  // Pattern analysis
  patternInsights?: {
    pattern: string;
    strength: number;
    examples?: string[];
    implications?: string;
  }[];

  // Anomalies and unique behaviors
  anomalies?: {
    description: string;
    significance: number;
    explanation?: string;
  }[];

  // Correlations between factors
  correlations?: {
    factor1: string;
    factor2: string;
    correlationStrength: number;
    insight?: string;
  }[];
}

/**
 * Comparative analytics
 */
export interface ComparativeAnalysis {
  // Persona comparison
  personaComparison?: {
    mostSimilarPersona: string;
    similarityScore: number;
    keyDifferences?: string[];
    distinctiveTraits?: string[];
  };

  // Traveler archetype analysis
  archetypeAnalysis?: {
    primaryArchetype: string;
    archetypeScore: number;
    secondaryArchetype: string;
    secondaryScore: number;
    atypicalTraits?: string[];
  };

  // Benchmark comparisons
  benchmarks?: {
    category: string;
    userScore: number;
    averageScore: number;
    percentile: number;
    insight?: string;
  }[];

  // Uniqueness factors
  uniquenessFactors?: {
    factor: string;
    uniquenessScore: number;
    explanation?: string;
  }[];
}

/**
 *  Advanced Travel Analysis object
 */
export interface AdvancedTravelAnalysis {
  id?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isGenerating: boolean;
  basedOnPlaces: number;
  temporalAnalysis: TemporalAnalysis;
  spatialAnalysis: SpatialAnalysis;
  behavioralAnalysis: BehavioralAnalysis;
  predictiveAnalysis: PredictiveAnalysis;
  analyticalInsights: AnalyticalInsights;
  comparativeAnalysis: ComparativeAnalysis;
  analysisQuality: number;
  confidenceScore: number;
  lastRefreshed: string;
  nextRefreshDue: string;
}

/**
 * Settings
 */
export interface AdvancedAnalysisSettings {
  lastUpdatedAt: number;
  refreshInterval: number;
  requestLimits?: {
    requestCount: number;
    lastRequestDate: string;
    nextAvailableTime?: string;
  };
}

/**
 * Analysis request limits
 */
export interface AnalysisRequestLimitInfo {
  canRequest: boolean;
  requestsRemaining: number;
  nextAvailableTime?: string;
}

/**
 * Progress information
 */
export interface AnalysisGenerationProgress {
  isGenerating: boolean;
  progress: number;
  stage: string;
  estimatedTimeRemaining?: number;
  startedAt?: number;
}

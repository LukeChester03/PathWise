// types/LearnScreen/CulturalContextTypes.ts

/**
 * Custom or tradition object
 */
export interface Custom {
  title: string;
  description: string;
}

/**
 * Recommendation object for restaurants and bars
 */
export interface Recommendation {
  name: string;
  description: string;
  specialty?: string;
}

/**
 * Base cultural insight type
 */
export interface CulturalInsight {
  id?: string;
  region: string;
  customs: Custom[];
  etiquette: string;
  diningTips: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Enhanced cultural insight type with recommendations
 */
export interface EnhancedCulturalInsight extends CulturalInsight {
  restaurants?: Recommendation[];
  bars?: Recommendation[];
  localTips?: string[];
}

/**
 * Request limit information
 */
export interface RequestLimitInfo {
  requestCount: number;
  lastRequestDate: string;
  nextAvailableTime?: string;
}

/**
 * Cultural context settings
 */
export interface CulturalContextSettings {
  lastUpdatedAt: number;
  explorableRegions?: string[];
  requestLimits?: RequestLimitInfo;
}

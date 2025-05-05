export interface Custom {
  title: string;
  description: string;
}

export interface Recommendation {
  name: string;
  description: string;
  specialty?: string;
}

export interface CulturalInsight {
  id?: string;
  region: string;
  customs: Custom[];
  etiquette: string;
  diningTips: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnhancedCulturalInsight extends CulturalInsight {
  restaurants?: Recommendation[];
  bars?: Recommendation[];
  localTips?: string[];
}

export interface RequestLimitInfo {
  requestCount: number;
  lastRequestDate: string;
  nextAvailableTime?: string;
}

export interface CulturalContextSettings {
  lastUpdatedAt: number;
  explorableRegions?: string[];
  requestLimits?: RequestLimitInfo;
}

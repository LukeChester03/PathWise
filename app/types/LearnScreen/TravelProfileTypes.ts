// types/LearnScreen/TravelProfileTypes.ts
export interface TravelBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  dateEarned: Date;
  // Add completed status to track which badges the user has earned
  completed: boolean;
  // Add requirements to track progress towards badge
  requirements: {
    type: string;
    value: number;
    current: number;
  }[];
}

export interface TravelPreference {
  category: string;
  percentage: number;
  icon: string;
}

export interface TravelProfile {
  type: string;
  level: string;
  description: string;
  badges: TravelBadge[];
  streak: number;
  visitFrequency: {
    weekdays: {
      most: string;
      percentage: number;
      insight: string;
    };
    timeOfDay: {
      most: string;
      percentage: number;
      insight: string;
    };
    season: {
      most: string;
      percentage: number;
      insight: string;
    };
  };
  visitation: {
    averageDuration: string;
    averageDistance: string;
    mostVisitedCity: string;
  };
  patterns: string[];
  preferences: {
    categories: TravelPreference[];
    architecturalStyles: {
      name: string;
      percentage: number;
    }[];
    activities: {
      name: string;
      percentage: number;
    }[];
  };
  recentInsights: string[];
  isGenerating: boolean;
}

// Add a new interface for badge tasks
export interface BadgeTask {
  id: string;
  name: string;
  description: string;
  type:
    | "visitCount"
    | "categoryVisit"
    | "streak"
    | "distance"
    | "countries"
    | "continents"
    | "explorationscore";
  requirement: number;
  icon: string;
  category?: string; // For category-specific badges
}

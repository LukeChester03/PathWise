export interface TravelBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  dateEarned: Date;
  completed: boolean;
  requirements: {
    type: string;
    value: number;
    current: number;
    category?: string;
  }[];
}

export interface TravelPreference {
  category: string;
  percentage: number;
  icon: string;
}

export interface TravelerTrait {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface TravelMilestone {
  title: string;
  value: string | number;
  icon: string;
  description?: string;
}

export interface TravelProfile {
  type: string;
  level: string;
  description: string;
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
  travelerTraits?: TravelerTrait[];
  travelMilestones?: TravelMilestone[];
  firstVisitDate?: string;
  bestDayToExplore?: string;
  explorationScore?: number;
  isGenerating: boolean;
}

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
  category?: string;
}

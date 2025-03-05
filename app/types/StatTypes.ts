// types/StatTypes.ts
import { Timestamp } from "firebase/firestore";

export type StatIcon =
  | "map-outline"
  | "earth-outline"
  | "flame-outline"
  | "star-outline"
  | "compass-outline"
  | "location-outline"
  | "walk-outline"
  | "restaurant-outline"
  | "airplane-outline"
  | "time-outline"
  | "camera-outline"
  | "trail-sign-outline"
  | "trophy-outline"
  | "footsteps-outline"
  | "analytics-outline";

export interface StatItem {
  id: number;
  icon: StatIcon;
  value: number | string;
  label: string;
  gradientColors: [string, string]; // Tuple of two colors
}

export interface UserStatsData {
  // Core stats
  placesDiscovered: number;
  countriesVisited: number;
  dayStreak: number;
  achievementsEarned: number;

  // Additional stats
  distanceTraveled: number; // In kilometers
  topCity: string;
  topCityCount: number;
  explorationScore: number;
  localExpertArea: string;
  localExpertCount: number;
  avgVisitsPerWeek: number;
  photosTaken: number;
  favoriteCategory: string;
  favoriteCategoryCount: number;
  peakExplorationHour: number;
  explorationLevel: number;
  totalTime: number; // In minutes
  weekendExplorerScore: number;
  longestJourney: number; // In kilometers
  continentsVisited: number;
  firstVisitTime?: Date | Timestamp;

  // Metadata
  lastUpdated: Date | Timestamp;
  lastLogin?: Date | Timestamp;
  visitedCountries?: string[];
  processedPlaceIds?: string[];
  visitedCities?: { [city: string]: number };
  visitedCategories?: { [category: string]: number };
  weekdayVisits?: number[];
  hourVisits?: number[];
  explorationMilestones?: { [milestone: string]: boolean };
}

export interface VisitedPlace {
  placeId: string;
  name: string;
  country: string;
  city?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  category?: string;
  visitedAt: Date | Timestamp;
  stayDuration?: number; // In minutes
  photosTaken?: number;
}

export interface ExplorationLevel {
  level: number;
  title: string;
  requiredScore: number;
  icon: string;
}

export const EXPLORATION_LEVELS: ExplorationLevel[] = [
  { level: 1, title: "Beginner Explorer", requiredScore: 0, icon: "🔍" },
  { level: 2, title: "Curious Traveler", requiredScore: 100, icon: "🧭" },
  { level: 3, title: "Adventure Seeker", requiredScore: 250, icon: "🌄" },
  { level: 4, title: "Pathfinder", requiredScore: 500, icon: "🧗" },
  { level: 5, title: "Globetrotter", requiredScore: 1000, icon: "✈️" },
  { level: 6, title: "Expedition Leader", requiredScore: 2000, icon: "🏆" },
  { level: 7, title: "Discovery Master", requiredScore: 3500, icon: "🌎" },
  { level: 8, title: "World Conqueror", requiredScore: 5000, icon: "👑" },
  { level: 9, title: "Legend of Travel", requiredScore: 7500, icon: "⭐" },
  { level: 10, title: "Ultimate Explorer", requiredScore: 10000, icon: "🌟" },
];

// Fix color definitions as tuples with explicit type
export const STAT_COLORS: { [key: string]: [string, string] } = {
  blue: ["#4A90E2", "#5DA9FF"],
  orange: ["#FF7043", "#FF8A65"],
  pink: ["#d03f74", "#ff1493"],
  green: ["#50C878", "#63E08C"],
  purple: ["#8A2BE2", "#9370DB"],
  teal: ["#20B2AA", "#48D1CC"],
  yellow: ["#FFD700", "#FFA500"],
  red: ["#FF4500", "#FF6347"],
  cyan: ["#00CED1", "#5F9EA0"],
  indigo: ["#4B0082", "#6A5ACD"],
};

// types/index.ts

// Specific icon types for Ionicons
export type StatIcon =
  | "compass-outline"
  | "map-outline"
  | "earth-outline"
  | "flame-outline"
  | "star-outline";

// Define the structure of a single stat item
export interface StatItem {
  id: number;
  icon: StatIcon;
  value: number;
  label: string;
  gradientColors: [string, string];
}

// Define the structure of user stats in the database
export interface UserStatsData {
  placesDiscovered?: number;
  countriesVisited?: number;
  dayStreak?: number;
  achievementsEarned?: number;
  lastUpdated?: Date;
}

// Optional: Define a type for potential stat categories
export type StatCategory =
  | "Places Discovered"
  | "Countries Visited"
  | "Day Streak"
  | "Achievements Earned";

// Optional: Interface for stat tracking metadata
export interface StatMetadata {
  category: StatCategory;
  description: string;
  icon: StatIcon;
  gradient: {
    colors: [string, string];
  };
}

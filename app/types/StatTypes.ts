// types/StatTypes.ts
import { Timestamp } from "firebase/firestore";

export type StatIcon =
  | "map-outline"
  | "earth-outline"
  | "flame-outline"
  | "star-outline"
  | "compass-outline";

export interface StatItem {
  id: number;
  icon: StatIcon;
  value: number;
  label: string;
  gradientColors: [string, string]; // Tuple of two colors
}

export interface UserStatsData {
  placesDiscovered: number;
  countriesVisited: number;
  dayStreak: number;
  achievementsEarned: number;
  lastUpdated: Date | Timestamp;
  lastLogin?: Date | Timestamp;
  visitedCountries?: string[]; // Array of visited country names
  processedPlaceIds?: string[]; // Array of processed place IDs to prevent duplicates
}

export interface VisitedPlace {
  placeId: string;
  name: string;
  country: string;
  location: {
    latitude: number;
    longitude: number;
  };
  visitedAt: Date | Timestamp;
}

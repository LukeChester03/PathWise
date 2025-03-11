// navigation/types.ts
import { StatItem } from "../types/StatTypes";

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Explore: undefined;
  Learn: undefined;
  Discover: undefined;
  Landing: undefined;
  Place: undefined;
  Search: undefined;
  ViewAll: { viewType: "myPlaces" | "nearbyPlaces" };
  MyJourney: { stats: StatItem[] };
};

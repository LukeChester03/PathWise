// navigation/types.ts
import { StatItem } from "../types/StatTypes";
import { Place, VisitedPlaceDetails } from "../types/MapTypes";

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
  PlaceDetails: {
    placeId: string;
    place?: Place | VisitedPlaceDetails;
  };
  TravelProfile: undefined;
  Phrasebook: {
    visitedPlaces: VisitedPlaceDetails[];
    phrases?: any[];
  };
};

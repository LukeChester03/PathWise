export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PhotoReference {
  height: number;
  width: number;
  html_attributions: string[];
  photo_reference: string;
}

export interface Review {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  profile_photo_url?: string;
}

export interface OpeningHours {
  open_now?: boolean;
  periods?: {
    open: {
      day: number;
      time: string;
    };
    close: {
      day: number;
      time: string;
    };
  }[];
  weekday_text?: string[];
}

export interface EditorialSummary {
  overview?: string;
  language?: string;
}

export interface Place {
  place_id: string;
  id?: string;
  name: string;
  address?: string;
  formatted_address?: string;
  phone?: string;
  formatted_phone_number?: string;
  website: string | null;
  url?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
  };
  description?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: PhotoReference[];
  openingHours?: OpeningHours;
  opening_hours?: OpeningHours;
  reviews?: Review[];
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  vicinity?: string;
  business_status?: string;
  distance?: number;
  isVisited?: boolean;
  visitedAt?: string;
  editorial_summary?: EditorialSummary;
  hasFullDetails?: boolean;
  detailsFetchedAt?: number;
  viewCount?: number;
  lastViewed?: string;
  tourismScore?: number;
}

export interface PlaceDetails {
  result: {
    place_id: string;
    name: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      viewport?: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
    };
    formatted_address: string;
    formatted_phone_number?: string;
    website?: string;
    url?: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: Review[];
    photos?: PhotoReference[];
    opening_hours?: OpeningHours;
    price_level?: number;
    editorial_summary?: EditorialSummary;
    desc?: string;
    types?: string[];
    address_components?: {
      long_name: string;
      short_name: string;
      types: string[];
    }[];
    international_phone_number?: string;
    isVisited?: boolean;
    visitedAt?: string;
    hasFullDetails?: boolean;
    detailsFetchedAt?: number;
  };
  status: string;
}

export interface DetailsCacheEntry {
  placeId: string;
  place: Place;
  fetchedAt: number;
  lastViewed?: number;
}

export interface ApiResponse {
  html_attributions: string[];
  next_page_token?: string;
  results: Place[];
  status: string;
  error_message?: string;
}

export interface NearbyPlacesResponse {
  places: Place[];
  furthestDistance: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Region extends Coordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface PlacePhoto {
  height: number;
  width: number;
  html_attributions: string[];
  photo_reference: string;
}

export interface VisitedPlaceDetails extends Place {
  visitedAt: string;
  placeType?: string;
  tags?: string[];
  visitDate?: string;
  location?: string;
}

export interface CacheStats {
  memoryCache: {
    places: number;
    cacheCenter?: string;
    ageInDays?: number;
  };
  detailsCache: {
    count: number;
    freshCount: number;
    staleCount: number;
  };
  firebaseCache?: {
    areas: number;
    places: number;
    permanentDetails: number;
  };
}

export interface NavigationDistance {
  text: string;
  value: number;
}

export interface NavigationDuration {
  text: string;
  value: number;
}

export interface NavigationStep {
  id: number;
  instructions: string;
  distance: NavigationDistance;
  duration: NavigationDuration;
  maneuver: string;
  startLocation: Coordinate;
  endLocation: Coordinate;
}

export interface RouteInfo {
  coords: Coordinate[];
  duration: string;
  distance: number;
  travelMode: TravelMode;
}

export interface CameraConfig {
  center: Coordinate;
  heading: number;
  pitch: number;
  altitude: number;
  zoom: number;
}

export interface NotifiedPlaces {
  [placeId: string]: number;
}

export interface ViewModeToggleProps {
  viewMode: string;
  onToggle: () => void;
}

export interface CardToggleArrowProps {
  onPress: () => void;
}

export interface EndJourneyButtonProps {
  onPress: () => void;
}

export interface InAppNotificationProps {
  visible: boolean;
  place: Place | null;
  notificationOpacity: any;
  notificationTranslateY: any;
  onExplore: (place: Place) => void;
  onDismiss: () => void;
}

export interface NotificationBadgeProps {
  count: number;
  onPress: () => void;
}

export interface PlaceSelectionResult {
  isDiscovered: boolean;
  isAlreadyAt: boolean;
  details?: VisitedPlaceDetails | null;
}

export type TravelMode = "walking" | "driving" | "bicycling" | "transit";

export type MapViewDirectionsMode = "WALKING" | "DRIVING" | "BICYCLING" | "TRANSIT";

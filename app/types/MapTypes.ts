// types/MapTypes.ts

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

export interface Place {
  place_id: string;
  id?: string;
  name: string;
  address?: string;
  formatted_address?: string; // API sometimes returns this format
  phone?: string;
  formatted_phone_number?: string; // API sometimes returns this format
  website?: string;
  url?: string; // Google Maps URL
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
  opening_hours?: OpeningHours; // API sometimes returns this format
  reviews?: Review[];
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  vicinity?: string;
  business_status?: string;
  distance?: number; // Distance from user in meters
  isVisited?: boolean; // Flag to indicate if the place has been visited
  visitedAt?: string; // Timestamp when the place was visited
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
    editorial_summary?: {
      overview: string;
      language: string;
    };
    desc?: string; // For backward compatibility
    types?: string[];
    address_components?: {
      long_name: string;
      short_name: string;
      types: string[];
    }[];
    international_phone_number?: string;
    isVisited?: boolean; // Flag to indicate if the place has been visited
    visitedAt?: string; // Timestamp when the place was visited
  };
  status: string;
}

export interface ApiResponse {
  html_attributions: string[];
  next_page_token?: string;
  results: Place[];
  status: string;
  error_message?: string;
}

// Response type for fetchNearbyPlaces
export interface NearbyPlacesResponse {
  places: Place[];
  furthestDistance: number;
}

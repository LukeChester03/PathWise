// mapConstants.ts - All map configuration constants

export const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";
export const DESTINATION_REACHED_THRESHOLD = 30; // In meters
export const MARKER_REFRESH_THRESHOLD = 10000; // In milliseconds
export const DEFAULT_CIRCLE_RADIUS = 500; // In meters
export const DEFAULT_ZOOM_LEVEL = 17;

// CAMERA CONFIGURATION
export const NAVIGATION_ZOOM_LEVEL = 18; // Reduced zoom level for better stability
export const NAVIGATION_PITCH = 45; // Reduced pitch for less disorienting view
export const MIN_HEADING_CHANGE = 15; // Increased to reduce small jitters
export const CAMERA_UPDATE_THROTTLE = 1000; // Increased to reduce update frequency
export const HEADING_UPDATE_MIN_DISTANCE = 15; // Increased to reduce heading updates
export const INITIAL_ROUTE_OVERVIEW_DURATION = 3500; // Longer overview for better orientation
export const LOOK_AHEAD_DISTANCE = 70; // Fixed consistent look-ahead distance

// Marker colors from Colors constants
export const MARKER_COLORS = {
  DEFAULT: "primary",
  SELECTED: "primary",
  VISITED: "secondary",
};

// Notification thresholds
export const PROXIMITY_NOTIFICATION_THRESHOLD = 100; // 100 meters
export const NOTIFICATION_COOLDOWN = 600000; // 10 minutes cooldown

// Navigation constants
export const ANNOUNCEMENT_COOLDOWN = 20000; // 20 seconds between announcements
export const LOCATION_UPDATE_THROTTLE = 3; // Process every 3rd update
export const INITIAL_NAVIGATION_DELAY = 20000; // Delay first instruction

// Define travel mode type
export type MapViewDirectionsMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
export type TravelMode = "driving" | "walking" | "bicycling" | "transit";

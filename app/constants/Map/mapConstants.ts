export const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";
export const DESTINATION_REACHED_THRESHOLD = 50;
export const MARKER_REFRESH_THRESHOLD = 60000;
export const DEFAULT_CIRCLE_RADIUS = 500;
export const DEFAULT_ZOOM_LEVEL = 17;

// camera constants
export const NAVIGATION_ZOOM_LEVEL = 18;
export const NAVIGATION_PITCH = 45;
export const MIN_HEADING_CHANGE = 15;
export const CAMERA_UPDATE_THROTTLE = 1000;
export const HEADING_UPDATE_MIN_DISTANCE = 15;
export const INITIAL_ROUTE_OVERVIEW_DURATION = 3500;
export const LOOK_AHEAD_DISTANCE = 70;

export const MARKER_COLORS = {
  DEFAULT: "primary",
  SELECTED: "primary",
  VISITED: "secondary",
};

export const PROXIMITY_NOTIFICATION_THRESHOLD = 100;
export const NOTIFICATION_COOLDOWN = 600000;

// Navigation constants
export const ANNOUNCEMENT_COOLDOWN = 2000;
export const LOCATION_UPDATE_THROTTLE = 8;
export const INITIAL_NAVIGATION_DELAY = 2000;

export type MapViewDirectionsMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
export type TravelMode = "driving" | "walking" | "bicycling" | "transit";

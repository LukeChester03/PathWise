/**
 * Utility functions for interacting with Google Maps APIs
 */

// Your Google Maps API key
const API_KEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";

/**
 * Generate an SVG placeholder for places without images
 * @param {string} placeName - Name of the place
 * @param {number} width - Width of the SVG
 * @param {number} height - Height of the SVG
 * @returns {string} Data URI of SVG placeholder image
 */
const generatePlaceholderSVG = (placeName = "No Image Available", width = 400, height = 200) => {
  // Create a simple SVG with a map pin icon and the place name
  const displayName = placeName.length > 20 ? placeName.substring(0, 17) + "..." : placeName;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#E9F7FE"/>
      <g transform="translate(${width / 2}, ${height / 2 - 20})">
        <circle cx="0" cy="0" r="60" fill="#B5E3FF" opacity="0.7"/>
        <path d="M-30,-60 C-50,-30 -50,30 -30,60 C-10,90 10,90 30,60 C50,30 50,-30 30,-60 C10,-90 -10,-90 -30,-60 Z" fill="#2A94F4" transform="scale(0.6)"/>
        <circle cx="0" cy="0" r="15" fill="white"/>
      </g>
      <text x="${width / 2}" y="${height / 2 + 40}" 
        font-family="Arial, sans-serif" 
        font-size="16" 
        font-weight="bold"
        text-anchor="middle" 
        fill="#2A94F4">
        ${displayName}
      </text>
      <text x="${width / 2}" y="${height / 2 + 65}" 
        font-family="Arial, sans-serif" 
        font-size="14"
        text-anchor="middle" 
        fill="#666666">
        Location Image Not Available
      </text>
    </svg>
  `;

  // Convert SVG to a data URI
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Get a photo URL for a place using the Google Places Photo API
 * @param {Object} place - Place object containing photo reference
 * @param {number} maxWidth - Maximum width of the photo (default: 400)
 * @returns {string} URL for the place photo or a placeholder
 */
export const getPlacePhotoUrl = (place, maxWidth = 400) => {
  const photoRef = place.photos && place.photos[0]?.photo_reference;
  return photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${API_KEY}`
    : generatePlaceholderSVG(place.name, maxWidth, Math.floor(maxWidth * 0.7));
};

/**
 * Generate a static map image URL for a location
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} width - Width of the image in pixels (default: 400)
 * @param {number} height - Height of the image in pixels (default: 200)
 * @param {number} zoom - Map zoom level (default: 15)
 * @param {string} markerColor - Color of the marker (default: 'red')
 * @returns {string} URL for static map image
 */
export const getStaticMapImageUrl = (
  latitude,
  longitude,
  width = 400,
  height = 200,
  zoom = 15,
  markerColor = "red"
) => {
  if (!latitude || !longitude) {
    return generatePlaceholderSVG("No Location Data", width, height);
  }

  const center = `${latitude},${longitude}`;
  const size = `${width}x${height}`;
  const marker = `color:${markerColor}%7C${latitude},${longitude}`;

  return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&markers=${marker}&key=${API_KEY}`;
};

/**
 * Get the most appropriate image URL for a place card
 * Uses place photo if available, otherwise falls back to a static map
 * @param {Object} place - Place object
 * @param {number} width - Desired image width
 * @param {number} height - Desired image height
 * @returns {string} URL for the card image
 */
export const getPlaceCardImageUrl = (place, width = 400, height = 200) => {
  // Try to get the place photo first
  const photoRef = place.photos && place.photos[0]?.photo_reference;
  if (photoRef) {
    return getPlacePhotoUrl(place, width);
  }

  // Fall back to static map if we have coordinates
  if (place.geometry && place.geometry.location) {
    const { lat, lng } = place.geometry.location;
    return getStaticMapImageUrl(lat, lng, width, height);
  }

  // Last resort placeholder with the place name
  return generatePlaceholderSVG(place.name || "Unknown Place", width, height);
};

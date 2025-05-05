import { GOOGLE_MAPS_APIKEY } from "../constants/Map/mapConstants";
import { Place, VisitedPlaceDetails } from "../types/MapTypes";

export const getPlacePhotoUrl = (placeDetails: Place | VisitedPlaceDetails | null): string => {
  if (!placeDetails) return "";

  if (
    placeDetails.photos &&
    placeDetails.photos.length > 0 &&
    placeDetails.photos[0]?.photo_reference
  ) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${placeDetails.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`;
  }
  return `https://via.placeholder.com/800x400/f0f0f0/666666?text=${encodeURIComponent(
    placeDetails.name?.substring(0, 15) || "Place"
  )}`;
};

export const getFormattedAddress = (placeDetails: Place | VisitedPlaceDetails | null): string => {
  if (!placeDetails) return "No address available";
  return placeDetails.formatted_address || placeDetails.vicinity || "No address available";
};

export const formatVisitDate = (placeDetails: VisitedPlaceDetails | null): string | null => {
  if (!placeDetails) return null;

  if ("visitedAt" in placeDetails && placeDetails.visitedAt) {
    const date = new Date(placeDetails.visitedAt);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return null;
};

export const getPlaceType = (placeDetails: Place | VisitedPlaceDetails | null) => {
  if (
    !placeDetails ||
    !placeDetails.types ||
    !Array.isArray(placeDetails.types) ||
    placeDetails.types.length === 0
  ) {
    return null;
  }

  const TYPE_MAPPING: { [key: string]: { label: string; icon: string } } = {
    restaurant: { label: "Restaurant", icon: "restaurant" },
    cafe: { label: "Café", icon: "cafe" },
    bar: { label: "Bar", icon: "beer" },
    food: { label: "Food", icon: "fast-food" },
    store: { label: "Store", icon: "basket" },
    museum: { label: "Museum", icon: "business" },
    art_gallery: { label: "Gallery", icon: "color-palette" },
    park: { label: "Park", icon: "leaf" },
    tourist_attraction: { label: "Attraction", icon: "camera" },
    hotel: { label: "Hotel", icon: "bed" },
    movie_theater: { label: "Cinema", icon: "film" },
    night_club: { label: "Nightclub", icon: "wine" },
    zoo: { label: "Zoo", icon: "paw" },
  };

  for (const type of placeDetails.types) {
    if (TYPE_MAPPING[type]) {
      return TYPE_MAPPING[type];
    }
  }

  return {
    label: placeDetails.types[0].replace(/_/g, " "),
    icon: "location",
  };
};

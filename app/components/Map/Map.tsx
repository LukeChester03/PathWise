// Map.tsx - Updated to only show 40 closest places dynamically
import React, { useEffect, useState, useCallback, useRef } from "react";
import MapView, { PROVIDER_DEFAULT, Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View, StyleSheet, Vibration, Alert, Text } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { handleCancel } from "../../handlers/Map/mapHandlers";
import { handleDestinationReached } from "../../handlers/Map/visitedPlacesHandlers";
import { saveVisitedPlace } from "../../controllers/Map/visitedPlacesController";
import { Colors, NeutralColors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import { useNavigation } from "expo-router";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import NetInfo from "@react-native-community/netinfo";

// Import controllers and global state
import {
  getLocationState,
  getNearbyPlacesState,
  onLocationUpdate,
  onPlacesUpdate,
} from "../../controllers/Map/locationController";

// Import custom hooks
import useMapLocation from "../../hooks/Map/useMapLocation";
import useMapCamera from "../../hooks/Map/useMapCamera";
import useMapPlaces from "../../hooks/Map/useMapPlaces";
import useMapNavigation from "../../hooks/Map/useMapNavigation";

// Import UI components
import { CardToggleArrow, EndJourneyButton, DirectionIndicator } from "./MapControls";
import { ViewModeToggle } from "./ViewModeToggle";
import MapLoading from "./MapLoading";
import MapErrorFallback from "./MapErrorFallback";

// Import cards
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import DestinationCard from "./DestinationCard";
import DiscoveredCard from "./DiscoveredCard";

// Import utils and constants
import {
  GOOGLE_MAPS_APIKEY,
  DESTINATION_REACHED_THRESHOLD,
  MARKER_COLORS,
  LOCATION_UPDATE_THROTTLE,
  MapViewDirectionsMode,
} from "../../constants/Map/mapConstants";
import { Place, Coordinate, NavigationStep, VisitedPlaceDetails } from "../../types/MapTypes";
import * as mapUtils from "../../utils/mapUtils";
import {
  fetchPlaceDetailsOnDemand,
  fetchNearbyPlaces,
  getCacheStats,
} from "../../controllers/Map/placesController";
import { hasMovedSignificantly } from "../../controllers/Map/locationController";
import { getQuotaRecord, getRemainingQuota } from "../../controllers/Map/quotaController";

// Constants for visible places
const MAX_VISIBLE_PLACES = 40; // Show only the 40 closest places on the map

type MapNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define props interface for Map component
interface MapProps {
  placeToShow?: Place | null;
  onPlaceCardShown?: () => void;
  isInitialized?: boolean;
}

const Map: React.FC<MapProps> = ({ placeToShow, onPlaceCardShown }) => {
  getQuotaRecord();
  const navigation = useNavigation<MapNavigationProp>();
  const [placeProcessingAttempts, setPlaceProcessingAttempts] = useState<number>(0);
  const MAX_PROCESSING_ATTEMPTS = 5;
  // State for tracking location and places loading
  const [loading, setLoading] = useState<boolean>(true);
  const [locationReady, setLocationReady] = useState<boolean>(false);
  const [placesReady, setPlacesReady] = useState<boolean>(false);
  const [mapError, setMapError] = useState<Error | null>(null);

  // State for map functionality
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [destinationReached, setDestinationReached] = useState<boolean>(false);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [showDetailsCard, setShowDetailsCard] = useState<boolean>(false);
  const [showArrow, setShowArrow] = useState<boolean>(false);
  const [showDiscoveredCard, setShowDiscoveredCard] = useState<boolean>(false);
  const [destinationSaved, setDestinationSaved] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<string>("follow"); // "follow" or "overview"

  // Add state to track user camera control
  const [userControllingCamera, setUserControllingCamera] = useState<boolean>(false);
  // Add state to track network connectivity
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // NEW STATE: Track visible places - limited to the closest 40
  const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);

  // Route state variables
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  // Add refs for tracking
  const destinationSaveAttemptedRef = useRef<boolean>(false);
  const mapReadyRef = useRef<boolean>(false);
  const cameraUserControlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPlaceToShowRef = useRef<Place | null>(null);
  const placeCardShownRef = useRef<boolean>(false);

  // Custom hooks
  const location = useMapLocation();
  const camera = useMapCamera();
  const places = useMapPlaces();
  const mapNavigation = useMapNavigation();

  const [debugInfo, setDebugInfo] = useState<{
    placeReceived: boolean;
    placeProcessed: boolean;
    cardShown: boolean;
  }>({
    placeReceived: false,
    placeProcessed: false,
    cardShown: false,
  });

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * NEW FUNCTION: Update visible places based on current location
   * This filters all cached places to show only the 40 closest ones
   */
  const updateVisiblePlaces = useCallback(() => {
    if (!location.userLocation || places.places.length === 0) return;

    // Calculate distance for each place from current user location
    const placesWithDistance = places.places.map((place) => {
      // Calculate or use existing distance
      const distance =
        place.distance ||
        mapUtils.haversineDistance(
          location.userLocation!.latitude,
          location.userLocation!.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

      return {
        ...place,
        distance,
      };
    });

    // Sort by distance (closest first) and take only MAX_VISIBLE_PLACES
    const closestPlaces = placesWithDistance
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, MAX_VISIBLE_PLACES);

    console.log(
      `Showing ${closestPlaces.length} closest places out of ${places.places.length} total places`
    );
    setVisiblePlaces(closestPlaces);
  }, [location.userLocation, places.places]);

  // Track placeToShow in ref to prevent processing it multiple times
  useEffect(() => {
    if (placeToShow && !showCard && !showDiscoveredCard && !journeyStarted) {
      console.log(`Map: DIRECT processing for place: ${placeToShow.name}`);
      setDebugInfo((prev) => ({ ...prev, placeReceived: true }));

      try {
        // Set the place directly to state
        places.setSelectedPlace(placeToShow);

        // Use existing travelTime state
        setTravelTime("Calculating...");

        // Calculate a rough travel time estimate as a fallback
        if (location.userLocation) {
          try {
            const userLoc = location.userLocation;
            const placeLoc = {
              latitude: placeToShow.geometry.location.lat,
              longitude: placeToShow.geometry.location.lng,
            };

            // Calculate straight-line distance as fallback
            const distanceInKm =
              mapUtils.haversineDistance(
                userLoc.latitude,
                userLoc.longitude,
                placeLoc.latitude,
                placeLoc.longitude
              ) / 1000;

            // Roughly estimate travel time (assumes 30km/h average speed)
            const estimatedMinutes = Math.ceil(distanceInKm * 2);
            setTravelTime(`~${estimatedMinutes} min`);

            // CHANGED: Instead of immediately showing the card, first check if it's discovered
            console.log(`Checking if place ${placeToShow.name} is already discovered...`);

            // Process place selection while fetching details if needed
            places
              .handlePlaceSelection(placeToShow, userLoc, location.region)
              .then((result) => {
                // Now show the appropriate card based on discovery status
                if (result && result.isDiscovered) {
                  console.log(
                    `Place ${placeToShow.name} is already discovered, showing discovered card`
                  );
                  setShowDiscoveredCard(true);
                  // Make sure explore card is not shown
                  setShowCard(false);
                } else {
                  console.log(`Place ${placeToShow.name} is not discovered, showing explore card`);
                  // Only now show the explore card if not discovered
                  setShowCard(true);
                  // Make sure discovered card is not shown
                  setShowDiscoveredCard(false);
                }

                // Notify parent that card is shown
                if (onPlaceCardShown) {
                  setTimeout(() => {
                    onPlaceCardShown();
                  }, 300);
                }

                setDebugInfo((prev) => ({ ...prev, placeProcessed: true, cardShown: true }));
              })
              .catch((error) => {
                console.error("Error checking discovery status:", error);
                // Fallback - show the explore card anyway
                setShowCard(true);
                if (onPlaceCardShown) onPlaceCardShown();
              });

            // Check if we need to fetch more details using Firebase-first approach
            if (!placeToShow.hasFullDetails) {
              // Check network connectivity first
              if (isConnected) {
                console.log(`Map: Fetching details from Firebase/API for ${placeToShow.name}`);
                try {
                  // First check Firebase before making any API call
                  fetchPlaceDetailsOnDemand(placeToShow.place_id)
                    .then((detailedPlace) => {
                      if (
                        detailedPlace &&
                        places.selectedPlace?.place_id === detailedPlace.place_id
                      ) {
                        // Update the place with detailed info
                        places.setSelectedPlace(detailedPlace);
                        console.log(`Map: Updated with full details for ${detailedPlace.name}`);
                      }
                    })
                    .catch((detailError) => {
                      console.warn("Error fetching place details:", detailError);
                      // Continue with basic place info
                    });
                } catch (detailError) {
                  console.warn("Error fetching place details:", detailError);
                  // Continue with basic place info
                }
              } else {
                console.log("Map: Offline, using basic place data");
              }
            } else {
              console.log(`Map: Place ${placeToShow.name} already has full details`);
            }
          } catch (estimateError) {
            console.warn("Error estimating travel time:", estimateError);
            // Fallback - check discovery status anyway
            places
              .handlePlaceSelection(placeToShow, location.userLocation, location.region)
              .then((result) => {
                if (result && result.isDiscovered) {
                  setShowDiscoveredCard(true);
                } else {
                  setShowCard(true);
                }
                if (onPlaceCardShown) onPlaceCardShown();
              })
              .catch(() => {
                setShowCard(true);
                if (onPlaceCardShown) onPlaceCardShown();
              });
          }
        } else {
          // No location yet, but still check discovery status
          places
            .handlePlaceSelection(
              placeToShow,
              { latitude: 0, longitude: 0 },
              location.region || {
                latitude: 0,
                longitude: 0,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            )
            .then((result) => {
              if (result && result.isDiscovered) {
                setShowDiscoveredCard(true);
              } else {
                setShowCard(true);
              }
              if (onPlaceCardShown) onPlaceCardShown();
            })
            .catch(() => {
              setShowCard(true);
              if (onPlaceCardShown) onPlaceCardShown();
            });
        }
      } catch (error) {
        console.error("Error processing place to show:", error);
        // Fallback - show the explore card as a last resort
        setShowCard(true);
        if (onPlaceCardShown) onPlaceCardShown();
      }
    }
  }, [
    placeToShow,
    showCard,
    showDiscoveredCard,
    journeyStarted,
    isConnected,
    location.userLocation,
  ]);

  // Separate effect to handle processing the pending place
  // This runs on a timer to keep trying until successful or max attempts reached
  useEffect(() => {
    // Check if we have a pending place that hasn't been shown yet
    if (
      pendingPlaceToShowRef.current &&
      !placeCardShownRef.current &&
      placeProcessingAttempts < MAX_PROCESSING_ATTEMPTS
    ) {
      const attemptToProcessPlace = async () => {
        try {
          console.log(
            `Map: Attempt ${placeProcessingAttempts + 1} to process place: ${
              pendingPlaceToShowRef.current?.name
            }`
          );

          // Check if we can process the place now
          const canProcess = !loading || placeProcessingAttempts >= 2; // After 2 attempts, try anyway

          if (canProcess) {
            const placeToProcess = pendingPlaceToShowRef.current;
            if (placeToProcess) {
              console.log(`Map: Processing place: ${placeToProcess.name}`);

              // Mark as processed to prevent multiple processing
              placeCardShownRef.current = true;

              // Set selected place directly
              places.setSelectedPlace(placeToProcess);

              // Show the card immediately for better UX
              setShowCard(true);

              // Try to get more details in the background only if needed
              if (!placeToProcess.hasFullDetails) {
                // Check network connectivity first
                if (isConnected) {
                  try {
                    // First check if it exists in Firebase before making API call
                    console.log(
                      `Map: Fetching details from Firebase/permanent storage for ${placeToProcess.name}`
                    );
                    const detailedPlace = await fetchPlaceDetailsOnDemand(placeToProcess.place_id);
                    if (
                      detailedPlace &&
                      places.selectedPlace?.place_id === detailedPlace.place_id
                    ) {
                      // Update the place with detailed info
                      places.setSelectedPlace(detailedPlace);
                      console.log(`Map: Updated with full details for ${detailedPlace.name}`);
                    }
                  } catch (detailError) {
                    console.warn("Error fetching place details:", detailError);
                    // Continue with basic place info
                  }
                } else {
                  console.log("Map: Offline, using basic place data");
                }
              } else {
                console.log(
                  `Map: Place ${placeToProcess.name} already has full details, no need to fetch`
                );
              }

              // Notify parent
              if (onPlaceCardShown) {
                onPlaceCardShown();
              }
            }
          } else {
            // Increment the attempt counter and try again later
            setPlaceProcessingAttempts((prev) => prev + 1);
          }
        } catch (error) {
          console.error("Error processing place:", error);
          setPlaceProcessingAttempts((prev) => prev + 1);
        }
      };

      // Use setTimeout to try processing after a delay
      const timer = setTimeout(attemptToProcessPlace, 500);
      return () => clearTimeout(timer);
    }
  }, [
    loading,
    placeProcessingAttempts,
    pendingPlaceToShowRef.current,
    placeCardShownRef.current,
    isConnected,
  ]);

  // Function to handle retry when map fails
  const handleRetry = useCallback(() => {
    console.log("Retrying map load...");
    setMapError(null);
    setLoading(true);
    setLocationReady(false);
    setPlacesReady(false);

    // Reset place card state
    pendingPlaceToShowRef.current = null;
    placeCardShownRef.current = false;

    // Force refresh location and places states
    location.resetLocationTracking();
    if (location.userLocation) {
      places.checkAndRefreshPlaces(location.userLocation);
    }

    // Safety timeout to prevent infinite loading
    setTimeout(() => {
      if (loading) {
        setLoading(false);
        setLocationReady(true);
        setPlacesReady(true);
      }
    }, 5000);
  }, [loading]);

  /**
   * Initialize map using pre-loaded location and places data
   */
  useEffect(() => {
    try {
      console.log("Map component mounting, using pre-loaded location and places");

      // Check if Google Maps API key exists
      if (!GOOGLE_MAPS_APIKEY) {
        throw new Error("Google Maps API key is missing");
      }

      // Get initial location state
      const locationState = getLocationState();

      // If location is already initialized
      if (locationState.isInitialized && locationState.userLocation) {
        console.log("Using pre-initialized location:", locationState.userLocation);
        location.setUserLocation(locationState.userLocation);
        location.setRegion(locationState.region);
        setLocationReady(true);
      } else if (locationState.isInitializing) {
        console.log("Location still initializing, waiting for it...");

        // Subscribe to location updates
        const unsubscribeLocation = onLocationUpdate((updatedLocation) => {
          if (updatedLocation.isInitialized && updatedLocation.userLocation) {
            console.log("Location initialized:", updatedLocation.userLocation);
            location.setUserLocation(updatedLocation.userLocation);
            location.setRegion(updatedLocation.region);
            setLocationReady(true);
            unsubscribeLocation(); // Unsubscribe once we have the location
          }
        });

        // Safety timeout for location
        setTimeout(() => {
          if (!locationReady) {
            console.warn("Location initialization timeout");
            setLocationReady(true);
            unsubscribeLocation();
          }
        }, 5000);
      } else {
        console.warn("Location not initializing or initialized, continuing anyway");
        setLocationReady(true);
      }

      // Get initial places state
      const placesState = getNearbyPlacesState();

      // If places are already preloaded
      if (placesState.hasPreloaded) {
        console.log(`Using ${placesState.places.length} preloaded places`);
        places.updatePlaces(placesState.places);
        setPlacesReady(true);

        // Initialize visible places once places are loaded
        if (locationState.userLocation) {
          setTimeout(() => updateVisiblePlaces(), 500);
        }
      } else if (placesState.isPreloading) {
        console.log("Places still preloading, waiting for completion...");

        // Subscribe to places updates
        const unsubscribePlaces = onPlacesUpdate((updatedPlaces) => {
          if (updatedPlaces.hasPreloaded) {
            console.log(`Places preloaded: ${updatedPlaces.places.length} places`);
            places.updatePlaces(updatedPlaces.places);
            setPlacesReady(true);
            if (locationState.userLocation) {
              setTimeout(() => updateVisiblePlaces(), 500);
            }

            unsubscribePlaces();
          }
        });

        // Safety timeout for places
        setTimeout(() => {
          if (!placesReady) {
            console.warn("Places preloading timeout");
            setPlacesReady(true);
            unsubscribePlaces();
          }
        }, 5000);
      } else {
        console.warn("Places not preloading or preloaded, continuing anyway");
        setPlacesReady(true);
      }

      // Overall safety timeout
      setTimeout(() => {
        if (loading) {
          console.warn("Overall loading timeout - forcing completion");
          setLoading(false);
        }
      }, 8000);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(error instanceof Error ? error : new Error("Failed to initialize map"));
      setLoading(false);
      setLocationReady(true);
      setPlacesReady(true);
    }

    // Cleanup subscriptions on unmount
    return () => {
      console.log("Map component unmounting");
      // Clear camera control timeout on unmount
      if (cameraUserControlTimeoutRef.current) {
        clearTimeout(cameraUserControlTimeoutRef.current);
      }
    };
  }, []);

  // Effect to update visible places when the overall places list changes
  useEffect(() => {
    if (places.places.length > 0 && location.userLocation) {
      updateVisiblePlaces();
    }
  }, [places.places, updateVisiblePlaces]);

  // Effect to finish loading when both location and places are ready
  useEffect(() => {
    if (locationReady && placesReady && loading) {
      console.log("Both location and places are ready, finishing loading");
      setLoading(false);

      // Initialize visible places once everything is loaded
      if (location.userLocation && places.places.length > 0) {
        updateVisiblePlaces();
      }
    }
  }, [locationReady, placesReady, loading, updateVisiblePlaces]);

  // Process place to show after map is fully loaded
  useEffect(() => {
    const processPendingPlace = async () => {
      // Only attempt to show place when map is fully loaded, location is ready, and not already shown
      if (
        !loading &&
        locationReady &&
        placesReady &&
        pendingPlaceToShowRef.current &&
        !placeCardShownRef.current &&
        location.userLocation &&
        mapReadyRef.current
      ) {
        console.log(`Processing pending place to show: ${pendingPlaceToShowRef.current.name}`);

        try {
          // Mark as shown to prevent multiple processing
          placeCardShownRef.current = true;

          // Use a small delay to ensure the map is fully rendered
          setTimeout(async () => {
            const placeToProcess = pendingPlaceToShowRef.current;
            if (placeToProcess) {
              try {
                await handlePlaceSelection(placeToProcess);

                // Move camera to show both user and place
                if (location.userLocation && places.selectedPlace) {
                  const placeCoord = {
                    latitude: places.selectedPlace.geometry.location.lat,
                    longitude: places.selectedPlace.geometry.location.lng,
                  };

                  // Fit camera to show both user location and place
                  camera.showRouteOverview(location.userLocation, placeCoord, () => {});
                }

                // Notify parent that place card has been shown
                if (onPlaceCardShown) {
                  onPlaceCardShown();
                }
              } catch (processError) {
                console.error("Error processing selected place:", processError);

                // Reset shown flag to allow retry
                placeCardShownRef.current = false;

                // Try again with a delay
                setTimeout(() => {
                  placeCardShownRef.current = false;
                  setPlaceProcessingAttempts(0);
                }, 2000);
              }
            }
          }, 500);
        } catch (error) {
          console.error("Error in place processing setup:", error);
          // Reset shown flag to allow retry
          placeCardShownRef.current = false;
        }
      }
    };

    processPendingPlace();
  }, [loading, locationReady, placesReady, location.userLocation, mapReadyRef.current]);

  /**
   * Handle map ready event
   */
  const handleMapReady = useCallback(() => {
    console.log("Map is ready");
    mapReadyRef.current = true;

    // Focus camera on user location when map is ready if we have a location
    if (location.userLocation && camera.mapRef.current && !userControllingCamera) {
      console.log("Focusing camera on user location");
      camera.focusOnUserLocation(location.userLocation, true);
      camera.initialCameraSetRef.current = true;
    }

    // Initialize visible places
    if (location.userLocation && places.places.length > 0) {
      updateVisiblePlaces();
    }
  }, [location.userLocation, camera, userControllingCamera, updateVisiblePlaces]);

  /**
   * Handle map drag to detect user controlling camera
   */
  const handleMapDrag = useCallback(() => {
    // When user drags map, set user controlling flag to true
    if (!userControllingCamera) {
      console.log("User is now controlling camera");
      setUserControllingCamera(true);

      // Clear any existing timeout
      if (cameraUserControlTimeoutRef.current) {
        clearTimeout(cameraUserControlTimeoutRef.current);
      }

      // Set a timeout to return to auto mode after 30 seconds (adjust as needed)
      cameraUserControlTimeoutRef.current = setTimeout(() => {
        if (journeyStarted && viewMode === "follow") {
          console.log("Resuming automatic camera control");
          setUserControllingCamera(false);
        }
      }, 30000);
    }
  }, [userControllingCamera, journeyStarted, viewMode]);

  /**
   * Update user heading and check for destination when location changes
   * MODIFIED: Now also updates visible places when location changes significantly
   */
  useEffect(() => {
    if (!location.userLocation) return;

    try {
      // Update user heading based on movement
      const headingUpdated = location.updateHeadingFromMovement(location.userLocation);

      // If heading was updated and we're in follow mode, update the camera
      // Only do this if user is not controlling camera
      if (headingUpdated && viewMode === "follow" && journeyStarted && !userControllingCamera) {
        camera.updateUserCamera(location.userLocation, location.userHeading, false, viewMode);
      }

      // If the camera hasn't been initially focused on the user and we have a location,
      // and the map is ready, focus on the user (only if user is not controlling camera)
      if (
        !camera.initialCameraSetRef.current &&
        location.userLocation &&
        mapReadyRef.current &&
        !userControllingCamera
      ) {
        console.log("Setting initial camera position to user location");
        camera.initialCameraSetRef.current = true;
        camera.focusOnUserLocation(location.userLocation, true);
      }

      // Check for nearby places that might need refreshing (dynamic updates based on movement)
      places.checkAndRefreshPlaces(location.userLocation);

      // Update visible places if we've moved significantly
      // This ensures we're always showing the closest 40 as user moves
      if (hasMovedSignificantly(location.userLocation)) {
        updateVisiblePlaces();
      }

      // If journey started, check if we've reached the destination
      if (journeyStarted && places.destinationCoordinateRef.current && !destinationReached) {
        // Calculate distance to destination
        const distanceToDestination = mapUtils.haversineDistance(
          location.userLocation.latitude,
          location.userLocation.longitude,
          places.destinationCoordinateRef.current.latitude,
          places.destinationCoordinateRef.current.longitude
        );

        console.log(
          `Distance to destination: ${distanceToDestination.toFixed(
            2
          )}m, Threshold: ${DESTINATION_REACHED_THRESHOLD}m`
        );

        // Explicitly use 20 meters as the threshold
        const reachThreshold = Math.min(DESTINATION_REACHED_THRESHOLD, 20);

        const reached = distanceToDestination <= reachThreshold;

        if (reached) {
          console.log(`Destination reached! Distance: ${distanceToDestination.toFixed(2)}m`);
          setDestinationReached(true);

          // Reset the save attempt ref
          destinationSaveAttemptedRef.current = false;

          // Vibrate to alert user
          try {
            Vibration.vibrate([0, 200, 100, 200]);
          } catch (error) {
            console.warn("Could not vibrate:", error);
          }

          // Announce destination reached
          mapNavigation.announceDestinationReached();

          // Mark place as visited with both methods
          if (places.selectedPlace) {
            console.log(`Saving place to database: ${places.selectedPlace.name}`);

            // Method 1: Use the handler
            handleDestinationReached(places.selectedPlace);

            // Method 2: Direct save as a backup
            saveVisitedPlace({
              ...places.selectedPlace,
              isVisited: true,
              visitedAt: new Date().toISOString(),
            })
              .then((success) => {
                console.log(`Direct save result: ${success ? "Success" : "Failed"}`);
                if (success) {
                  setDestinationSaved(true);
                }
              })
              .catch((err) => console.error("Error during direct save:", err));
          }
        }
      }

      // Update navigation instructions if journey started
      if (journeyStarted && mapNavigation.navigationSteps.length > 0) {
        mapNavigation.updateNavigationInstructions(location.userLocation, journeyStarted);
      }
    } catch (error) {
      console.error("Error in location update effect:", error);
      // Don't set map error here to avoid interrupting the user experience
    }
  }, [location.userLocation, userControllingCamera, updateVisiblePlaces]);

  // Add a separate effect to ensure place is saved when destination is reached
  useEffect(() => {
    // If destination is reached but not saved yet, try again
    if (
      destinationReached &&
      places.selectedPlace &&
      !destinationSaved &&
      !destinationSaveAttemptedRef.current
    ) {
      try {
        destinationSaveAttemptedRef.current = true;
        console.log(`Retry saving place to database: ${places.selectedPlace.name}`);

        // Try direct save again
        saveVisitedPlace({
          ...places.selectedPlace,
          isVisited: true,
          visitedAt: new Date().toISOString(),
        })
          .then((success) => {
            console.log(`Retry save result: ${success ? "Success" : "Failed"}`);
            if (success) {
              setDestinationSaved(true);
            }
          })
          .catch((err) => console.error("Error during retry save:", err));
      } catch (error) {
        console.error("Error in destination save effect:", error);
      }
    }
  }, [destinationReached, places.selectedPlace, destinationSaved]);

  /**
   * Setup initial route overview when journey starts
   */
  useEffect(() => {
    try {
      if (journeyStarted && places.selectedPlace && location.userLocation) {
        // Reset destination saved state
        setDestinationSaved(false);

        // Set view mode to follow by default
        setViewMode("follow");

        // Reset user camera control when journey starts
        setUserControllingCamera(false);

        // Setup initial route view if route is loaded
        if (!userControllingCamera) {
          camera.setupInitialRouteView(
            location.userLocation,
            places.destinationCoordinateRef.current,
            setViewMode,
            location.userHeading
          );
        }
      }
    } catch (error) {
      console.error("Error in journey start effect:", error);
    }
  }, [journeyStarted, places.selectedPlace, location.userLocation]);

  /**
   * Handle starting a journey
   */
  const onStartJourney = async () => {
    try {
      setShowCard(false);
      setShowDiscoveredCard(false);
      setJourneyStarted(true);
      setShowDetailsCard(true);
      setDestinationReached(false);
      setDestinationSaved(false);
      setViewMode("follow");
      setUserControllingCamera(false); // Reset user control when journey starts
      destinationSaveAttemptedRef.current = false;

      // Reset tracking state
      location.resetLocationTracking();
      camera.resetCameraState();

      // Reset navigation state
      mapNavigation.resetNavigation();
    } catch (error) {
      console.error("Error starting journey:", error);
      Alert.alert("Navigation Error", "There was a problem starting navigation. Please try again.");
    }
  };

  /**
   * Toggle between follow and overview camera modes
   */
  const handleToggleViewMode = () => {
    try {
      // Reset user camera control when toggling view mode
      setUserControllingCamera(false);

      if (viewMode === "follow") {
        // Switch to overview
        camera.showRouteOverview(
          location.userLocation!,
          places.destinationCoordinateRef.current!,
          setViewMode
        );
      } else {
        // Switch to follow with delay to ensure smooth transition
        setViewMode("follow");
        setTimeout(() => {
          if (location.userLocation && location.userHeading !== null && !userControllingCamera) {
            camera.updateUserCamera(location.userLocation, location.userHeading, true, "follow");
          }
        }, 300);
      }
    } catch (error) {
      console.error("Error toggling view mode:", error);
    }
  };

  /**
   * Handle place selection with auto-detection for proximity
   * Updated to use Firebase-first approach
   */
  const handlePlaceSelection = async (place: Place) => {
    try {
      // Set selected place immediately for better UX
      places.setSelectedPlace(place);

      // Use existing travelTime state
      setTravelTime("Calculating...");

      // Calculate a rough estimate
      if (location.userLocation) {
        try {
          const userLoc = location.userLocation;
          const placeLoc = {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          };

          const distanceInKm =
            mapUtils.haversineDistance(
              userLoc.latitude,
              userLoc.longitude,
              placeLoc.latitude,
              placeLoc.longitude
            ) / 1000;

          const estimatedMinutes = Math.ceil(distanceInKm * 2);
          setTravelTime(`~${estimatedMinutes} min`);
        } catch (error) {
          console.warn("Error estimating travel time:", error);
          setTravelTime("Available soon"); // Fallback
        }
      }

      // IMPORTANT: Don't show any card yet - check if discovered first
      console.log(`Checking if place ${place.name} is already discovered...`);

      try {
        // Use location fallbacks if needed
        const userLocationForProcess = location.userLocation || {
          latitude: 0,
          longitude: 0,
        };
        const regionForProcess = location.region || {
          latitude: 0,
          longitude: 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        // First synchronously check if the place is already discovered before showing any card
        const result = await places.handlePlaceSelection(
          place,
          userLocationForProcess,
          regionForProcess
        );

        // Now show the appropriate card based on discovery status
        if (result && result.isDiscovered) {
          console.log(`Place ${place.name} is already discovered, showing discovered card`);
          setShowDiscoveredCard(true);
          // Make sure explore card is not shown
          setShowCard(false);
        } else {
          console.log(`Place ${place.name} is not discovered, showing explore card`);
          // Only now show the explore card if not discovered
          setShowCard(true);
          // Make sure discovered card is not shown
          setShowDiscoveredCard(false);
        }

        // Fetch detailed place info in the background if needed and connected
        if (!place.hasFullDetails && isConnected) {
          console.log(
            `Map: Background fetching details from Firebase/permanent storage for ${place.name}`
          );
          try {
            // First check Firebase before attempting any API call
            const detailedPlace = await fetchPlaceDetailsOnDemand(place.place_id);
            if (detailedPlace && places.selectedPlace?.place_id === detailedPlace.place_id) {
              // Update the place with detailed info
              places.setSelectedPlace(detailedPlace);
              console.log(`Map: Updated with full details for ${place.name}`);
            }
          } catch (detailError) {
            console.warn("Error fetching place details:", detailError);
            // Continue with basic place info
          }
        } else if (place.hasFullDetails) {
          console.log(`Map: Place ${place.name} already has full details`);
        } else {
          console.log("Map: Offline, using basic place data");
        }
      } catch (error) {
        console.error("Error checking place discovery status:", error);
        // Fallback: Show explore card if error occurs
        setShowCard(true);
      }
    } catch (error) {
      console.error("Error in place selection:", error);
      // Keep showing the card even if there's an error in the background processing
      setShowCard(true);
    }
  };

  /**
   * Handle learn more action from destination card
   * Updated to use the permanent cache before navigating
   * FIXED: Properly handle null values and type checking
   */
  const handleLearnMore = () => {
    try {
      if (places.selectedPlace) {
        console.log(`Navigating to place details for: ${places.selectedPlace.name}`);

        // If place doesn't have full details and we're online, try to load them before navigation
        if (!places.selectedPlace.hasFullDetails && isConnected) {
          // This creates a smoother experience - try to get details before navigation
          // but don't block navigation if details aren't immediately available
          fetchPlaceDetailsOnDemand(places.selectedPlace.place_id)
            .then((detailedPlace) => {
              if (detailedPlace) {
                // Use the correctly typed navigation.navigate with the detailed place
                navigation.navigate("PlaceDetails", {
                  placeId: detailedPlace.place_id,
                  place: detailedPlace,
                });
              } else if (places.selectedPlace) {
                // Fall back to basic place if details aren't available
                navigation.navigate("PlaceDetails", {
                  placeId: places.selectedPlace.place_id,
                  place: places.selectedPlace,
                });
              }
            })
            .catch((error) => {
              console.error("Error fetching place details before navigation:", error);
              // Navigate anyway with basic place if it exists
              if (places.selectedPlace) {
                navigation.navigate("PlaceDetails", {
                  placeId: places.selectedPlace.place_id,
                  place: places.selectedPlace,
                });
              }
            });
        } else {
          // Already has full details or offline, navigate directly
          navigation.navigate("PlaceDetails", {
            placeId: places.selectedPlace.place_id,
            place: places.selectedPlace,
          });
        }
      } else {
        console.error("Cannot navigate: No place selected");
      }
    } catch (error) {
      console.error("Error navigating to place details:", error);
      Alert.alert(
        "Navigation Error",
        "There was a problem opening the details page. Please try again."
      );
    }
  };

  /**
   * Handle dismissal of destination card
   */
  const handleDismissDestinationCard = () => {
    try {
      setDestinationReached(false);
      setDestinationSaved(false);
      destinationSaveAttemptedRef.current = false;
      handleCancel(
        setConfirmEndJourney,
        places.setSelectedPlace,
        setRouteCoordinates,
        setTravelTime,
        setDistance,
        setShowArrow,
        setShowDetailsCard,
        setShowCard,
        setJourneyStarted
      );
      location.resetLocationTracking();
      places.destinationCoordinateRef.current = null;
      camera.initialRouteLoadedRef.current = false;

      // Reset user camera control
      setUserControllingCamera(false);
    } catch (error) {
      console.error("Error dismissing destination card:", error);
    }
  };

  const parseRouteInstructions = (result: any): NavigationStep[] => {
    try {
      if (!result.legs || !result.legs[0] || !result.legs[0].steps) {
        console.warn("Invalid route data format");
        return [];
      }

      const steps = result.legs[0].steps;

      return steps.map((step: any, index: number) => ({
        id: index,
        instructions: step.html_instructions.replace(/<[^>]*>/g, ""), // Remove HTML tags
        distance: {
          text: step.distance.text,
          value: step.distance.value, // meters
        },
        duration: {
          text: step.duration.text,
          value: step.duration.value, // seconds
        },
        maneuver: step.maneuver || "",
        startLocation: {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        },
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
      }));
    } catch (error) {
      console.error("Error parsing route instructions:", error);
      return [];
    }
  };

  /**
   * Handle swipe off for details card
   */
  const handleSwipeOff = () => {
    setShowDetailsCard(false);
    setShowArrow(true);
  };

  /**
   * Handle arrow press to show details card again
   */
  const handleArrowPress = () => {
    setShowArrow(false);
    setShowDetailsCard(true);
  };

  /**
   * Handle end journey button press
   */
  const handleEndJourney = () => {
    try {
      handleCancel(
        setConfirmEndJourney,
        places.setSelectedPlace,
        setRouteCoordinates,
        setTravelTime,
        setDistance,
        setShowCard,
        setShowDetailsCard,
        setShowArrow,
        setJourneyStarted
      );

      // Reset navigation state
      mapNavigation.resetNavigation();

      // Reset destination tracking
      setDestinationReached(false);
      setDestinationSaved(false);
      destinationSaveAttemptedRef.current = false;

      // Reset user camera control
      setUserControllingCamera(false);

      // Reset refs and state
      places.destinationCoordinateRef.current = null;
      camera.initialRouteLoadedRef.current = false;
      location.resetLocationTracking();
    } catch (error) {
      console.error("Error ending journey:", error);
    }
  };

  /**
   * Handle discovered card dismiss
   */
  const handleDismissDiscoveredCard = () => {
    setShowDiscoveredCard(false);
    places.setSelectedPlace(null);
    places.setVisitedPlaceDetails(null);
  };

  /**
   * Handle view discovered details
   * FIXED: Updated to properly handle null values and type checking
   */
  const handleViewDiscoveredDetails = () => {
    try {
      setShowDiscoveredCard(false);
      if (places.selectedPlace) {
        console.log(`View details for discovered place: ${places.selectedPlace.name}`);

        // If we're online, ensure we have the latest details from Firebase/permanent cache
        if (isConnected && !places.selectedPlace.hasFullDetails) {
          fetchPlaceDetailsOnDemand(places.selectedPlace.place_id)
            .then((detailedPlace) => {
              // Navigate with either the detailed place or the visited place if available
              if (detailedPlace) {
                navigation.navigate("PlaceDetails", {
                  placeId: places.selectedPlace!.place_id,
                  place: detailedPlace,
                });
              } else if (places.visitedPlaceDetails) {
                navigation.navigate("PlaceDetails", {
                  placeId: places.selectedPlace!.place_id,
                  place: places.visitedPlaceDetails,
                });
              } else if (places.selectedPlace) {
                navigation.navigate("PlaceDetails", {
                  placeId: places.selectedPlace.place_id,
                  place: places.selectedPlace,
                });
              }
            })
            .catch((error) => {
              console.error("Error fetching place details:", error);
              // Navigate with what we have, checking for null
              if (places.selectedPlace) {
                const placeToUse = places.visitedPlaceDetails || places.selectedPlace;
                navigation.navigate("PlaceDetails", {
                  placeId: places.selectedPlace.place_id,
                  place: placeToUse,
                });
              }
            });
        } else {
          // Navigate with what we have, ensuring it's not null
          if (places.selectedPlace) {
            const placeToUse = places.visitedPlaceDetails || places.selectedPlace;
            navigation.navigate("PlaceDetails", {
              placeId: places.selectedPlace.place_id,
              place: placeToUse,
            });
          }
        }
      } else {
        console.error("Cannot navigate: No place selected");
      }
    } catch (error) {
      console.error("Error viewing discovered details:", error);
      Alert.alert(
        "Navigation Error",
        "There was a problem opening the details page. Please try again."
      );
    }
  };

  // If there's a map error, show the error fallback
  if (mapError) {
    return <MapErrorFallback error={mapError} onRetry={handleRetry} />;
  }

  // Show enhanced loading screen while initializing
  if (loading) {
    return <MapLoading />;
  }

  // Check if Google Maps API key is available
  if (!GOOGLE_MAPS_APIKEY) {
    return (
      <MapErrorFallback error={new Error("Google Maps API key is missing")} onRetry={handleRetry} />
    );
  }

  // Only display the selected place marker if journey is started
  // MODIFIED: Use visiblePlaces array instead of all places
  const markersToDisplay =
    journeyStarted && places.selectedPlace ? [places.selectedPlace] : visiblePlaces;

  try {
    return (
      <View style={styles.container}>
        <MapView
          ref={camera.mapRef}
          style={styles.map}
          initialRegion={location.region || undefined}
          customMapStyle={customMapStyle}
          showsPointsOfInterest={false}
          provider={PROVIDER_DEFAULT}
          followsUserLocation={!userControllingCamera && viewMode === "follow"} // Only follow if not user-controlled
          showsUserLocation={true}
          rotateEnabled={true}
          pitchEnabled={true}
          onMapReady={handleMapReady}
          onPanDrag={handleMapDrag} // Add handler for map drag
          onRegionChangeComplete={() => {
            // Detect when map region changes completely
            if (!userControllingCamera) {
              setUserControllingCamera(true);

              // Set timeout to return to auto mode
              if (cameraUserControlTimeoutRef.current) {
                clearTimeout(cameraUserControlTimeoutRef.current);
              }

              cameraUserControlTimeoutRef.current = setTimeout(() => {
                if (journeyStarted && viewMode === "follow") {
                  console.log("Resuming automatic camera control after region change");
                  setUserControllingCamera(false);
                }
              }, 30000);
            }
          }}
          onUserLocationChange={(event) => {
            try {
              // Throttle location updates
              location.locationUpdateCounterRef.current =
                (location.locationUpdateCounterRef.current + 1) % LOCATION_UPDATE_THROTTLE;
              if (location.locationUpdateCounterRef.current !== 0) return;

              const { coordinate } = event.nativeEvent;
              if (coordinate) {
                // Update user location state with just coordinate properties
                const locationUpdate = {
                  latitude: coordinate.latitude,
                  longitude: coordinate.longitude,
                };

                // Check if the movement is significant before updating state
                if (hasMovedSignificantly(locationUpdate)) {
                  location.setUserLocation(locationUpdate);

                  // If we need to update region separately
                  if (location.region) {
                    location.setRegion({
                      latitude: coordinate.latitude,
                      longitude: coordinate.longitude,
                      latitudeDelta: location.region.latitudeDelta,
                      longitudeDelta: location.region.longitudeDelta,
                    });
                  }

                  // Update visible places when location changes significantly
                  updateVisiblePlaces();
                }
              }
            } catch (error) {
              console.error("Error in location change handler:", error);
            }
          }}
        >
          {/* Place markers - using the filtered visiblePlaces array instead of all places */}
          {markersToDisplay.map((place) => (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              pinColor={places.getMarkerColor(place, MARKER_COLORS)}
              onPress={() => !journeyStarted && handlePlaceSelection(place)}
            />
          ))}

          {/* Route directions */}
          {places.routeCoordinates.length > 0 && journeyStarted && (
            <MapViewDirections
              key={`route-${places.routeKey}-${places.travelMode}`}
              origin={location.userLocation as Coordinate}
              resetOnChange={false}
              mode={places.travelMode.toUpperCase() as MapViewDirectionsMode}
              destination={{
                latitude: places.selectedPlace?.geometry.location.lat || 0,
                longitude: places.selectedPlace?.geometry.location.lng || 0,
              }}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={8}
              strokeColor={Colors.primary}
              optimizeWaypoints={true}
              onReady={(result) => {
                try {
                  if (result.distance && result.duration) {
                    // Update route info when route is ready
                    const newTravelTime = `${parseFloat(result.duration.toString()).toFixed(
                      1
                    )} min`;
                    const newDistance = `${parseFloat(result.distance.toString()).toFixed(1)} km`;

                    console.log(
                      `Route ready: ${result.distance.toFixed(1)}km with ${
                        places.travelMode
                      } mode, time: ${newTravelTime}`
                    );

                    setTravelTime(newTravelTime);
                    setDistance(newDistance);

                    // Parse route instructions and update navigation steps
                    const steps = parseRouteInstructions(result);
                    mapNavigation.setNavigationStepsFromRoute(steps);

                    // If journey has started and this is the first load, show overview
                    // But only if user is not controlling the camera
                    if (
                      journeyStarted &&
                      !camera.initialRouteLoadedRef.current &&
                      location.userLocation &&
                      !userControllingCamera
                    ) {
                      camera.setupInitialRouteView(
                        location.userLocation,
                        places.destinationCoordinateRef.current,
                        setViewMode,
                        location.userHeading
                      );
                    }
                  }
                } catch (error) {
                  console.error("Error processing route:", error);
                }
              }}
              onError={(errorMessage) => {
                console.error("MapViewDirections error:", errorMessage);
              }}
            />
          )}
        </MapView>

        {/* Network status indicator if offline */}
        {!isConnected && (
          <View style={styles.networkStatusContainer}>
            <Text style={styles.networkStatusText}>Offline Mode</Text>
          </View>
        )}

        {/* Location status indicator if needed */}
        {!location.userLocation && (
          <View style={styles.locationStatusContainer}>
            <Text style={styles.locationStatusText}>Waiting for location...</Text>
          </View>
        )}

        {/* Display number of visible vs. total places - Can be removed in production */}
        {/* <View style={styles.placesInfoContainer}>
          <Text style={styles.placesInfoText}>
            Showing {visiblePlaces.length} of {places.places.length} places
          </Text>
        </View> */}

        {/* View mode toggle button */}
        {journeyStarted && <ViewModeToggle viewMode={viewMode} onToggle={handleToggleViewMode} />}

        {/* Cards and UI elements */}
        {showCard && places.selectedPlace && (places.travelTime || travelTime) && (
          <View style={styles.cardOverlayContainer}>
            <ExploreCard
              placeName={places.selectedPlace.name}
              travelTime={places.travelTime || travelTime}
              onStartJourney={onStartJourney}
              visible={showCard}
              rating={
                places.selectedPlace.rating != undefined
                  ? places.selectedPlace.rating
                  : "No Ratings"
              }
              travelMode={places.travelMode}
              placeDescription={places.selectedPlace.description}
              placeImage={
                places.selectedPlace.photos && places.selectedPlace.photos.length > 0
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${places.selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                  : undefined
              }
              onCancel={() =>
                handleCancel(
                  setConfirmEndJourney,
                  places.setSelectedPlace,
                  setRouteCoordinates,
                  setTravelTime,
                  setDistance,
                  setShowCard,
                  setJourneyStarted,
                  setShowArrow,
                  setShowDetailsCard
                )
              }
            />
          </View>
        )}

        {showDiscoveredCard && places.selectedPlace && (
          <DiscoveredCard
            onVisitAgain={onStartJourney}
            placeName={places.visitedPlaceDetails?.name || places.selectedPlace.name}
            placeDescription={
              places.visitedPlaceDetails?.description || "A place you've already discovered."
            }
            placeImage={
              places.selectedPlace.photos && places.selectedPlace.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${places.selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                : undefined
            }
            discoveryDate={places.visitedPlaceDetails?.visitedAt}
            rating={places.visitedPlaceDetails?.rating || places.selectedPlace.rating}
            description={places.visitedPlaceDetails?.description}
            onViewDetails={handleViewDiscoveredDetails}
            onDismiss={handleDismissDiscoveredCard}
            visible={showDiscoveredCard}
          />
        )}

        {journeyStarted &&
          places.selectedPlace &&
          places.travelTime &&
          places.distance &&
          showDetailsCard && (
            <DetailsCard
              placeName={places.selectedPlace.name}
              travelTime={places.travelTime}
              distance={places.distance}
              travelMode={places.travelMode}
              onSwipeOff={handleSwipeOff}
              currentStep={mapNavigation.currentStep}
              nextStepDistance={mapNavigation.nextStepDistance}
              navigationSteps={mapNavigation.navigationSteps}
              stepIndex={mapNavigation.stepIndex}
              autoShowUpcomingStep={true}
              soundEnabled={mapNavigation.soundEnabled}
              setSoundEnabled={mapNavigation.setSoundEnabled}
              getManeuverIcon={(maneuver) =>
                mapNavigation.getManeuverIcon(maneuver, MaterialIcon, FontAwesome)
              }
            />
          )}

        {showArrow && <CardToggleArrow onPress={handleArrowPress} />}

        {journeyStarted && !destinationReached && <EndJourneyButton onPress={handleEndJourney} />}

        {journeyStarted && destinationReached && places.selectedPlace && (
          <View style={styles.destinationCardContainer}>
            <DestinationCard
              discoveryDate={new Date().toISOString()}
              placeImage={
                places.selectedPlace.photos && places.selectedPlace.photos.length > 0
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${places.selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                  : undefined
              }
              placeName={places.selectedPlace.name}
              onLearnMorePress={handleLearnMore}
              onDismiss={handleDismissDestinationCard}
              visible={true}
            />
          </View>
        )}
      </View>
    );
  } catch (error) {
    console.error("Error rendering map view:", error);
    return <MapErrorFallback error={new Error("Failed to load the map")} onRetry={handleRetry} />;
  }
};

// Type guard for checking if place exists and isn't null
const placeExists = (place: Place | null | undefined): place is Place => {
  return place !== null && place !== undefined;
};

// Map component styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  destinationCardContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  cardOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  locationStatusContainer: {
    position: "absolute",
    top: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  locationStatusText: {
    color: "white",
    fontSize: 14,
  },
  networkStatusContainer: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    backgroundColor: "rgba(255,0,0,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  networkStatusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  placesInfoContainer: {
    position: "absolute",
    bottom: 20,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  placesInfoText: {
    color: "white",
    fontSize: 12,
  },
});

export default Map;

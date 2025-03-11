// Map.tsx - Updated with dynamic place updates and auto-detection for nearby places
import React, { useEffect, useState, useCallback, useRef } from "react";
import MapView, { PROVIDER_DEFAULT, Circle, Marker } from "react-native-maps";
import { View, StyleSheet, ActivityIndicator, Vibration, Alert } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { handleCancel } from "../../handlers/Map/mapHandlers";
import { handleDestinationReached } from "../../handlers/Map/visitedPlacesHandlers";
import { saveVisitedPlace } from "../../controllers/Map/visitedPlacesController"; // Add this import
import { Colors, NeutralColors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import { useNavigation } from "expo-router";

// Import custom hooks
import useMapLocation from "../../hooks/Map/useMapLocation";
import useMapCamera from "../../hooks/Map/useMapCamera";
import useMapPlaces from "../../hooks/Map/useMapPlaces";
import useMapNavigation from "../../hooks/Map/useMapNavigation";

// Import UI components
import { CardToggleArrow, EndJourneyButton, DirectionIndicator } from "./MapControls";
import { ViewModeToggle } from "./ViewModeToggle";
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
import { Place, Coordinate, NavigationStep } from "../../types/MapTypes";
import * as mapUtils from "../../utils/mapUtils";

const Map: React.FC = () => {
  // State for map functionality
  const [loading, setLoading] = useState<boolean>(true);
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [destinationReached, setDestinationReached] = useState<boolean>(false);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [showDetailsCard, setShowDetailsCard] = useState<boolean>(false);
  const [showArrow, setShowArrow] = useState<boolean>(false);
  const [showDiscoveredCard, setShowDiscoveredCard] = useState<boolean>(false);
  const [destinationSaved, setDestinationSaved] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<string>("follow"); // "follow" or "overview"

  // Route state variables
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);

  // Add a ref to track if destination save was attempted
  const destinationSaveAttemptedRef = useRef<boolean>(false);

  // Navigation hook
  const navigation = useNavigation();

  // Custom hooks
  const location = useMapLocation();
  const camera = useMapCamera();
  const places = useMapPlaces();
  const mapNavigation = useMapNavigation();

  /**
   * Initialize map on component mount
   */
  useEffect(() => {
    const initMap = async () => {
      try {
        console.log("Initializing map component...");
        setLoading(true);

        // Initialize location services with a callback for when we get the first location
        const locationInitialized = await location.initializeLocation((initialLocation) => {
          console.log("Initial location received in Map component:", initialLocation);

          // When initial location is received, fetch nearby places
          if (initialLocation) {
            places
              .refreshNearbyPlaces(initialLocation.latitude, initialLocation.longitude)
              .then((success) => {
                if (success) {
                  console.log("Successfully loaded initial places");
                } else {
                  console.warn("Failed to load initial places");
                }
                // Set loading to false regardless of places success
                setLoading(false);
              })
              .catch((error) => {
                console.error("Error loading initial places:", error);
                setLoading(false);
              });
          }
        });

        if (!locationInitialized) {
          console.warn("Location could not be initialized");
          setLoading(false);
          return;
        }

        // If we don't get a location callback within 10 seconds, stop loading anyway
        setTimeout(() => {
          if (loading) {
            console.warn("Location timeout - forcing load completion");
            setLoading(false);
          }
        }, 10000);
      } catch (error) {
        console.error("Error initializing map:", error);
        setLoading(false);
      }
    };

    initMap();
  }, []);

  /**
   * Update user heading and check for destination when location changes
   */
  useEffect(() => {
    if (!location.userLocation) return;

    // Update user heading based on movement
    const headingUpdated = location.updateHeadingFromMovement(location.userLocation);

    // If heading was updated and we're in follow mode, update the camera
    if (headingUpdated && viewMode === "follow" && journeyStarted) {
      camera.updateUserCamera(location.userLocation, location.userHeading, false, viewMode);
    }

    // Check for nearby places that might need refreshing (dynamic updates based on movement)
    places.checkAndRefreshPlaces(location.userLocation);

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
        Vibration.vibrate([0, 200, 100, 200]);

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
  }, [location.userLocation]);

  // Add a separate effect to ensure place is saved when destination is reached
  useEffect(() => {
    // If destination is reached but not saved yet, try again
    if (
      destinationReached &&
      places.selectedPlace &&
      !destinationSaved &&
      !destinationSaveAttemptedRef.current
    ) {
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
    }
  }, [destinationReached, places.selectedPlace, destinationSaved]);

  /**
   * Setup initial route overview when journey starts
   */
  useEffect(() => {
    if (journeyStarted && places.selectedPlace && location.userLocation) {
      // Reset destination saved state
      setDestinationSaved(false);

      // Set view mode to follow by default
      setViewMode("follow");

      // Setup initial route view if route is loaded
      camera.setupInitialRouteView(
        location.userLocation,
        places.destinationCoordinateRef.current,
        setViewMode,
        location.userHeading
      );
    }
  }, [journeyStarted, places.selectedPlace, location.userLocation]);

  /**
   * Handle starting a journey
   */
  const onStartJourney = async () => {
    setShowCard(false);
    setShowDiscoveredCard(false);
    setJourneyStarted(true);
    setShowDetailsCard(true);
    setDestinationReached(false);
    setDestinationSaved(false);
    setViewMode("follow");
    destinationSaveAttemptedRef.current = false;

    // Reset tracking state
    location.resetLocationTracking();
    camera.resetCameraState();

    // Reset navigation state
    mapNavigation.resetNavigation();
  };

  /**
   * Toggle between follow and overview camera modes
   */
  const handleToggleViewMode = () => {
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
        if (location.userLocation && location.userHeading !== null) {
          camera.updateUserCamera(location.userLocation, location.userHeading, true, "follow");
        }
      }, 300);
    }
  };

  /**
   * Handle place selection with auto-detection for proximity
   */
  const handlePlaceSelection = async (place: Place) => {
    const result = await places.handlePlaceSelection(place, location.userLocation, location.region);

    if (result) {
      // Check if the user is already at this place - use 20 meters threshold
      if (result.isAlreadyAt) {
        console.log(`User is already at ${place.name}, showing destination reached directly`);

        // Skip the journey start UI flow and go directly to destination reached
        setDestinationReached(true);
        destinationSaveAttemptedRef.current = false; // FIXED LINE
        setShowDiscoveredCard(false);
        setShowCard(false);
        setJourneyStarted(true); // Set this to true for UI state to work properly

        // Mark place as visited - ensure this happens with multiple methods
        if (places.selectedPlace) {
          console.log(`Direct destination reached: Saving ${places.selectedPlace.name}`);

          // Call handler
          handleDestinationReached(places.selectedPlace);

          // Also try direct save
          saveVisitedPlace({
            ...places.selectedPlace,
            isVisited: true,
            visitedAt: new Date().toISOString(),
          })
            .then((success) => {
              console.log(`Already at location save result: ${success ? "Success" : "Failed"}`);
              if (success) {
                setDestinationSaved(true);
              }
            })
            .catch((err) => console.error("Error during save at current location:", err));
        }

        // Vibrate to alert user
        Vibration.vibrate([0, 200, 100, 200]);

        // Announce destination reached
        mapNavigation.announceDestinationReached();
      }
      // Otherwise show normal UI flow
      else if (result.isDiscovered) {
        setShowDiscoveredCard(true);
      } else {
        setShowCard(true);
      }
    }
  };

  /**
   * Handle learn more action from destination card
   */
  const handleLearnMore = () => {
    // AI logic would go here
  };

  /**
   * Handle dismissal of destination card
   */
  const handleDismissDestinationCard = () => {
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

    // Reset refs and state
    places.destinationCoordinateRef.current = null;
    camera.initialRouteLoadedRef.current = false;
    location.resetLocationTracking();
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
   */
  const handleViewDiscoveredDetails = () => {
    setShowDiscoveredCard(false);
    // Navigate to a detailed view
    console.log("View details for:", places.selectedPlace?.name);
  };

  // Show loading indicator while initializing
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Only display the selected place marker if journey is started
  const markersToDisplay =
    journeyStarted && places.selectedPlace ? [places.selectedPlace] : places.places;

  return (
    <View style={styles.container}>
      <MapView
        ref={camera.mapRef}
        style={styles.map}
        initialRegion={location.region || undefined}
        customMapStyle={customMapStyle}
        showsPointsOfInterest={false}
        provider={PROVIDER_DEFAULT}
        followsUserLocation={false}
        rotateEnabled={true}
        pitchEnabled={true}
        onUserLocationChange={(event) => {
          // Throttle location updates
          location.locationUpdateCounterRef.current =
            (location.locationUpdateCounterRef.current + 1) % LOCATION_UPDATE_THROTTLE;
          if (location.locationUpdateCounterRef.current !== 0) return;

          const { coordinate } = event.nativeEvent;
          if (coordinate) {
            // Update user location state
            const locationUpdate = {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
              latitudeDelta: location.region?.latitudeDelta || 0.01,
              longitudeDelta: location.region?.longitudeDelta || 0.01,
            };

            location.setUserLocation(locationUpdate);
          }
        }}
      >
        {location.userLocation && location.userHeading !== null && (
          <Marker
            coordinate={location.userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={location.userHeading}
            flat={true}
            zIndex={1000}
          >
            <DirectionIndicator />
          </Marker>
        )}
        {/* Display radius circle around user location */}
        {location.userLocation && (
          <Circle
            center={location.userLocation}
            radius={places.circleRadius}
            strokeColor={Colors.primary}
            strokeWidth={2}
            fillColor={`${Colors.primary}10`}
          />
        )}

        {/* User direction indicator */}
        {journeyStarted && location.userLocation && location.userHeading !== null && (
          <Marker
            coordinate={location.userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={location.userHeading}
            flat={true}
          >
            <DirectionIndicator />
          </Marker>
        )}

        {/* Place markers */}
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
              if (result.distance && result.duration) {
                // Update route info when route is ready
                const newTravelTime = `${parseFloat(result.duration.toString()).toFixed(1)} min`;
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
                if (
                  journeyStarted &&
                  !camera.initialRouteLoadedRef.current &&
                  location.userLocation
                ) {
                  camera.setupInitialRouteView(
                    location.userLocation,
                    places.destinationCoordinateRef.current,
                    setViewMode,
                    location.userHeading
                  );
                }
              }
            }}
            onError={(errorMessage) => {
              console.error("MapViewDirections error:", errorMessage);
            }}
          />
        )}
      </MapView>

      {/* View mode toggle button */}
      {journeyStarted && <ViewModeToggle viewMode={viewMode} onToggle={handleToggleViewMode} />}

      {/* Cards and UI elements */}
      {showCard && places.selectedPlace && places.travelTime && (
        <View style={styles.cardOverlayContainer}>
          <ExploreCard
            placeName={places.selectedPlace.name}
            travelTime={places.travelTime}
            onStartJourney={onStartJourney}
            visible={showCard}
            rating={
              places.selectedPlace.rating != undefined ? places.selectedPlace.rating : "No Ratings"
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
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
});

export default Map;

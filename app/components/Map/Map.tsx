import React, { useEffect, useState, useRef, useCallback } from "react";
import MapView, {
  PROVIDER_GOOGLE,
  Circle,
  Marker,
  Camera,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import FeatherIcon from "react-native-vector-icons/Feather";
import {
  handleMarkerPress,
  handleStartJourney,
  handleCancel,
} from "../../handlers/Map/mapHandlers";
import {
  requestLocationPermission,
  watchUserLocation,
} from "../../controllers/Map/locationController";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
import { Region, Place } from "../../types/MapTypes";
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import { Colors, NeutralColors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import { haversineDistance } from "../../utils/mapUtils";
import DestinationCard from "./DestinationCard";
import { useNavigation } from "expo-router";

const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";
const DESTINATION_REACHED_THRESHOLD = 30; // 20 meters
const MARKER_REFRESH_THRESHOLD = 10000; // milliseconds (10 seconds) minimum between refreshes
const DEFAULT_CIRCLE_RADIUS = 500; // Default circle radius in meters if no places found

export default function Map() {
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [showDetailsCard, setShowDetailsCard] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [locationWatcherCleanup, setLocationWatcherCleanup] = useState<(() => void) | null>(null);
  const [destinationReached, setDestinationReached] = useState<boolean>(false);
  const [showArrow, setShowArrow] = useState<boolean>(false);
  const [lastRefreshPosition, setLastRefreshPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [isRefreshingPlaces, setIsRefreshingPlaces] = useState<boolean>(false);
  const [circleRadius, setCircleRadius] = useState<number>(DEFAULT_CIRCLE_RADIUS);
  const [initialLoadingComplete, setInitialLoadingComplete] = useState<boolean>(false);
  const navigation = useNavigation();

  const [previousPosition, setPreviousPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView>(null);

  // Initialize map with user location and nearby places
  const initializeMap = async () => {
    try {
      // Request location permission
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          "Location Permission Required",
          "We need your location to show you nearby attractions."
        );
        setLoading(false);
        return;
      }

      // Get current location
      const locationWatcher = await watchUserLocation(
        (locationUpdate) => {
          if (!region) {
            // First time setting the region
            setRegion(locationUpdate);
            setUserLocation(locationUpdate);

            // Fetch places once we have the initial location
            refreshNearbyPlaces(locationUpdate.latitude, locationUpdate.longitude);
          } else {
            // Just update the user location, not the map region
            setUserLocation(locationUpdate);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          Alert.alert("Location Error", "Could not get your current location.");
          setLoading(false);
        }
      );

      // Set cleanup function
      setLocationWatcherCleanup(() => locationWatcher);
    } catch (error) {
      console.error("Error initializing map:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeMap();

    // Cleanup function
    return () => {
      if (locationWatcherCleanup) {
        locationWatcherCleanup();
      }
    };
  }, []);

  // Function to refresh nearby places
  const refreshNearbyPlaces = useCallback(
    async (latitude: number, longitude: number) => {
      if (isRefreshingPlaces) return;

      try {
        setIsRefreshingPlaces(true);

        // Get places using the updated controller that returns places and furthestDistance
        const { places: newPlaces, furthestDistance } = await fetchNearbyPlaces(
          latitude,
          longitude
        );

        // Set the circle radius based on the furthest place
        setCircleRadius(furthestDistance);

        if (newPlaces && newPlaces.length > 0) {
          // Keep selected place in the list if it exists
          if (selectedPlace) {
            const selectedPlaceExists = newPlaces.some(
              (place) => place.place_id === selectedPlace.place_id
            );

            if (!selectedPlaceExists) {
              // If the selected place isn't in the new list, add it
              setPlaces([...newPlaces, selectedPlace]);
            } else {
              setPlaces(newPlaces);
            }
          } else {
            setPlaces(newPlaces);
          }
        } else if (newPlaces && newPlaces.length === 0) {
          // If no places found, keep selected place if it exists
          if (selectedPlace) {
            setPlaces([selectedPlace]);
          } else {
            setPlaces([]);
          }
        }

        setLastRefreshPosition({ latitude, longitude });
        setLastRefreshTime(Date.now());
        setLoading(false);

        // Mark initial loading as complete
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }
      } catch (error) {
        console.error("Error refreshing nearby places:", error);
        setLoading(false);

        // Still mark initial loading as complete even if there was an error
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }
      } finally {
        setIsRefreshingPlaces(false);
      }
    },
    [selectedPlace, isRefreshingPlaces, initialLoadingComplete]
  );

  // Calculate heading based on current and previous positions
  const calculateHeading = (
    prevLat: number,
    prevLng: number,
    currentLat: number,
    currentLng: number
  ): number => {
    // Convert to radians
    const startLat = (prevLat * Math.PI) / 180;
    const startLng = (prevLng * Math.PI) / 180;
    const destLat = (currentLat * Math.PI) / 180;
    const destLng = (currentLng * Math.PI) / 180;

    // Calculate heading
    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x =
      Math.cos(startLat) * Math.sin(destLat) -
      Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    return bearing;
  };

  // Update map camera to follow user with correct orientation
  const updateMapCamera = (location: Region, heading: number | null) => {
    if (!mapRef.current || !journeyStarted) return;

    const camera: Camera = {
      center: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      pitch: 45, // Add some tilt for better navigation view
      heading: heading || 0, // Use the calculated heading or default to north
      altitude: 2000, // Adjust for desired zoom level
      zoom: 17, // Close enough to see streets clearly
    };

    mapRef.current.animateCamera(camera, { duration: 1000 });
  };

  // Check if we should refresh places based on user movement
  const checkAndRefreshPlaces = useCallback(
    (newLocation: Region) => {
      // Don't try to refresh if initial loading isn't complete or if lastRefreshPosition isn't set
      if (!initialLoadingComplete || !lastRefreshPosition) return;

      const currentTime = Date.now();
      const timeSinceLastRefresh = currentTime - lastRefreshTime;

      // Only refresh if enough time has passed since the last refresh
      if (timeSinceLastRefresh < MARKER_REFRESH_THRESHOLD) return;

      const distance = haversineDistance(
        lastRefreshPosition.latitude,
        lastRefreshPosition.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // If user has moved more than 50% of the circle radius, refresh places
      if (distance > circleRadius * 0.5) {
        refreshNearbyPlaces(newLocation.latitude, newLocation.longitude);
      }
    },
    [
      lastRefreshPosition,
      lastRefreshTime,
      circleRadius,
      refreshNearbyPlaces,
      initialLoadingComplete,
    ]
  );

  // Setup detailed location tracking when journey starts
  useEffect(() => {
    if (journeyStarted && selectedPlace) {
      // Reset previous position and heading
      setPreviousPosition(null);
      setUserHeading(null);

      // Initial map camera update without heading (will point north)
      if (mapRef.current && userLocation) {
        const initialCamera: Camera = {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          pitch: 45,
          heading: 0,
          altitude: 100,
          zoom: 30,
        };

        mapRef.current.animateCamera(initialCamera, { duration: 500 });
      }
    }
  }, [journeyStarted]);

  // Update heading and refresh places based on movement
  useEffect(() => {
    if (!userLocation || !previousPosition) return;

    // Calculate heading if we have a previous position
    const heading = calculateHeading(
      previousPosition.latitude,
      previousPosition.longitude,
      userLocation.latitude,
      userLocation.longitude
    );

    // Only update heading if there's significant movement (to avoid jitter)
    const distance = haversineDistance(
      previousPosition.latitude,
      previousPosition.longitude,
      userLocation.latitude,
      userLocation.longitude
    );

    if (distance > 2) {
      // Only update heading if moved more than 2 meters
      setUserHeading(heading);
      if (journeyStarted) {
        updateMapCamera(userLocation, heading);
      }
      setPreviousPosition({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      // Check if we should refresh places (when not in journey mode)
      if (!journeyStarted) {
        checkAndRefreshPlaces(userLocation);
      }
    }
  }, [userLocation, previousPosition, journeyStarted]);

  // Separate useEffect specifically for checking if destination reached
  useEffect(() => {
    // Only run this effect when we have all needed data and journey is active
    if (!userLocation || !selectedPlace || !journeyStarted) return;

    // Skip the check if destination already reached
    if (destinationReached) return;

    // Check if destination has been reached
    const distanceToDestination = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      selectedPlace.geometry.location.lat,
      selectedPlace.geometry.location.lng
    );

    console.log(
      `Distance to destination: ${distanceToDestination}m (threshold: ${DESTINATION_REACHED_THRESHOLD}m)`
    );

    if (distanceToDestination <= DESTINATION_REACHED_THRESHOLD) {
      console.log("Destination reached!");
      setDestinationReached(true);
      setShowDetailsCard(false);
      setShowArrow(false);
    }
  }, [userLocation, selectedPlace, journeyStarted, destinationReached]);

  const onStartJourney = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      setShowCard(false);
      setJourneyStarted(true);
      setShowDetailsCard(true);
      setDestinationReached(false);
    } else {
      Alert.alert(
        "Location Permission Required",
        "We need location permission to guide you to your destination."
      );
    }
  };

  // Handle learn more action from destination card
  const handleLearnMore = () => {
    if (selectedPlace) {
      // Logic with AI
    }
  };

  // Handle dismissal of destination card
  const handleDismissDestinationCard = () => {
    setDestinationReached(false);
    handleCancel(
      setConfirmEndJourney,
      setSelectedPlace,
      setRouteCoordinates,
      setTravelTime,
      setDistance,
      setShowArrow,
      setShowDetailsCard,
      setShowCard,
      setJourneyStarted
    );
    setPreviousPosition(null);
    setUserHeading(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleSwipeOff = () => {
    setShowDetailsCard(false);
    setShowArrow(true);
  };

  const handleArrowPress = () => {
    setShowArrow(false);
    setShowDetailsCard(true);
  };

  // Only display the selected place marker if journey is started
  const markersToDisplay = journeyStarted && selectedPlace ? [selectedPlace] : places;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region || undefined}
        customMapStyle={customMapStyle}
        showsPointsOfInterest={false}
        showsUserLocation
        provider={PROVIDER_DEFAULT}
        followsUserLocation={journeyStarted}
        rotateEnabled={true}
        pitchEnabled={true}
        onUserLocationChange={(event) => {
          const { coordinate } = event.nativeEvent;
          if (coordinate) {
            // Update user location
            const locationUpdate = {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
              latitudeDelta: region?.latitudeDelta || 0.01,
              longitudeDelta: region?.longitudeDelta || 0.01,
            };

            setUserLocation(locationUpdate);

            // Initialize previous position if not set
            if (!previousPosition) {
              setPreviousPosition({
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
              });
            }
          }
        }}
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={circleRadius}
            strokeColor={Colors.primary}
            strokeWidth={2}
            fillColor={`${Colors.primary}10`}
          />
        )}

        {markersToDisplay.map((place) => (
          <Marker
            key={place.place_id}
            coordinate={{
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            }}
            pinColor={
              selectedPlace?.place_id === place.place_id ? Colors.secondary : Colors.primary
            }
            onPress={() =>
              !journeyStarted &&
              handleMarkerPress(
                place,
                userLocation || region,
                setSelectedPlace,
                setRouteCoordinates,
                setTravelTime,
                setShowCard
              )
            }
          />
        ))}

        {routeCoordinates.length > 0 && journeyStarted && (
          <MapViewDirections
            origin={userLocation || region}
            mode="WALKING"
            destination={{
              latitude: selectedPlace?.geometry.location.lat || 0,
              longitude: selectedPlace?.geometry.location.lng || 0,
            }}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={8}
            strokeColor={Colors.primary}
            optimizeWaypoints={true}
            onReady={(result) => {
              if (result.distance && result.duration) {
                setTravelTime(`${parseFloat(result.duration.toString()).toFixed(1)} min`);
                setDistance(`${parseFloat(result.distance.toString()).toFixed(1)} km`);
              }
            }}
            onError={(errorMessage) => {
              console.log(errorMessage);
            }}
          />
        )}
      </MapView>

      {showCard && selectedPlace && travelTime && (
        <ExploreCard
          placeName={selectedPlace.name}
          travelTime={travelTime}
          onStartJourney={onStartJourney}
          placeDescription={selectedPlace.description}
          placeImage={
            selectedPlace.photos && selectedPlace.photos.length > 0
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
              : undefined
          }
          onCancel={() =>
            handleCancel(
              setConfirmEndJourney,
              setSelectedPlace,
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
      )}

      {journeyStarted && selectedPlace && travelTime && distance && showDetailsCard && (
        <DetailsCard
          placeName={selectedPlace.name}
          travelTime={travelTime}
          distance={distance}
          onSwipeOff={handleSwipeOff}
        />
      )}

      {showArrow && (
        <TouchableOpacity style={styles.arrowContainer} onPress={handleArrowPress}>
          <FeatherIcon name={"more-horizontal"} size={22} color={NeutralColors.black}></FeatherIcon>
        </TouchableOpacity>
      )}

      {journeyStarted && !destinationReached && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              handleCancel(
                setConfirmEndJourney,
                setSelectedPlace,
                setRouteCoordinates,
                setTravelTime,
                setDistance,
                setShowCard,
                setShowDetailsCard,
                setShowArrow,
                setJourneyStarted
              )
            }
          >
            <Text style={styles.cancelButtonText}>End Journey</Text>
          </TouchableOpacity>
        </View>
      )}

      {destinationReached && selectedPlace && (
        <View style={styles.destinationCardContainer}>
          <DestinationCard
            discoveryDate={new Date().toISOString()}
            placeImage={
              selectedPlace.photos && selectedPlace.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                : undefined
            }
            placeName={selectedPlace.name}
            onLearnMorePress={handleLearnMore}
            onDismiss={handleDismissDestinationCard}
          />
        </View>
      )}
    </View>
  );
}

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
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: "50%",
    backgroundColor: Colors.danger,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  arrowContainer: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: NeutralColors.white,
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
});

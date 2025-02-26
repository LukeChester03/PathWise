import React, { useEffect, useState, useRef } from "react";
import MapView, { PROVIDER_GOOGLE, Circle, Marker, Camera } from "react-native-maps";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import { initializeMap } from "../../controllers/Map/mapController";
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
import { Region, Place } from "../../types/MapTypes";
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import { Colors, NeutralColors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import { haversineDistance } from "../../utils/mapUtils";

const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";
const DESTINATION_REACHED_THRESHOLD = 10; // 10 meters

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

  const [previousPosition, setPreviousPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const init = async () => {
      const mapData = await initializeMap();
      if (mapData) {
        setRegion(mapData.region);
        setUserLocation(mapData.region);
        setPlaces(mapData.places);
        setLoading(false);
      }
    };
    init();
  }, []);

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
      altitude: 500, // Adjust for desired zoom level
      zoom: 17, // Close enough to see streets clearly
    };

    mapRef.current.animateCamera(camera, { duration: 1000 });
  };

  // Setup location watcher when journey starts
  useEffect(() => {
    let cleanupFunction: (() => void) | null = null;

    const startLocationTracking = async () => {
      if (journeyStarted && selectedPlace && !locationWatcherCleanup) {
        // Get high accuracy location updates
        cleanupFunction = await watchUserLocation(
          (newLocation) => {
            setUserLocation(newLocation);

            // Calculate heading if we have a previous position
            if (previousPosition) {
              const heading = calculateHeading(
                previousPosition.latitude,
                previousPosition.longitude,
                newLocation.latitude,
                newLocation.longitude
              );

              // Only update heading if there's significant movement (to avoid jitter)
              const distance = haversineDistance(
                previousPosition.latitude,
                previousPosition.longitude,
                newLocation.latitude,
                newLocation.longitude
              );

              if (distance > 2) {
                // Only update heading if moved more than 2 meters
                setUserHeading(heading);
                updateMapCamera(newLocation, heading);
                setPreviousPosition({
                  latitude: newLocation.latitude,
                  longitude: newLocation.longitude,
                });
              }
            } else {
              // First position update
              setPreviousPosition({
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
              });
              updateMapCamera(newLocation, userHeading);
            }

            // Check if user has reached destination
            if (selectedPlace && !destinationReached) {
              const distanceToDestination = haversineDistance(
                newLocation.latitude,
                newLocation.longitude,
                selectedPlace.geometry.location.lat,
                selectedPlace.geometry.location.lng
              );

              if (distanceToDestination <= DESTINATION_REACHED_THRESHOLD) {
                setDestinationReached(true);
                Alert.alert("Destination Reached!", `You have arrived at ${selectedPlace.name}!`, [
                  {
                    text: "OK",
                    onPress: () => {
                      // End the journey
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
                      setDestinationReached(false);
                      setPreviousPosition(null);
                      setUserHeading(null);
                      setShowArrow(false);
                      setShowDetailsCard(false);

                      // Clean up location watcher
                      if (cleanupFunction) {
                        cleanupFunction();
                        setLocationWatcherCleanup(null);
                      }
                    },
                  },
                ]);
              }
            }
          },
          (error) => {
            console.error("Error watching location:", error);
            Alert.alert("Location Error", "Failed to track your location.");
          }
        );

        setLocationWatcherCleanup(() => cleanupFunction);
      }
    };

    if (journeyStarted && selectedPlace) {
      startLocationTracking();
    }

    return () => {
      if (locationWatcherCleanup) {
        locationWatcherCleanup();
        setLocationWatcherCleanup(null);
      }
    };
  }, [journeyStarted, selectedPlace]);

  // Clean up location watcher when journey ends
  useEffect(() => {
    if (!journeyStarted && locationWatcherCleanup) {
      locationWatcherCleanup();
      setLocationWatcherCleanup(null);
      setPreviousPosition(null);
      setUserHeading(null);
    }
  }, [journeyStarted]);

  const onStartJourney = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      setShowCard(false);
      setJourneyStarted(true);
      setShowDetailsCard(true);
      setDestinationReached(false);

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
    } else {
      Alert.alert(
        "Location Permission Required",
        "We need location permission to guide you to your destination."
      );
    }
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
        provider={PROVIDER_GOOGLE}
        followsUserLocation={journeyStarted}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        <Circle center={userLocation || region} radius={250} strokeColor={Colors.primary} />
        {markersToDisplay.map((place) => (
          <Marker
            key={place.place_id}
            coordinate={{
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            }}
            title={place.name}
            description={place.description}
            pinColor={Colors.primary}
            onPress={() =>
              !journeyStarted &&
              handleMarkerPress(
                place,
                region,
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
          onArrowPress={handleArrowPress}
        />
      )}
      {showArrow && (
        <TouchableOpacity style={styles.arrowContainer} onPress={handleArrowPress}>
          <FeatherIcon name={"more-horizontal"} size={22} color={NeutralColors.white}></FeatherIcon>
        </TouchableOpacity>
      )}
      {journeyStarted && (
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
    backgroundColor: Colors.primary,
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
});

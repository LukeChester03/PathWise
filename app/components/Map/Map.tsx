import React, { useEffect, useState } from "react";
import MapView, { PROVIDER_GOOGLE, Circle, Marker } from "react-native-maps";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { getCurrentLocation } from "../../controllers/Map/locationController";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
import { fetchRoute } from "../../controllers/Map/routesController";
import { Region, Place } from "../../types/MapTypes";
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import { Colors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";

const PLACEHOLDER_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";

// Haversine formula to calculate distance between two coordinates
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Distance in meters
};

export default function Map() {
  const [region, setRegion] = useState<Region>(PLACEHOLDER_REGION);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Region | null>(null);

  // Request location permissions
  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  };

  useEffect(() => {
    (async () => {
      const newRegion = await getCurrentLocation();
      if (newRegion) {
        setRegion(newRegion);
        setUserLocation(newRegion);
        const nearbyPlaces = await fetchNearbyPlaces(newRegion.latitude, newRegion.longitude);
        setPlaces(nearbyPlaces);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (journeyStarted && selectedPlace) {
      let subscription: Location.LocationSubscription | null = null;

      const startTracking = async () => {
        const hasPermission = await requestLocationPermission();
        if (hasPermission) {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10, // Update every 10 meters
              timeInterval: 1000, // Update every 1 second
            },
            (location) => {
              const { latitude, longitude } = location.coords;
              const newUserLocation = {
                latitude,
                longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              };
              setUserLocation(newUserLocation);

              // Calculate distance to destination
              const destinationLat = selectedPlace.geometry.location.lat;
              const destinationLng = selectedPlace.geometry.location.lng;
              const distanceToDestination = haversineDistance(
                latitude,
                longitude,
                destinationLat,
                destinationLng
              );

              // Check if user is within 10 meters of the destination
              if (distanceToDestination <= 10) {
                Alert.alert("Destination Reached", "You have arrived at your destination!", [
                  {
                    text: "OK",
                    onPress: () => handleCancel(),
                  },
                ]);
              } else {
                updateRoute(newUserLocation);
              }
            }
          );
        } else {
          Alert.alert(
            "Permission Denied",
            "Location permission is required to track your journey."
          );
        }
      };

      startTracking();

      return () => {
        if (subscription) {
          subscription.remove(); // Stop tracking when component unmounts
        }
      };
    }
  }, [journeyStarted, selectedPlace]);

  const updateRoute = async (newUserLocation: Region) => {
    if (selectedPlace) {
      const origin = `${newUserLocation.latitude},${newUserLocation.longitude}`;
      const destination = `${selectedPlace.geometry.location.lat},${selectedPlace.geometry.location.lng}`;
      const route = await fetchRoute(origin, destination);
      if (route && route.duration && route.distance !== undefined) {
        const duration = parseFloat(route.duration).toFixed(1);
        setRouteCoordinates(route.coords);
        setTravelTime(`${duration} mins`);
        setDistance(`${route.distance.toFixed(1)} km`);
      }
    }
  };

  const handleMarkerPress = async (place: Place) => {
    setSelectedPlace(place);
    console.log(selectedPlace.geometry, "Selected place");
    if (region) {
      const origin = `${region.latitude},${region.longitude}`;
      const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;
      const route = await fetchRoute(origin, destination);
      if (route && route.duration && route.distance !== undefined) {
        const duration = parseFloat(route.duration).toFixed(1);
        setShowCard(true);
        setRouteCoordinates(route.coords);
        setTravelTime(`${duration} mins`);
        setDistance(`${route.distance.toFixed(1)} km`);
      }
    }
  };

  const handleStartJourney = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      setShowCard(false);
      setJourneyStarted(true);
    } else {
      Alert.alert("Permission Denied", "Location permission is required to start the journey.");
    }
  };

  const handleCancel = () => {
    setConfirmEndJourney(true);
    setSelectedPlace(null);
    setRouteCoordinates([]);
    setTravelTime(null);
    setDistance(null);
    setShowCard(false);
    setJourneyStarted(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Determine which places to show as markers
  const markersToDisplay =
    journeyStarted && selectedPlace
      ? [selectedPlace] // Only show the selected place when journey is started
      : places; // Show all places otherwise

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        region={userLocation || region} // Update map region to user's current location
        customMapStyle={customMapStyle}
        showsPointsOfInterest={false}
        showsUserLocation
        showsMyLocationButton
        provider={PROVIDER_GOOGLE}
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
            onPress={() => !journeyStarted && handleMarkerPress(place)}
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
                // Convert numeric values to strings with formatting
                const durationStr = `${parseFloat(result.duration.toString()).toFixed(1)} min`;
                const distanceStr = `${parseFloat(result.distance.toString()).toFixed(1)} km`;
                setTravelTime(durationStr);
                setDistance(distanceStr);
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
          onStartJourney={handleStartJourney}
          onCancel={handleCancel}
        />
      )}
      {journeyStarted && selectedPlace && travelTime && distance && (
        <DetailsCard placeName={selectedPlace.name} travelTime={travelTime} distance={distance} />
      )}
      {journeyStarted && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
  marker: {
    height: 50,
    width: 50,
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
});

import React, { useEffect, useState } from "react";
import MapView, {
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  Circle,
  Marker,
  Polyline,
} from "react-native-maps";
import {
  Platform,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Image,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from "react-native";
import MapViewDirections from "react-native-maps-directions";
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

  useEffect(() => {
    (async () => {
      const newRegion = await getCurrentLocation();
      if (newRegion) {
        setRegion(newRegion);
        const nearbyPlaces = await fetchNearbyPlaces(newRegion.latitude, newRegion.longitude);
        setPlaces(nearbyPlaces);
        setLoading(false);
      }
    })();
  }, []);

  const handleMarkerPress = async (place: Place) => {
    setSelectedPlace(place);
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

  const handleStartJourney = () => {
    setShowCard(false);
    setJourneyStarted(true);
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
        region={region}
        customMapStyle={customMapStyle}
        showsPointsOfInterest={false}
        showsUserLocation
        showsMyLocationButton
        provider={PROVIDER_GOOGLE}
      >
        <Circle center={region} radius={250} strokeColor={Colors.primary} />
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
            origin={region}
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

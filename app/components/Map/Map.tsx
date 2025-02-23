// src/components/Map.tsx
import React, { useEffect, useState } from "react";
import MapView, {
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  Circle,
  Marker,
  Polyline,
} from "react-native-maps";
import { Platform, View, StyleSheet, TouchableWithoutFeedback, Image } from "react-native";
import { getCurrentLocation } from "../../controllers/Map/locationController";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
import { fetchRoute } from "../../controllers/Map/routesController";
import { Region, Place } from "../../types/MapTypes";
import ExploreCard from "./ExploreCard";
import { Colors } from "../../constants/colours";

export default function Map() {
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [showCard, setShowCard] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      const newRegion = await getCurrentLocation();
      if (newRegion) {
        setRegion(newRegion);
        const nearbyPlaces = await fetchNearbyPlaces(newRegion.latitude, newRegion.longitude);
        console.log("Fetched nearby places:", nearbyPlaces); // Log the fetched places
        setPlaces(nearbyPlaces);
      }
    })();
  }, []);

  useEffect(() => {
    if (region) {
      console.log("Region state updated:", region);
    }
  }, [region]);

  useEffect(() => {
    if (places.length > 0) {
      console.log("Places state updated:", places);
    }
  }, [places]);

  const handleMarkerPress = async (place: Place) => {
    setSelectedPlace(place);
    if (region) {
      const origin = `${region.latitude},${region.longitude}`;
      const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;
      const route = await fetchRoute(origin, destination);
      if (route) {
        setRouteCoordinates(route.coords);
        setTravelTime(route.duration);
        setShowCard(true);
      }
    }
  };

  const handleStartJourney = () => {
    setShowCard(false);
  };

  const handleCancel = () => {
    setSelectedPlace(null);
    setRouteCoordinates([]);
    setTravelTime(null);
    setShowCard(false);
  };

  if (!region) {
    return null; // or a loading indicator
  }

  return (
    <TouchableWithoutFeedback onPress={handleCancel}>
      <View style={styles.container}>
        <MapView
          style={styles.map}
          initialRegion={region}
          showsPointsOfInterest={false} // Hide other points of interest
          showsUserLocation
          showsMyLocationButton
          provider={PROVIDER_GOOGLE}
        >
          <Circle center={region} radius={500} strokeColor="rgba(158, 158, 255, 1.0)" />
          {places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              title={place.name}
              pinColor={Colors.primary}
              onPress={() => handleMarkerPress(place)}
            >
              <Image
                source={require("../../assets/Custom-Marker.png")}
                style={styles.marker}
              ></Image>
            </Marker>
          ))}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={Colors.primary} // Change the color of the route here
              strokeWidth={4}
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
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  marker: {
    height: 54,
    width: 54,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

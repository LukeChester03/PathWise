// src/components/Map.tsx
import React, { useEffect, useState } from "react";
import MapView, { PROVIDER_GOOGLE, Circle, Marker, Polyline } from "react-native-maps";
import { View, StyleSheet, TouchableWithoutFeedback, Image } from "react-native";
import { getCurrentLocation } from "../../controllers/Map/locationController";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
import ExploreCard from "./ExploreCard";
import { Colors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import {
  handleMarkerPress,
  handleStartJourney,
  handleCancel,
} from "../../handlers/Map/mapHandlers";
import { Region, Place } from "../../types/MapTypes";

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
        setPlaces(nearbyPlaces);
      }
    })();
  }, []);

  if (!region) {
    return null;
  }

  return (
    <TouchableWithoutFeedback
      onPress={() =>
        handleCancel(setSelectedPlace, setRouteCoordinates, setTravelTime, setShowCard)
      }
    >
      <View style={styles.container}>
        <MapView
          style={styles.map}
          initialRegion={region}
          showsPointsOfInterest={false}
          showsUserLocation
          showsMyLocationButton
          customMapStyle={customMapStyle}
          provider={PROVIDER_GOOGLE}
        >
          <Circle center={region} radius={250} strokeColor={Colors.primary} />
          {places.map((place) => (
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
                handleMarkerPress(
                  place,
                  region,
                  setSelectedPlace,
                  setRouteCoordinates,
                  setTravelTime,
                  setShowCard
                )
              }
            >
              <Image source={require("../../assets/Custom-Marker.png")} style={styles.marker} />
            </Marker>
          ))}
          {routeCoordinates.length > 0 && (
            <Polyline coordinates={routeCoordinates} strokeColor={Colors.primary} strokeWidth={4} />
          )}
        </MapView>
        {showCard && selectedPlace && travelTime && (
          <ExploreCard
            placeName={selectedPlace.name}
            travelTime={travelTime}
            onStartJourney={handleStartJourney}
            onCancel={() =>
              handleCancel(setSelectedPlace, setRouteCoordinates, setTravelTime, setShowCard)
            }
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
    height: 50,
    width: 50,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

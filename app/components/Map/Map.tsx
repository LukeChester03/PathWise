// src/components/Map.tsx
import React, { useEffect, useState } from "react";
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, Circle, Marker } from "react-native-maps";
import { Platform, View, StyleSheet, Alert, TouchableWithoutFeedback } from "react-native";
import { getCurrentLocation } from "../../controllers/Map/locationController";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
import { Region, Place } from "../../types/MapTypes";
import { Button } from "../Global/Button";
import { Colors } from "../../constants/colours";

export default function Map() {
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

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

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleDiscoverPress = () => {
    if (selectedPlace) {
      Alert.alert("Start Route", `Starting route to ${selectedPlace.name}`);
      // Implement the logic to start the route to the selected place
      // You can use a navigation library like react-navigation to navigate to a route screen
    }
  };

  const handleDeselectPlace = () => {
    setSelectedPlace(null);
  };

  if (!region) {
    return null; // or a loading indicator
  }

  return (
    <TouchableWithoutFeedback onPress={handleDeselectPlace}>
      <View style={styles.container}>
        <MapView
          style={styles.map}
          initialRegion={region}
          showsPointsOfInterest={false} // Hide other points of interest
          showsUserLocation
          showsMyLocationButton
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        >
          <Circle
            center={region}
            radius={500}
            strokeColor="rgba(158, 158, 255, 1.0)"
            fillColor="rgba(158, 158, 255, 0.3)"
          />
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
            />
          ))}
        </MapView>
        {selectedPlace && (
          <View style={styles.buttonContainer}>
            <Button title="Discover Location" onPress={handleDiscoverPress} style={styles.button} />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  button: {
    backgroundColor: Colors.primary,
  },
});

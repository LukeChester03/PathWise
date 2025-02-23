import React, { useEffect, useState } from "react";
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, Circle, Marker } from "react-native-maps";
import { Platform, StyleSheet, View, Alert } from "react-native";
import * as Location from "expo-location";
import { Colors } from "react-native/Libraries/NewAppScreen";

// Define the type for the region state
interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Define the type for the place data
interface Place {
  id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export default function Map() {
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        console.log("Fetched location:", { latitude, longitude });

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        };
        console.log("Setting region:", newRegion);
        setRegion(newRegion);

        // Fetch nearby tourist locations
        fetchNearbyPlaces(latitude, longitude);
      } catch (error: any) {
        console.error("Error getting location:", error);
        Alert.alert("Error getting location", error.message);
      }
    })();
  }, []);

  useEffect(() => {
    if (region) {
      console.log("Region state updated:", region);
    }
  }, [region]);

  const fetchNearbyPlaces = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=500&type=tourist_attraction&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
      );
      const data = await response.json();
      setPlaces(data.results);
    } catch (error: any) {
      console.error("Error fetching nearby places:", error);
      Alert.alert("Error fetching nearby places", error.message);
    }
  };

  if (!region) {
    return null; // or a loading indicator
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
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
          />
        ))}
      </MapView>
    </View>
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
});

// src/controllers/Map/locationController.ts
import * as Location from "expo-location";
import { Alert } from "react-native";
import { Region } from "../../types/MapTypes";

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.002,
  longitudeDelta: 0.002,
};

export const getCurrentLocation = async (): Promise<Region> => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission to access location was denied");
    return DEFAULT_REGION;
  }

  try {
    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    const region: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
    return region;
  } catch (error: any) {
    console.error("Error getting location:", error);
    Alert.alert("Error getting location", error.message);
    return DEFAULT_REGION;
  }
};

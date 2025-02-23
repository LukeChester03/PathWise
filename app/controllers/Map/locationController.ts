import * as Location from "expo-location";
import { Alert } from "react-native";
import { Region } from "../../types/MapTypes";

export const getCurrentLocation = async (): Promise<Region | null> => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission to access location was denied");
    return null;
  }

  try {
    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    console.log("Fetched location:", { latitude, longitude });

    const region: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
    console.log("Setting region:", region);
    return region;
  } catch (error: any) {
    console.error("Error getting location:", error);
    Alert.alert("Error getting location", error.message);
    return null;
  }
};

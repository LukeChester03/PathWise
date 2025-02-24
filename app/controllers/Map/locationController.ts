import * as Location from "expo-location";
import { Alert } from "react-native";
import { Region } from "../../types/MapTypes";

export const getCurrentLocation = async (): Promise<Region | null> => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  console.log(status, "STATUS");
  if (status !== "granted") {
    Alert.alert("Permission to access location was denied");
    return null;
  }

  try {
    console.log("STEP 1");
    let location = await Location.getCurrentPositionAsync({});
    console.log(location, "LOCATION");
    const { latitude, longitude } = location.coords;
    // console.log("Fetched location:", { latitude, longitude });
    console.log("HERERERE");
    const region: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
    console.log("Setting region:", region);
    return region;
  } catch (error: any) {
    console.log("HERE BAD NEWS");
    console.error("Error getting location:", error);
    Alert.alert("Error getting location", error.message);
    return null;
  }
};

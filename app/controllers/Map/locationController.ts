import * as Location from "expo-location";
import { Alert } from "react-native";
import { Region } from "../../types/MapTypes";

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.002,
  longitudeDelta: 0.002,
};

/**
 * Requests foreground location permissions.
 * @returns A Promise resolving to `true` if permission is granted, otherwise `false`.
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
};

/**
 * Requests foreground location permissions and fetches the current location.
 * @returns A Promise resolving to the user's current location as a `Region` object.
 *          Returns `null` if permission is denied or an error occurs.
 */
export const getCurrentLocation = async (): Promise<Region | null> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    Alert.alert("Permission to access location was denied");
    return null;
  }

  try {
    const location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    return {
      latitude,
      longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
  } catch (error: any) {
    console.error("Error getting location:", error);
    Alert.alert("Error getting location", error.message);
    return null;
  }
};

/**
 * Starts watching the user's location in real-time.
 * @param onLocationUpdate - Callback function to handle location updates.
 * @param onError - Callback function to handle errors.
 * @returns A cleanup function to stop watching the location.
 */
export const watchUserLocation = async (
  onLocationUpdate: (region: Region) => void,
  onError: (error: any) => void
): Promise<() => void> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    Alert.alert("Permission to access location was denied");
    return () => {};
  }

  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20,
        timeInterval: 1000,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        onLocationUpdate({
          latitude,
          longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        });
      }
    );

    // Return a cleanup function to stop watching the location
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  } catch (error: any) {
    console.error("Error watching location:", error);
    onError(error);
    return () => {}; // Return a no-op function if an error occurs
  }
};

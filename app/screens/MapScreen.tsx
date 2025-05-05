import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, Dimensions, TouchableOpacity, Alert } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import Map from "../components/Map/Map";
import MapErrorBoundary from "../components/Map/MapErrorBoundary";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { Colors } from "../constants/colours";
import MapGettingStartedModal from "../components/Map/MapGettingStartedModal";
import MapDistanceSettingsModal from "../components/Map/MapDistanceSettingsModal";
import { Ionicons } from "@expo/vector-icons";
import {
  updateMapSettings,
  getMapSettings,
  refreshMap,
} from "../controllers/Map/mapSettingsController";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Place } from "../types/MapTypes";
import NavigationService from "../services/Map/navigationService";
import {
  getCurrentLocation,
  updateNearbyPlaces,
  getLocationState,
  getNearbyPlacesState,
  checkAuthAndEnablePlacesLoading,
} from "../controllers/Map/locationController";
import NetInfo from "@react-native-community/netinfo";

const MapScreen = () => {
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDistanceSettingsModal, setShowDistanceSettingsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const initialSettings = getMapSettings();
  const [maxPlaces, setMaxPlaces] = useState(initialSettings.maxPlaces);
  const [searchRadius, setSearchRadius] = useState(initialSettings.searchRadius);
  const [refreshKey, setRefreshKey] = useState(0);

  const route = useRoute();
  const navigation = useNavigation();

  const [placeToShow, setPlaceToShow] = useState<Place | null>(null);

  const processingPlaceRef = useRef<boolean>(false);
  const initialDataLoadedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const appStateRef = useRef<string>("active");

  const handleMapRetry = useCallback(() => {
    if (!isMountedRef.current) return;

    const isLoggedIn = checkAuthAndEnablePlacesLoading();
    if (!isLoggedIn) {
      console.log("MapScreen: User not logged in, not retrying places load");
      setMapKey((prev) => prev + 1);
      return;
    }

    initialDataLoadedRef.current = false;

    setMapKey((prev) => prev + 1);

    setPlaceToShow(null);
    processingPlaceRef.current = false;

    getCurrentLocation().then((location) => {
      if (location && isMountedRef.current) {
        updateNearbyPlaces(location, true).then(() => {
          console.log("MapScreen: Map data reloaded after retry");
        });
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        try {
          if (!isMountedRef.current || appStateRef.current !== "active") {
            return;
          }

          const isLoggedIn = checkAuthAndEnablePlacesLoading();
          if (!isLoggedIn) {
            console.log("MapScreen: User not logged in, skipping places data load");
            setIsInitialized(true);
            return;
          }

          const placesState = getNearbyPlacesState();
          const locationState = getLocationState();

          if (placesState.places.length > 0 && locationState.userLocation) {
            console.log("MapScreen: Using existing places data, already loaded");
            setIsInitialized(true);
            initialDataLoadedRef.current = true;
            return;
          }

          if (!initialDataLoadedRef.current) {
            console.log("MapScreen: Loading initial map data...");
            setIsRefreshing(true);

            const netInfo = await NetInfo.fetch();
            console.log(`MapScreen: Network connected: ${netInfo.isConnected}`);

            const location = await getCurrentLocation();
            if (location) {
              console.log(`MapScreen: Got location: ${location.latitude}, ${location.longitude}`);

              const success = await updateNearbyPlaces(location, false);

              if (success) {
                console.log("MapScreen: Successfully loaded initial places data");
                initialDataLoadedRef.current = true;
              } else {
                console.warn("MapScreen: Failed to load initial places data");
              }
            } else {
              console.warn("MapScreen: Couldn't get current location");
            }

            setMapKey((prevKey) => prevKey + 1);
            setIsInitialized(true);
            setIsRefreshing(false);
          }
        } catch (error) {
          console.error("MapScreen: Error loading initial data:", error);
          setIsRefreshing(false);
        }
      };

      loadInitialData();

      return () => {};
    }, [])
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const checkForPlaceToShow = async () => {
      try {
        if (!isMountedRef.current) return;

        const placeFromRoute = NavigationService.getShowPlaceCardFromRoute(route);

        if (placeFromRoute && !processingPlaceRef.current) {
          console.log(`MapScreen: Received place to show: ${placeFromRoute.name}`);

          processingPlaceRef.current = true;

          setPlaceToShow(null);

          setTimeout(() => {
            if (isMountedRef.current) {
              setPlaceToShow(placeFromRoute);
              console.log(`MapScreen: Set place to show: ${placeFromRoute.name}`);
              setTimeout(() => {
                processingPlaceRef.current = false;
              }, 1000);
            }
          }, 100);
        }
      } catch (error) {
        console.error("MapScreen: Error checking for place to show:", error);
        processingPlaceRef.current = false;
      }
    };

    checkForPlaceToShow();
  }, [route]);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenHeight(Dimensions.get("window").height);
    };

    const subscription = Dimensions.addEventListener("change", updateDimensions);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleHelpModal = () => {
    setShowHelpModal(true);
  };

  const handleCloseModal = () => {
    setShowHelpModal(false);
  };

  const handleDistanceSettingsModal = () => {
    setShowDistanceSettingsModal(true);
  };

  const handleCloseSettingsModal = () => {
    setShowDistanceSettingsModal(false);
  };

  const handleSaveSettings = (newMaxPlaces: number, newSearchRadius: number): void => {
    if (!isMountedRef.current) return;
    setIsRefreshing(true);
    console.log(
      `Updating map settings: max places = ${newMaxPlaces}, radius = ${newSearchRadius}km`
    );

    try {
      updateMapSettings(newMaxPlaces, newSearchRadius);
      setMaxPlaces(newMaxPlaces);
      setSearchRadius(newSearchRadius);
      refreshMap()
        .then((success) => {
          if (!isMountedRef.current) return;

          if (success) {
            console.log("Map refreshed successfully with new settings");
          } else {
            console.warn("Failed to refresh map with new settings");
            Alert.alert(
              "Warning",
              "The map settings were updated but we couldn't refresh the places. Pull to refresh or restart the app to see the changes."
            );
          }
          setRefreshKey((prevKey) => prevKey + 1);
          setIsRefreshing(false);
          handleCloseSettingsModal();
        })
        .catch((error) => {
          if (!isMountedRef.current) return;

          console.error("Error refreshing map:", error);
          Alert.alert(
            "Error",
            "There was an error refreshing the map. Your settings have been saved and will apply next time you open the app."
          );
          setIsRefreshing(false);
          handleCloseSettingsModal();
        });
    } catch (error) {
      if (!isMountedRef.current) return;

      console.error("Error in handleSaveSettings:", error);
      Alert.alert("Error", "Failed to update settings. Please try again.");
      setIsRefreshing(false);
    }
  };

  const headerRightComponent = (
    <></>
    // Settings button removed - uncomment if needed
    // <TouchableOpacity
    //   style={styles.distanceSettingsButton}
    //   onPress={handleDistanceSettingsModal}
    //   disabled={isRefreshing}
    // >
    //   <View style={styles.distanceSettingsIconContainer}>
    //     <Ionicons
    //       name="settings-outline"
    //       size={20}
    //       color={isRefreshing ? Colors.primary + "80" : Colors.primary}
    //     />
    //     <View style={styles.distanceSettingsBadge} />
    //   </View>
    // </TouchableOpacity>
  );

  useEffect(() => {
    if (placeToShow) {
      console.log(`MapScreen: placeToShow updated: ${placeToShow.name}`);
    }
  }, [placeToShow]);

  const handlePlaceCardShown = useCallback(() => {
    if (!isMountedRef.current) return;

    console.log("MapScreen: Place card has been shown in Map component");
    setPlaceToShow(null);
  }, []);

  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <Header
          title="Discover"
          subtitle="Plot your journey to a new Place"
          showLogo={true}
          showIcon={true}
          iconName="map"
          rightComponent={headerRightComponent}
          iconColor={Colors.primary}
          onHelpPress={handleHelpModal}
          onBackPress={handleCloseModal}
          showHelp={true}
        />
        <View style={styles.mapContainer}>
          <MapErrorBoundary onRetry={handleMapRetry}>
            <Map
              key={`${refreshKey}-${mapKey}`}
              placeToShow={placeToShow}
              onPlaceCardShown={handlePlaceCardShown}
              isInitialized={isInitialized}
            />
          </MapErrorBoundary>
        </View>
      </View>

      <MapGettingStartedModal visible={showHelpModal} onClose={handleCloseModal} />

      <MapDistanceSettingsModal
        visible={showDistanceSettingsModal}
        onClose={handleCloseSettingsModal}
        initialMaxPlaces={maxPlaces}
        initialRadius={searchRadius}
        onSave={handleSaveSettings}
      />
    </ScreenWithNavBar>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  distanceSettingsButton: {
    padding: 8,
  },
  distanceSettingsIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  distanceSettingsBadge: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5252",
    top: 8,
    right: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
});

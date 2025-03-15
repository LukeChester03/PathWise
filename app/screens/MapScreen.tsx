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
import { useRoute, useNavigation } from "@react-navigation/native";
import { Place } from "../types/MapTypes";
import NavigationService from "../services/Map/navigationService";

const MapScreen = () => {
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDistanceSettingsModal, setShowDistanceSettingsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Map settings state - initialize from settings controller
  const initialSettings = getMapSettings();
  const [maxPlaces, setMaxPlaces] = useState(initialSettings.maxPlaces);
  const [searchRadius, setSearchRadius] = useState(initialSettings.searchRadius);
  const [refreshKey, setRefreshKey] = useState(0); // To force map refresh

  // Navigation and route
  const route = useRoute();
  const navigation = useNavigation();

  // State to store place from route params
  const [placeToShow, setPlaceToShow] = useState<Place | null>(null);

  // Use a ref to track if we're currently processing a place
  const processingPlaceRef = useRef<boolean>(false);

  // Check for place to show from route params
  useEffect(() => {
    const checkForPlaceToShow = async () => {
      try {
        // Get place from route params
        const placeFromRoute = NavigationService.getShowPlaceCardFromRoute(route);

        if (placeFromRoute && !processingPlaceRef.current) {
          console.log(`MapScreen: Received place to show: ${placeFromRoute.name}`);

          // Mark that we're processing a place
          processingPlaceRef.current = true;

          // Clear current place first to ensure state reset
          setPlaceToShow(null);

          // Use a slight delay to ensure clean state before setting new place
          setTimeout(() => {
            setPlaceToShow(placeFromRoute);
            console.log(`MapScreen: Set place to show: ${placeFromRoute.name}`);

            // Reset processing flag after a delay to prevent rapid re-processing
            setTimeout(() => {
              processingPlaceRef.current = false;
            }, 1000);
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

  const handleMapRetry = useCallback(() => {
    setMapKey((prev) => prev + 1);

    // Reset placeToShow on retry for a fresh state
    setPlaceToShow(null);
    processingPlaceRef.current = false;
  }, []);

  // Handle saving map settings and refreshing the map
  const handleSaveSettings = (newMaxPlaces: number, newSearchRadius: number): void => {
    // Show loading indicator
    setIsRefreshing(true);

    console.log(
      `Updating map settings: max places = ${newMaxPlaces}, radius = ${newSearchRadius}km`
    );

    try {
      // Update settings in controller
      updateMapSettings(newMaxPlaces, newSearchRadius);

      // Update local state
      setMaxPlaces(newMaxPlaces);
      setSearchRadius(newSearchRadius);

      // Force refresh the map
      refreshMap()
        .then((success) => {
          if (success) {
            console.log("Map refreshed successfully with new settings");
          } else {
            console.warn("Failed to refresh map with new settings");
            Alert.alert(
              "Warning",
              "The map settings were updated but we couldn't refresh the places. Pull to refresh or restart the app to see the changes."
            );
          }

          // Force re-render of Map component
          setRefreshKey((prevKey) => prevKey + 1);

          // Hide loading indicator
          setIsRefreshing(false);

          // Close the settings modal
          handleCloseSettingsModal();
        })
        .catch((error) => {
          console.error("Error refreshing map:", error);
          Alert.alert(
            "Error",
            "There was an error refreshing the map. Your settings have been saved and will apply next time you open the app."
          );
          setIsRefreshing(false);
          handleCloseSettingsModal();
        });
    } catch (error) {
      console.error("Error in handleSaveSettings:", error);
      Alert.alert("Error", "Failed to update settings. Please try again.");
      setIsRefreshing(false);
    }
  };

  const headerRightComponent = (
    <TouchableOpacity
      style={styles.distanceSettingsButton}
      onPress={handleDistanceSettingsModal}
      disabled={isRefreshing}
    >
      <View style={styles.distanceSettingsIconContainer}>
        <Ionicons
          name="settings-outline"
          size={20}
          color={isRefreshing ? Colors.primary + "80" : Colors.primary}
        />
        <View style={styles.distanceSettingsBadge} />
      </View>
    </TouchableOpacity>
  );

  // Report when placeToShow changes
  useEffect(() => {
    if (placeToShow) {
      console.log(`MapScreen: placeToShow updated: ${placeToShow.name}`);
    }
  }, [placeToShow]);

  // Handle when place card is shown in Map component
  const handlePlaceCardShown = useCallback(() => {
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

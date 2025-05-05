import React, { useEffect, useState, useCallback, useRef } from "react";
import MapView, { PROVIDER_DEFAULT, Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View, StyleSheet, Vibration, Alert, Text } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { handleCancel } from "../../handlers/Map/mapHandlers";
import { handleDestinationReached } from "../../handlers/Map/visitedPlacesHandlers";
import { saveVisitedPlace } from "../../controllers/Map/visitedPlacesController";
import { Colors, NeutralColors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import { useNavigation } from "expo-router";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import NetInfo from "@react-native-community/netinfo";
import {
  getLocationState,
  getNearbyPlacesState,
  onLocationUpdate,
  onPlacesUpdate,
} from "../../controllers/Map/locationController";
import useMapLocation from "../../hooks/Map/useMapLocation";
import useMapCamera from "../../hooks/Map/useMapCamera";
import useMapPlaces from "../../hooks/Map/useMapPlaces";
import useMapNavigation from "../../hooks/Map/useMapNavigation";
import { CardToggleArrow, EndJourneyButton, DirectionIndicator } from "./MapControls";
import { ViewModeToggle } from "./ViewModeToggle";
import MapLoading from "./MapLoading";
import MapErrorFallback from "./MapErrorFallback";
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import DestinationCard from "./DestinationCard";
import DiscoveredCard from "./DiscoveredCard";
import {
  GOOGLE_MAPS_APIKEY,
  DESTINATION_REACHED_THRESHOLD,
  MARKER_COLORS,
  LOCATION_UPDATE_THROTTLE,
  MapViewDirectionsMode,
} from "../../constants/Map/mapConstants";
import { Place, Coordinate, NavigationStep, VisitedPlaceDetails } from "../../types/MapTypes";
import * as mapUtils from "../../utils/mapUtils";
import { fetchPlaceDetailsOnDemand } from "../../controllers/Map/placesController";
import { hasMovedSignificantly } from "../../controllers/Map/locationController";
import { getQuotaRecord } from "../../controllers/Map/quotaController";

const MAX_VISIBLE_PLACES = 40;
const DESTINATION_CHECK_INTERVAL = 5000;
// const DESTINATION_TRACKING_THRESHOLD = 5;

type MapNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MapProps {
  placeToShow?: Place | null;
  onPlaceCardShown?: () => void;
  isInitialized?: boolean;
}

const Map: React.FC<MapProps> = ({ placeToShow, onPlaceCardShown }) => {
  getQuotaRecord();
  const navigation = useNavigation<MapNavigationProp>();
  const [placeProcessingAttempts, setPlaceProcessingAttempts] = useState<number>(0);
  const MAX_PROCESSING_ATTEMPTS = 5;
  const [loading, setLoading] = useState<boolean>(true);
  const [locationReady, setLocationReady] = useState<boolean>(false);
  const [placesReady, setPlacesReady] = useState<boolean>(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [destinationReached, setDestinationReached] = useState<boolean>(false);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [showDetailsCard, setShowDetailsCard] = useState<boolean>(false);
  const [showArrow, setShowArrow] = useState<boolean>(false);
  const [showDiscoveredCard, setShowDiscoveredCard] = useState<boolean>(false);
  const [destinationSaved, setDestinationSaved] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<string>("follow");
  const [userControllingCamera, setUserControllingCamera] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);
  const [journeyTrackingLocation, setJourneyTrackingLocation] = useState<Coordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const destinationSaveAttemptedRef = useRef<boolean>(false);
  const mapReadyRef = useRef<boolean>(false);
  const cameraUserControlTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPlaceToShowRef = useRef<Place | null>(null);
  const placeCardShownRef = useRef<boolean>(false);
  const destinationCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDestinationCheckTimeRef = useRef<number>(0);

  const location = useMapLocation();
  const camera = useMapCamera();
  const places = useMapPlaces();
  const mapNavigation = useMapNavigation();

  const [debugInfo, setDebugInfo] = useState<{
    placeReceived: boolean;
    placeProcessed: boolean;
    cardShown: boolean;
  }>({
    placeReceived: false,
    placeProcessed: false,
    cardShown: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // filters all cached places to show the 40 closest
  const updateVisiblePlaces = useCallback(() => {
    if (!location.userLocation || places.places.length === 0) return;
    const placesWithDistance = places.places.map((place) => {
      const distance =
        place.distance ||
        mapUtils.calcDist(
          location.userLocation!.latitude,
          location.userLocation!.longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

      return {
        ...place,
        distance,
      };
    });
    const closestPlaces = placesWithDistance
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, MAX_VISIBLE_PLACES);

    console.log(
      `Showing ${closestPlaces.length} closest places out of ${places.places.length} total places`
    );
    setVisiblePlaces(closestPlaces);
  }, [location.userLocation, places.places]);

  useEffect(() => {
    if (placeToShow && !showCard && !showDiscoveredCard && !journeyStarted) {
      console.log(`Map: DIRECT processing for place: ${placeToShow.name}`);
      setDebugInfo((prev) => ({ ...prev, placeReceived: true }));

      try {
        places.setSelectedPlace(placeToShow);
        setTravelTime("Calculating...");
        if (location.userLocation) {
          try {
            const userLoc = location.userLocation;
            const placeLoc = {
              latitude: placeToShow.geometry.location.lat,
              longitude: placeToShow.geometry.location.lng,
            };

            const distanceInKm =
              mapUtils.calcDist(
                userLoc.latitude,
                userLoc.longitude,
                placeLoc.latitude,
                placeLoc.longitude
              ) / 1000;

            const estimatedMinutes = Math.ceil(distanceInKm * 2);
            setTravelTime(`~${estimatedMinutes} min`);
            console.log(`Checking if place ${placeToShow.name} is already discovered...`);
            places
              .handlePlaceSelection(placeToShow, userLoc, location.region)
              .then((result) => {
                if (result && result.isDiscovered) {
                  console.log(
                    `Place ${placeToShow.name} is already discovered, showing discovered card`
                  );
                  setShowDiscoveredCard(true);
                  setShowCard(false);
                } else {
                  console.log(`Place ${placeToShow.name} is not discovered, showing explore card`);
                  setShowCard(true);
                  setShowDiscoveredCard(false);
                }
                if (onPlaceCardShown) {
                  setTimeout(() => {
                    onPlaceCardShown();
                  }, 300);
                }

                setDebugInfo((prev) => ({ ...prev, placeProcessed: true, cardShown: true }));
              })
              .catch((error) => {
                console.error("Error checking discovery status:", error);
                setShowCard(true);
                if (onPlaceCardShown) onPlaceCardShown();
              });
            if (!placeToShow.hasFullDetails) {
              if (isConnected) {
                console.log(`Map: Fetching details from Firebase/API for ${placeToShow.name}`);
                try {
                  fetchPlaceDetailsOnDemand(placeToShow.place_id)
                    .then((detailedPlace) => {
                      if (
                        detailedPlace &&
                        places.selectedPlace?.place_id === detailedPlace.place_id
                      ) {
                        places.setSelectedPlace(detailedPlace);
                        console.log(`Map: Updated with full details for ${detailedPlace.name}`);
                      }
                    })
                    .catch((detailError) => {
                      console.warn("Error fetching place details:", detailError);
                    });
                } catch (detailError) {
                  console.warn("Error fetching place details:", detailError);
                }
              } else {
                console.log("Map: Offline, using basic place data");
              }
            } else {
              console.log(`Map: Place ${placeToShow.name} already has full details`);
            }
          } catch (estimateError) {
            console.warn("Error estimating travel time:", estimateError);
            places
              .handlePlaceSelection(placeToShow, location.userLocation, location.region)
              .then((result) => {
                if (result && result.isDiscovered) {
                  setShowDiscoveredCard(true);
                } else {
                  setShowCard(true);
                }
                if (onPlaceCardShown) onPlaceCardShown();
              })
              .catch(() => {
                setShowCard(true);
                if (onPlaceCardShown) onPlaceCardShown();
              });
          }
        } else {
          places
            .handlePlaceSelection(
              placeToShow,
              { latitude: 0, longitude: 0 },
              location.region || {
                latitude: 0,
                longitude: 0,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            )
            .then((result) => {
              if (result && result.isDiscovered) {
                setShowDiscoveredCard(true);
              } else {
                setShowCard(true);
              }
              if (onPlaceCardShown) onPlaceCardShown();
            })
            .catch(() => {
              setShowCard(true);
              if (onPlaceCardShown) onPlaceCardShown();
            });
        }
      } catch (error) {
        console.error("Error processing place to show:", error);
        setShowCard(true);
        if (onPlaceCardShown) onPlaceCardShown();
      }
    }
  }, [
    placeToShow,
    showCard,
    showDiscoveredCard,
    journeyStarted,
    isConnected,
    location.userLocation,
  ]);

  useEffect(() => {
    if (
      pendingPlaceToShowRef.current &&
      !placeCardShownRef.current &&
      placeProcessingAttempts < MAX_PROCESSING_ATTEMPTS
    ) {
      const attemptToProcessPlace = async () => {
        try {
          console.log(
            `Map: Attempt ${placeProcessingAttempts + 1} to process place: ${
              pendingPlaceToShowRef.current?.name
            }`
          );

          const canProcess = !loading || placeProcessingAttempts >= 2;

          if (canProcess) {
            const placeToProcess = pendingPlaceToShowRef.current;
            if (placeToProcess) {
              console.log(`Map: Processing place: ${placeToProcess.name}`);
              placeCardShownRef.current = true;
              places.setSelectedPlace(placeToProcess);
              setShowCard(true);
              if (!placeToProcess.hasFullDetails) {
                if (isConnected) {
                  try {
                    console.log(
                      `Map: Fetching details from permanent storage for ${placeToProcess.name}`
                    );
                    const detailedPlace = await fetchPlaceDetailsOnDemand(placeToProcess.place_id);
                    if (
                      detailedPlace &&
                      places.selectedPlace?.place_id === detailedPlace.place_id
                    ) {
                      places.setSelectedPlace(detailedPlace);
                      console.log(`Map Updated with full details for ${detailedPlace.name}`);
                    }
                  } catch (detailError) {
                    console.warn("Error fetching place details:", detailError);
                  }
                } else {
                  console.log("Map: Offline, using basic place data");
                }
              } else {
                console.log(
                  `Map: Place ${placeToProcess.name} already has full details, no need to fetch`
                );
              }

              if (onPlaceCardShown) {
                onPlaceCardShown();
              }
            }
          } else {
            setPlaceProcessingAttempts((prev) => prev + 1);
          }
        } catch (error) {
          console.error("Error processing place:", error);
          setPlaceProcessingAttempts((prev) => prev + 1);
        }
      };
      const timer = setTimeout(attemptToProcessPlace, 500);
      return () => clearTimeout(timer);
    }
  }, [
    loading,
    placeProcessingAttempts,
    pendingPlaceToShowRef.current,
    placeCardShownRef.current,
    isConnected,
  ]);

  // handle retry when map fails
  const handleRetry = useCallback(() => {
    console.log("Retrying map load...");
    setMapError(null);
    setLoading(true);
    setLocationReady(false);
    setPlacesReady(false);
    pendingPlaceToShowRef.current = null;
    placeCardShownRef.current = false;
    location.resetLocationTracking();
    if (location.userLocation) {
      places.checkAndRefreshPlaces(location.userLocation);
    }
    setTimeout(() => {
      if (loading) {
        setLoading(false);
        setLocationReady(true);
        setPlacesReady(true);
      }
    }, 5000);
  }, [loading]);

  //check if user has reached destination
  const checkDestinationReached = useCallback(
    (userLoc: Coordinate) => {
      if (!journeyStarted || !places.destinationCoordinateRef.current || destinationReached) {
        return false;
      }
      const now = Date.now();
      if (now - lastDestinationCheckTimeRef.current < 1000) {
        return false;
      }
      lastDestinationCheckTimeRef.current = now;
      const distanceToDestination = mapUtils.calcDist(
        userLoc.latitude,
        userLoc.longitude,
        places.destinationCoordinateRef.current.latitude,
        places.destinationCoordinateRef.current.longitude
      );
      const reachThreshold = Math.min(DESTINATION_REACHED_THRESHOLD, 20);
      const reached = distanceToDestination <= reachThreshold;

      if (reached) {
        console.log(`Destination reached! Distance: ${distanceToDestination.toFixed(2)}m`);
        setDestinationReached(true);
        destinationSaveAttemptedRef.current = false;
        try {
          Vibration.vibrate([0, 200, 100, 200]);
        } catch (error) {
          console.warn("Could not vibrate:", error);
        }
        mapNavigation.announceDestinationReached();
        if (places.selectedPlace) {
          console.log(`Saving place to database: ${places.selectedPlace.name}`);
          handleDestinationReached(places.selectedPlace);
          saveVisitedPlace({
            ...places.selectedPlace,
            isVisited: true,
            visitedAt: new Date().toISOString(),
          })
            .then((success) => {
              console.log(`Direct save result: ${success ? "Success" : "Failed"}`);
              if (success) {
                setDestinationSaved(true);
              }
            })
            .catch((err) => console.error("Error during direct save:", err));
        }
        if (destinationCheckIntervalRef.current) {
          clearInterval(destinationCheckIntervalRef.current);
          destinationCheckIntervalRef.current = null;
        }

        return true;
      }

      return false;
    },
    [
      journeyStarted,
      places.destinationCoordinateRef.current,
      destinationReached,
      places.selectedPlace,
    ]
  );

  //initialize map using preloaded stored data
  useEffect(() => {
    try {
      console.log("Map component mounting, using pre-loaded location and places");
      if (!GOOGLE_MAPS_APIKEY) {
        throw new Error("Google Maps API key is missing");
      }
      const locationState = getLocationState();
      if (locationState.isInitialized && locationState.userLocation) {
        console.log("Using pre-initialized location:", locationState.userLocation);
        location.setUserLocation(locationState.userLocation);
        location.setRegion(locationState.region);
        setLocationReady(true);
      } else if (locationState.isInitializing) {
        console.log("Location still initializing, waiting for it...");
        const unsubscribeLocation = onLocationUpdate((updatedLocation) => {
          if (updatedLocation.isInitialized && updatedLocation.userLocation) {
            console.log("Location initialized:", updatedLocation.userLocation);
            location.setUserLocation(updatedLocation.userLocation);
            location.setRegion(updatedLocation.region);
            setLocationReady(true);
            unsubscribeLocation();
          }
        });
        setTimeout(() => {
          if (!locationReady) {
            console.warn("Location initialization timeout");
            setLocationReady(true);
            unsubscribeLocation();
          }
        }, 5000);
      } else {
        console.warn("Location not initializing or initialized, continuing anyway");
        setLocationReady(true);
      }
      const placesState = getNearbyPlacesState();

      if (placesState.hasPreloaded) {
        console.log(`Using ${placesState.places.length} preloaded places`);
        places.updatePlaces(placesState.places);
        setPlacesReady(true);
        if (locationState.userLocation) {
          setTimeout(() => updateVisiblePlaces(), 500);
        }
      } else if (placesState.isPreloading) {
        console.log("Places still preloading, waiting for completion...");

        const unsubscribePlaces = onPlacesUpdate((updatedPlaces) => {
          if (updatedPlaces.hasPreloaded) {
            console.log(`Places preloaded: ${updatedPlaces.places.length} places`);
            places.updatePlaces(updatedPlaces.places);
            setPlacesReady(true);
            if (locationState.userLocation) {
              setTimeout(() => updateVisiblePlaces(), 500);
            }

            unsubscribePlaces();
          }
        });

        setTimeout(() => {
          if (!placesReady) {
            console.warn("Places preloading timeout");
            setPlacesReady(true);
            unsubscribePlaces();
          }
        }, 5000);
      } else {
        console.warn("Places not preloading or preloaded, continuing anyway");
        setPlacesReady(true);
      }
      setTimeout(() => {
        if (loading) {
          console.warn("Overall loading timeout - forcing completion");
          setLoading(false);
        }
      }, 8000);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(error instanceof Error ? error : new Error("Failed to initialize map"));
      setLoading(false);
      setLocationReady(true);
      setPlacesReady(true);
    }

    return () => {
      console.log("Map component unmounting");
      if (cameraUserControlTimeoutRef.current) {
        clearTimeout(cameraUserControlTimeoutRef.current);
      }

      if (destinationCheckIntervalRef.current) {
        clearInterval(destinationCheckIntervalRef.current);
        destinationCheckIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (places.places.length > 0 && location.userLocation) {
      updateVisiblePlaces();
    }
  }, [places.places, updateVisiblePlaces]);

  useEffect(() => {
    if (locationReady && placesReady && loading) {
      console.log("Both location and places are ready, finishing loading");
      setLoading(false);

      if (location.userLocation && places.places.length > 0) {
        updateVisiblePlaces();
      }
    }
  }, [locationReady, placesReady, loading, updateVisiblePlaces]);

  useEffect(() => {
    const processPendingPlace = async () => {
      if (
        !loading &&
        locationReady &&
        placesReady &&
        pendingPlaceToShowRef.current &&
        !placeCardShownRef.current &&
        location.userLocation &&
        mapReadyRef.current
      ) {
        console.log(`Processing pending place to show: ${pendingPlaceToShowRef.current.name}`);

        try {
          placeCardShownRef.current = true;
          setTimeout(async () => {
            const placeToProcess = pendingPlaceToShowRef.current;
            if (placeToProcess) {
              try {
                await handlePlaceSelection(placeToProcess);

                if (location.userLocation && places.selectedPlace) {
                  const placeCoord = {
                    latitude: places.selectedPlace.geometry.location.lat,
                    longitude: places.selectedPlace.geometry.location.lng,
                  };

                  camera.showRouteOverview(location.userLocation, placeCoord, () => {});
                }

                if (onPlaceCardShown) {
                  onPlaceCardShown();
                }
              } catch (processError) {
                console.error("Error processing selected place:", processError);

                placeCardShownRef.current = false;

                setTimeout(() => {
                  placeCardShownRef.current = false;
                  setPlaceProcessingAttempts(0);
                }, 2000);
              }
            }
          }, 500);
        } catch (error) {
          console.error("Error in place processing setup:", error);
          placeCardShownRef.current = false;
        }
      }
    };

    processPendingPlace();
  }, [loading, locationReady, placesReady, location.userLocation, mapReadyRef.current]);

  const handleMapReady = useCallback(() => {
    console.log("Map is ready");
    mapReadyRef.current = true;

    if (location.userLocation && camera.mapRef.current && !userControllingCamera) {
      console.log("Focusing camera on user location");
      camera.focusOnUserLocation(location.userLocation, true);
      camera.initialCameraSetRef.current = true;
    }

    if (location.userLocation && places.places.length > 0) {
      updateVisiblePlaces();
    }
  }, [location.userLocation, camera, userControllingCamera, updateVisiblePlaces]);

  const handleMapDrag = useCallback(() => {
    if (!userControllingCamera) {
      console.log("User is now controlling camera");
      setUserControllingCamera(true);

      if (cameraUserControlTimeoutRef.current) {
        clearTimeout(cameraUserControlTimeoutRef.current);
      }

      cameraUserControlTimeoutRef.current = setTimeout(() => {
        if (journeyStarted && viewMode === "follow") {
          console.log("Resuming automatic camera control");
          setUserControllingCamera(false);
        }
      }, 30000);
    }
  }, [userControllingCamera, journeyStarted, viewMode]);

  useEffect(() => {
    if (destinationCheckIntervalRef.current) {
      clearInterval(destinationCheckIntervalRef.current);
      destinationCheckIntervalRef.current = null;
    }

    if (journeyStarted && !destinationReached && places.destinationCoordinateRef.current) {
      console.log("Setting up destination check interval");

      destinationCheckIntervalRef.current = setInterval(() => {
        if (location.userLocation) {
          checkDestinationReached(location.userLocation);
        }
      }, DESTINATION_CHECK_INTERVAL);
    }

    return () => {
      if (destinationCheckIntervalRef.current) {
        clearInterval(destinationCheckIntervalRef.current);
        destinationCheckIntervalRef.current = null;
      }
    };
  }, [
    journeyStarted,
    destinationReached,
    places.destinationCoordinateRef.current,
    checkDestinationReached,
  ]);

  useEffect(() => {
    if (!location.userLocation) return;
    try {
      const headingUpdated = location.updateHeadingFromMovement(location.userLocation);
      if (headingUpdated && viewMode === "follow" && journeyStarted && !userControllingCamera) {
        camera.updateUserCamera(location.userLocation, location.userHeading, false, viewMode);
      }

      if (
        !camera.initialCameraSetRef.current &&
        location.userLocation &&
        mapReadyRef.current &&
        !userControllingCamera
      ) {
        console.log("Setting initial camera position to user location");
        camera.initialCameraSetRef.current = true;
        camera.focusOnUserLocation(location.userLocation, true);
      }

      places.checkAndRefreshPlaces(location.userLocation);

      if (hasMovedSignificantly(location.userLocation)) {
        updateVisiblePlaces();
      }

      if (journeyStarted) {
        setJourneyTrackingLocation(location.userLocation);

        checkDestinationReached(location.userLocation);
      }

      if (journeyStarted && mapNavigation.navigationSteps.length > 0) {
        mapNavigation.updateNavigationInstructions(location.userLocation, journeyStarted);
      }
    } catch (error) {
      console.error("Error in location update effect:", error);
    }
  }, [location.userLocation, userControllingCamera, updateVisiblePlaces, checkDestinationReached]);

  useEffect(() => {
    if (!journeyTrackingLocation || !journeyStarted || destinationReached) {
      return;
    }

    try {
      checkDestinationReached(journeyTrackingLocation);
    } catch (error) {
      console.error("Error in journey tracking location effect:", error);
    }
  }, [journeyTrackingLocation, journeyStarted, destinationReached, checkDestinationReached]);

  useEffect(() => {
    if (
      destinationReached &&
      places.selectedPlace &&
      !destinationSaved &&
      !destinationSaveAttemptedRef.current
    ) {
      try {
        destinationSaveAttemptedRef.current = true;
        console.log(`Retry saving place to database: ${places.selectedPlace.name}`);

        saveVisitedPlace({
          ...places.selectedPlace,
          isVisited: true,
          visitedAt: new Date().toISOString(),
        })
          .then((success) => {
            console.log(`Retry save result: ${success ? "Success" : "Failed"}`);
            if (success) {
              setDestinationSaved(true);
            }
          })
          .catch((err) => console.error("Error during retry save:", err));
      } catch (error) {
        console.error("Error in destination save effect:", error);
      }
    }
  }, [destinationReached, places.selectedPlace, destinationSaved]);

  useEffect(() => {
    try {
      if (journeyStarted && places.selectedPlace && location.userLocation) {
        setDestinationSaved(false);

        setViewMode("follow");

        setUserControllingCamera(false);

        if (!userControllingCamera) {
          camera.setupInitialRouteView(
            location.userLocation,
            places.destinationCoordinateRef.current,
            setViewMode,
            location.userHeading
          );
        }
      }
    } catch (error) {
      console.error("Error in journey start effect:", error);
    }
  }, [journeyStarted, places.selectedPlace, location.userLocation]);

  //handle starting a journey
  const onStartJourney = async () => {
    try {
      setShowCard(false);
      setShowDiscoveredCard(false);
      setJourneyStarted(true);
      setShowDetailsCard(true);
      setDestinationReached(false);
      setDestinationSaved(false);
      setViewMode("follow");
      setUserControllingCamera(false);
      destinationSaveAttemptedRef.current = false;

      lastDestinationCheckTimeRef.current = 0;

      location.resetLocationTracking();
      camera.resetCameraState();

      mapNavigation.resetNavigation();

      if (places.selectedPlace) {
        places.destinationCoordinateRef.current = {
          latitude: places.selectedPlace.geometry.location.lat,
          longitude: places.selectedPlace.geometry.location.lng,
        };

        console.log("Destination coordinates set:", places.destinationCoordinateRef.current);
      } else {
        console.error("Cannot start journey: No place selected");
        Alert.alert("Navigation Error", "No destination selected. Please select a place first.");
        return;
      }

      if (location.userLocation) {
        setJourneyTrackingLocation(location.userLocation);
      }
    } catch (error) {
      console.error("Error starting journey:", error);
      Alert.alert("Navigation Error", "There was a problem starting navigation. Please try again.");
    }
  };

  const handleToggleViewMode = () => {
    try {
      setUserControllingCamera(false);

      if (viewMode === "follow") {
        camera.showRouteOverview(
          location.userLocation!,
          places.destinationCoordinateRef.current!,
          setViewMode
        );
      } else {
        setViewMode("follow");
        setTimeout(() => {
          if (location.userLocation && location.userHeading !== null && !userControllingCamera) {
            camera.updateUserCamera(location.userLocation, location.userHeading, true, "follow");
          }
        }, 300);
      }
    } catch (error) {
      console.error("Error toggling view mode:", error);
    }
  };

  //handle place selection
  const handlePlaceSelection = async (place: Place) => {
    try {
      places.setSelectedPlace(place);

      setTravelTime("Calculating...");

      if (location.userLocation) {
        try {
          const userLoc = location.userLocation;
          const placeLoc = {
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
          };

          const distanceInKm =
            mapUtils.calcDist(
              userLoc.latitude,
              userLoc.longitude,
              placeLoc.latitude,
              placeLoc.longitude
            ) / 1000;

          const estimatedMinutes = Math.ceil(distanceInKm * 2);
          setTravelTime(`~${estimatedMinutes} min`);
        } catch (error) {
          console.warn("Error estimating travel time:", error);
          setTravelTime("Available soon");
        }
      }

      console.log(`Checking if place ${place.name} is already discovered...`);

      try {
        // Use location fallbacks
        const userLocationForProcess = location.userLocation || {
          latitude: 0,
          longitude: 0,
        };
        const regionForProcess = location.region || {
          latitude: 0,
          longitude: 0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

        // check if the place is already discovered
        const result = await places.handlePlaceSelection(
          place,
          userLocationForProcess,
          regionForProcess
        );

        // show card based on discovery status
        if (result && result.isDiscovered) {
          console.log(`Place ${place.name} is already discovered, showing discovered card`);
          setShowDiscoveredCard(true);
          setShowCard(false);
        } else {
          console.log(`Place ${place.name} is not discovered, showing explore card`);
          setShowCard(true);
          setShowDiscoveredCard(false);
        }

        if (!place.hasFullDetails && isConnected) {
          console.log(
            `Map: Background fetching details from Firebase/permanent storage for ${place.name}`
          );
          try {
            const detailedPlace = await fetchPlaceDetailsOnDemand(place.place_id);
            if (detailedPlace && places.selectedPlace?.place_id === detailedPlace.place_id) {
              places.setSelectedPlace(detailedPlace);
              console.log(`Map: Updated with full details for ${place.name}`);
            }
          } catch (detailError) {
            console.warn("Error fetching place details:", detailError);
          }
        } else if (place.hasFullDetails) {
          console.log(`Map: Place ${place.name} already has full details`);
        } else {
          console.log("Map: Offline, using basic place data");
        }
      } catch (error) {
        console.error("Error checking place discovery status:", error);
        setShowCard(true);
      }
    } catch (error) {
      console.error("Error in place selection:", error);
      setShowCard(true);
    }
  };

  //handle learn more
  const handleLearnMore = () => {
    try {
      if (places.selectedPlace) {
        console.log(`Navigating to place details for: ${places.selectedPlace.name}`);
        navigation.navigate("PlaceDetails", {
          placeId: places.selectedPlace.place_id,
          place: places.selectedPlace,
        });
        if (!places.selectedPlace.hasFullDetails && isConnected) {
          fetchPlaceDetailsOnDemand(places.selectedPlace.place_id)
            .then((detailedPlace) => {
              if (detailedPlace) {
                console.log("Fetched detailed place data in background");
              }
            })
            .catch((error) => {
              console.error("Error fetching place details in background:", error);
            });
        }
      } else {
        console.error("Cannot navigate: No place selected");
      }
    } catch (error) {
      console.error("Error navigating to place details:", error);
      Alert.alert(
        "Navigation Error",
        "There was a problem opening the details page. Please try again."
      );
    }
  };

  /**
   * Handle dismissal of destination card
   */
  const handleDismissDestinationCard = () => {
    try {
      setDestinationReached(false);
      setDestinationSaved(false);
      destinationSaveAttemptedRef.current = false;

      if (destinationCheckIntervalRef.current) {
        clearInterval(destinationCheckIntervalRef.current);
        destinationCheckIntervalRef.current = null;
      }

      handleCancel(
        setConfirmEndJourney,
        places.setSelectedPlace,
        setRouteCoordinates,
        setTravelTime,
        setDistance,
        setShowArrow,
        setShowDetailsCard,
        setShowCard,
        setJourneyStarted
      );
      location.resetLocationTracking();
      places.destinationCoordinateRef.current = null;
      camera.initialRouteLoadedRef.current = false;

      setUserControllingCamera(false);
    } catch (error) {
      console.error("Error dismissing destination card:", error);
    }
  };

  const parseRouteInstructions = (result: any): NavigationStep[] => {
    try {
      if (!result.legs || !result.legs[0] || !result.legs[0].steps) {
        console.warn("Invalid route data format");
        return [];
      }

      const steps = result.legs[0].steps;

      return steps.map((step: any, index: number) => ({
        id: index,
        instructions: step.html_instructions.replace(/<[^>]*>/g, ""),
        distance: {
          text: step.distance.text,
          value: step.distance.value,
        },
        duration: {
          text: step.duration.text,
          value: step.duration.value,
        },
        maneuver: step.maneuver || "",
        startLocation: {
          latitude: step.start_location.lat,
          longitude: step.start_location.lng,
        },
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
      }));
    } catch (error) {
      console.error("Error parsing route instructions:", error);
      return [];
    }
  };

  /**
   * Handle swipe off
   */
  const handleSwipeOff = () => {
    setShowDetailsCard(false);
    setShowArrow(true);
  };

  const handleViewMoreInfo = () => {
    try {
      if (places.selectedPlace) {
        console.log(`Navigating to place details for: ${places.selectedPlace.name}`);

        const placeToView = { ...places.selectedPlace };

        setShowCard(false);
        setShowDiscoveredCard(false);

        navigation.navigate("PlaceDetails", {
          placeId: placeToView.place_id,
          place: placeToView,
        });

        if (!placeToView.hasFullDetails && isConnected) {
          fetchPlaceDetailsOnDemand(placeToView.place_id)
            .then((detailedPlace) => {
              if (detailedPlace) {
                console.log(
                  "Fetched detailed place data, it will be used if the details page checks again"
                );
              }
            })
            .catch((error) => {
              console.error("Error fetching place details in background:", error);
            });
        }
      } else {
        console.error("Cannot navigate: No place selected");
      }
    } catch (error) {
      console.error("Error navigating to place details:", error);
      Alert.alert(
        "Navigation Error",
        "There was a problem opening the details page. Please try again."
      );
    }
  };

  const handleArrowPress = () => {
    setShowArrow(false);
    setShowDetailsCard(true);
  };

  const handleEndJourney = () => {
    try {
      if (destinationCheckIntervalRef.current) {
        clearInterval(destinationCheckIntervalRef.current);
        destinationCheckIntervalRef.current = null;
      }

      handleCancel(
        setConfirmEndJourney,
        places.setSelectedPlace,
        setRouteCoordinates,
        setTravelTime,
        setDistance,
        setShowCard,
        setShowDetailsCard,
        setShowArrow,
        setJourneyStarted
      );

      mapNavigation.resetNavigation();

      setDestinationReached(false);
      setDestinationSaved(false);
      destinationSaveAttemptedRef.current = false;

      setUserControllingCamera(false);

      places.destinationCoordinateRef.current = null;
      camera.initialRouteLoadedRef.current = false;
      location.resetLocationTracking();
    } catch (error) {
      console.error("Error ending journey:", error);
    }
  };

  const handleDismissDiscoveredCard = () => {
    setShowDiscoveredCard(false);
    places.setSelectedPlace(null);
    places.setVisitedPlaceDetails(null);
  };

  const handleViewDiscoveredDetails = () => {
    try {
      if (places.selectedPlace) {
        console.log(`View details for discovered place: ${places.selectedPlace.name}`);

        const placeToView = places.visitedPlaceDetails || places.selectedPlace;

        setShowDiscoveredCard(false);

        navigation.navigate("PlaceDetails", {
          placeId: places.selectedPlace.place_id,
          place: placeToView,
        });

        if (isConnected && !placeToView.hasFullDetails) {
          fetchPlaceDetailsOnDemand(places.selectedPlace.place_id)
            .then((detailedPlace) => {
              if (detailedPlace) {
                console.log("Fetched detailed place data in background");
              }
            })
            .catch((error) => console.error("Error fetching background details:", error));
        }
      } else {
        console.error("Cannot navigate: No place selected");
      }
    } catch (error) {
      console.error("Error viewing discovered details:", error);
      Alert.alert(
        "Navigation Error",
        "There was a problem opening the details page. Please try again."
      );
    }
  };

  if (mapError) {
    return <MapErrorFallback error={mapError} onRetry={handleRetry} />;
  }

  if (loading) {
    return <MapLoading />;
  }

  if (!GOOGLE_MAPS_APIKEY) {
    return (
      <MapErrorFallback error={new Error("Google Maps API key is missing")} onRetry={handleRetry} />
    );
  }

  const markersToDisplay =
    journeyStarted && places.selectedPlace ? [places.selectedPlace] : visiblePlaces;

  try {
    return (
      <View style={styles.container}>
        <MapView
          ref={camera.mapRef}
          style={styles.map}
          initialRegion={location.region || undefined}
          customMapStyle={customMapStyle}
          showsPointsOfInterest={false}
          provider={PROVIDER_DEFAULT}
          followsUserLocation={!userControllingCamera && viewMode === "follow"}
          showsUserLocation={true}
          rotateEnabled={true}
          pitchEnabled={true}
          onMapReady={handleMapReady}
          onPanDrag={handleMapDrag}
          onRegionChangeComplete={() => {
            if (!userControllingCamera) {
              setUserControllingCamera(true);

              if (cameraUserControlTimeoutRef.current) {
                clearTimeout(cameraUserControlTimeoutRef.current);
              }

              cameraUserControlTimeoutRef.current = setTimeout(() => {
                if (journeyStarted && viewMode === "follow") {
                  console.log("Resuming automatic camera control after region change");
                  setUserControllingCamera(false);
                }
              }, 30000);
            }
          }}
          onUserLocationChange={(event) => {
            try {
              const { coordinate } = event.nativeEvent;
              if (!coordinate) return;

              const locationUpdate = {
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
              };

              if (journeyStarted && !destinationReached) {
                setJourneyTrackingLocation(locationUpdate);
              }

              location.locationUpdateCounterRef.current =
                (location.locationUpdateCounterRef.current + 1) % LOCATION_UPDATE_THROTTLE;
              if (location.locationUpdateCounterRef.current !== 0) return;

              if (hasMovedSignificantly(locationUpdate)) {
                location.setUserLocation(locationUpdate);

                if (location.region) {
                  location.setRegion({
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                    latitudeDelta: location.region.latitudeDelta,
                    longitudeDelta: location.region.longitudeDelta,
                  });
                }

                updateVisiblePlaces();
              }
            } catch (error) {
              console.error("Error in location change handler:", error);
            }
          }}
        >
          {markersToDisplay.map((place) => (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              pinColor={places.getMarkerColor(place, MARKER_COLORS)}
              onPress={() => !journeyStarted && handlePlaceSelection(place)}
            />
          ))}

          {places.routeCoordinates.length > 0 && journeyStarted && (
            <MapViewDirections
              key={`route-${places.routeKey}-${places.travelMode}`}
              origin={location.userLocation as Coordinate}
              resetOnChange={false}
              mode={places.travelMode.toUpperCase() as MapViewDirectionsMode}
              destination={{
                latitude: places.selectedPlace?.geometry.location.lat || 0,
                longitude: places.selectedPlace?.geometry.location.lng || 0,
              }}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={8}
              strokeColor={Colors.primary}
              optimizeWaypoints={true}
              onReady={(result) => {
                try {
                  if (result.distance && result.duration) {
                    const newTravelTime = `${parseFloat(result.duration.toString()).toFixed(
                      1
                    )} min`;
                    const newDistance = `${parseFloat(result.distance.toString()).toFixed(1)} km`;

                    console.log(
                      `Route ready: ${result.distance.toFixed(1)}km with ${
                        places.travelMode
                      } mode, time: ${newTravelTime}`
                    );

                    setTravelTime(newTravelTime);
                    setDistance(newDistance);

                    const steps = parseRouteInstructions(result);
                    mapNavigation.setNavigationStepsFromRoute(steps);

                    if (
                      journeyStarted &&
                      !camera.initialRouteLoadedRef.current &&
                      location.userLocation &&
                      !userControllingCamera
                    ) {
                      camera.setupInitialRouteView(
                        location.userLocation,
                        places.destinationCoordinateRef.current,
                        setViewMode,
                        location.userHeading
                      );
                    }
                  }
                } catch (error) {
                  console.error("Error processing route:", error);
                }
              }}
              onError={(errorMessage) => {
                console.error("MapViewDirections error:", errorMessage);
              }}
            />
          )}
        </MapView>

        {!isConnected && (
          <View style={styles.networkStatusContainer}>
            <Text style={styles.networkStatusText}>Offline Mode</Text>
          </View>
        )}

        {!location.userLocation && (
          <View style={styles.locationStatusContainer}>
            <Text style={styles.locationStatusText}>Waiting for location...</Text>
          </View>
        )}

        {journeyStarted && <ViewModeToggle viewMode={viewMode} onToggle={handleToggleViewMode} />}

        {showCard && places.selectedPlace && (places.travelTime || travelTime) && (
          <View style={styles.cardOverlayContainer}>
            <ExploreCard
              placeName={places.selectedPlace.name}
              travelTime={places.travelTime || travelTime}
              onStartJourney={onStartJourney}
              visible={showCard}
              rating={
                places.selectedPlace.rating != undefined
                  ? places.selectedPlace.rating
                  : "No Ratings"
              }
              travelMode={places.travelMode}
              placeDescription={places.selectedPlace.description}
              placeImage={
                places.selectedPlace.photos && places.selectedPlace.photos.length > 0
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${places.selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                  : undefined
              }
              onCancel={() =>
                handleCancel(
                  setConfirmEndJourney,
                  places.setSelectedPlace,
                  setRouteCoordinates,
                  setTravelTime,
                  setDistance,
                  setShowCard,
                  setJourneyStarted,
                  setShowArrow,
                  setShowDetailsCard
                )
              }
              onViewMoreInfo={handleViewMoreInfo}
            />
          </View>
        )}

        {showDiscoveredCard && places.selectedPlace && (
          <DiscoveredCard
            onVisitAgain={onStartJourney}
            placeName={places.visitedPlaceDetails?.name || places.selectedPlace.name}
            placeDescription={
              places.visitedPlaceDetails?.description || "A place you've already discovered."
            }
            placeImage={
              places.selectedPlace.photos && places.selectedPlace.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${places.selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                : undefined
            }
            discoveryDate={places.visitedPlaceDetails?.visitedAt}
            rating={places.visitedPlaceDetails?.rating || places.selectedPlace.rating}
            description={places.visitedPlaceDetails?.description}
            onViewDetails={handleViewDiscoveredDetails}
            onDismiss={handleDismissDiscoveredCard}
            visible={showDiscoveredCard}
          />
        )}

        {journeyStarted &&
          places.selectedPlace &&
          places.travelTime &&
          places.distance &&
          showDetailsCard && (
            <DetailsCard
              placeName={places.selectedPlace.name}
              travelTime={places.travelTime}
              distance={places.distance}
              travelMode={places.travelMode}
              onSwipeOff={handleSwipeOff}
              currentStep={mapNavigation.currentStep}
              nextStepDistance={mapNavigation.nextStepDistance}
              navigationSteps={mapNavigation.navigationSteps}
              stepIndex={mapNavigation.stepIndex}
              autoShowUpcomingStep={true}
              soundEnabled={mapNavigation.soundEnabled}
              setSoundEnabled={mapNavigation.setSoundEnabled}
              getManeuverIcon={(maneuver) =>
                mapNavigation.getManeuverIcon(maneuver, MaterialIcon, FontAwesome)
              }
            />
          )}

        {showArrow && <CardToggleArrow onPress={handleArrowPress} />}

        {journeyStarted && !destinationReached && <EndJourneyButton onPress={handleEndJourney} />}

        {journeyStarted && destinationReached && places.selectedPlace && (
          <View style={styles.destinationCardContainer}>
            <DestinationCard
              discoveryDate={new Date().toISOString()}
              placeImage={
                places.selectedPlace.photos && places.selectedPlace.photos.length > 0
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${places.selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                  : undefined
              }
              placeName={places.selectedPlace.name}
              onLearnMorePress={handleLearnMore}
              onDismiss={handleDismissDestinationCard}
              visible={true}
            />
          </View>
        )}
      </View>
    );
  } catch (error) {
    console.error("Error rendering map view:", error);
    return <MapErrorFallback error={new Error("Failed to load the map")} onRetry={handleRetry} />;
  }
};

// Type guard for checking if place exists and isn't null
const placeExists = (place: Place | null | undefined): place is Place => {
  return place !== null && place !== undefined;
};

// Map component styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  destinationCardContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  cardOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  locationStatusContainer: {
    position: "absolute",
    top: 30,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  locationStatusText: {
    color: "white",
    fontSize: 14,
  },
  networkStatusContainer: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    backgroundColor: "rgba(255,0,0,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  networkStatusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  placesInfoContainer: {
    position: "absolute",
    bottom: 20,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  placesInfoText: {
    color: "white",
    fontSize: 12,
  },
});

export default Map;

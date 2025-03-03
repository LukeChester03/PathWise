import React, { useEffect, useState, useRef, useCallback } from "react";
import MapView, {
  PROVIDER_GOOGLE,
  Circle,
  Marker,
  Camera,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
  Animated,
  Vibration,
  Platform,
} from "react-native";
import MapViewDirections from "react-native-maps-directions";
import FeatherIcon from "react-native-vector-icons/Feather";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import {
  handleMarkerPress,
  handleStartJourney,
  handleCancel,
} from "../../handlers/Map/mapHandlers";
import {
  requestLocationPermission,
  watchUserLocation,
} from "../../controllers/Map/locationController";
import { fetchNearbyPlaces } from "../../controllers/Map/placesController";
import { fetchRoute } from "../../controllers/Map/routesController";
import { Region, Place, TravelMode, MapViewDirectionsMode } from "../../types/MapTypes";
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import { Colors, NeutralColors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";
import { haversineDistance } from "../../utils/mapUtils";
import DestinationCard from "./DestinationCard";
import { useNavigation } from "expo-router";
// Notifications
import * as Notifications from "expo-notifications";
import {
  handleDestinationReached,
  checkVisitedPlaces,
} from "../../handlers/Map/visitedPlacesHandlers";
import { getVisitedPlaces, isPlaceVisited } from "../../controllers/Map/visitedPlacesController";

const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";
const DESTINATION_REACHED_THRESHOLD = 30;
const MARKER_REFRESH_THRESHOLD = 10000;
const DEFAULT_CIRCLE_RADIUS = 500;

// Define colors for different marker states
const MARKER_COLORS = {
  DEFAULT: Colors.primary,
  SELECTED: Colors.primary,
  VISITED: Colors.secondary,
};
// Define proximity thresholds for notifications
const PROXIMITY_NOTIFICATION_THRESHOLD = 100; // 100 meters
const NOTIFICATION_COOLDOWN = 600000; // 1 minute cooldown between notifications for the same place
export default function Map() {
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [showDetailsCard, setShowDetailsCard] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [locationWatcherCleanup, setLocationWatcherCleanup] = useState<(() => void) | null>(null);
  const [destinationReached, setDestinationReached] = useState<boolean>(false);
  const [showArrow, setShowArrow] = useState<boolean>(false);
  const [lastRefreshPosition, setLastRefreshPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [isRefreshingPlaces, setIsRefreshingPlaces] = useState<boolean>(false);
  const [circleRadius, setCircleRadius] = useState<number>(DEFAULT_CIRCLE_RADIUS);
  const [initialLoadingComplete, setInitialLoadingComplete] = useState<boolean>(false);
  const [destinationSaved, setDestinationSaved] = useState<boolean>(false);
  const [travelMode, setTravelMode] = useState<TravelMode>("walking");
  const [routeUpdateCounter, setRouteUpdateCounter] = useState<number>(0);
  const [showProximityNotification, setShowProximityNotification] = useState<boolean>(false);
  const [nearbyPlace, setNearbyPlace] = useState<Place | null>(null);
  const [notifiedPlaces, setNotifiedPlaces] = useState<Record<string, number>>({});
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [notificationVisible, setNotificationVisible] = useState<boolean>(false);
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  const notificationTranslateY = useRef(new Animated.Value(-100)).current;
  const [routeKey, setRouteKey] = useState<number>(0);

  const navigation = useNavigation();

  const [previousPosition, setPreviousPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<MapView>(null);

  // Function to handle notification permissions
  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#d03f74",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Notification Permission", "Enable notifications to discover nearby locations!", [
        { text: "Maybe Later", style: "cancel" },
        {
          text: "Settings",
          onPress: () => {
            /* Open settings */
          },
        },
      ]);
      return false;
    }

    return true;
  };

  // Function to show in-app notification
  const showInAppNotification = (place: Place) => {
    setNearbyPlace(place);
    setNotificationVisible(true);
    setNotificationCount((prev) => prev + 1);

    // Vibrate to alert user
    Vibration.vibrate(500);

    // Animate notification in
    Animated.parallel([
      Animated.timing(notificationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(notificationTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification();
    }, 5000);
  };

  // Function to dismiss notification
  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(notificationOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(notificationTranslateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotificationVisible(false);
      setNearbyPlace(null);
    });
  };

  // Function to send push notification
  const sendPushNotification = async (place: Place) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "You have entered the discovery zone!",
        body: `${place.name} is nearby. Tap to explore this undiscovered place!`,
        data: { placeId: place.place_id },
      },
      trigger: null, // Send immediately
    });
  };

  // Function to handle notification response
  const handleNotificationResponse = (place: Place) => {
    // If user taps notification, select the place
    handlePlaceSelection(place);
    dismissNotification();
  };

  // Custom function to handle place selection (extracted from handleMarkerPress)
  const handlePlaceSelection = async (place: Place) => {
    if (!userLocation && !region) {
      Alert.alert("Location Error", "Unable to determine your current location.");
      return;
    }

    const origin = `${userLocation?.latitude || region?.latitude},${
      userLocation?.longitude || region?.longitude
    }`;
    const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;

    try {
      setSelectedPlace(place);

      // Fetch route details with travel mode determination
      const routeResult = await fetchRoute(origin, destination);

      if (routeResult) {
        const { coords, duration, distance: distanceKm, travelMode: routeTravelMode } = routeResult;

        // Log the detected travel mode and distance
        console.log(
          `Route calculation: ${distanceKm.toFixed(
            1
          )}km, mode: ${routeTravelMode}, time: ${duration}`
        );

        setRouteCoordinates(coords);
        setTravelTime(duration);
        setDistance(distanceKm.toFixed(1) + " km");

        // Set travel mode - restrict to just walking or driving
        if (routeTravelMode === "bicycling" || routeTravelMode === "transit") {
          // Map other modes to driving for simplicity
          setTravelMode("driving");
        } else {
          setTravelMode(routeTravelMode);
        }

        // Force route recalculation by updating the key
        setRouteKey((prev) => prev + 1);

        setShowCard(true);
      } else {
        Alert.alert("Route Error", "Could not calculate a route to this destination.");
      }
    } catch (error) {
      console.error("Error getting route:", error);
      Alert.alert("Route Error", "There was a problem calculating the route.");
    }
  };

  // Initialize map with user location and nearby places
  const initializeMap = async () => {
    try {
      // Request location permission
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          "Location Permission Required",
          "We need your location to show you nearby attractions."
        );
        setLoading(false);
        return;
      }

      // Request notification permissions
      await registerForPushNotificationsAsync();

      // Get current location
      const locationWatcher = await watchUserLocation(
        (locationUpdate) => {
          if (!region) {
            // First time setting the region
            setRegion(locationUpdate);
            setUserLocation(locationUpdate);

            // Fetch places once we have the initial location
            refreshNearbyPlaces(locationUpdate.latitude, locationUpdate.longitude);
          } else {
            // Just update the user location, not the map region
            setUserLocation(locationUpdate);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          Alert.alert("Location Error", "Could not get your current location.");
          setLoading(false);
        }
      );

      // Set cleanup function
      setLocationWatcherCleanup(() => locationWatcher);
    } catch (error) {
      console.error("Error initializing map:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeMap();

    // Set up notification handler
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const placeId = response.notification.request.content.data.placeId;
      // Find place by ID and navigate to it
      const place = places.find((p) => p.place_id === placeId);
      if (place) {
        handlePlaceSelection(place);
      }
    });

    // Cleanup function
    return () => {
      if (locationWatcherCleanup) {
        locationWatcherCleanup();
      }
      subscription.remove();
    };
  }, []);

  // Check for nearby undiscovered places
  useEffect(() => {
    if (!userLocation || places.length === 0 || journeyStarted) return;

    // Find undiscovered places within the proximity threshold
    const now = Date.now();

    places.forEach((place) => {
      // Skip if already visited
      if (place.isVisited === true) return;

      // Skip if already notified recently (within cooldown period)
      const lastNotified = notifiedPlaces[place.place_id] || 0;
      if (now - lastNotified < NOTIFICATION_COOLDOWN) return;

      // Calculate distance
      const distance = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      // Check if within notification threshold
      if (distance <= PROXIMITY_NOTIFICATION_THRESHOLD) {
        console.log(`User is near undiscovered place: ${place.name} (${distance}m)`);

        // Update notified places with timestamp
        setNotifiedPlaces((prev) => ({
          ...prev,
          [place.place_id]: now,
        }));

        // Show in-app notification
        showInAppNotification(place);

        // Send push notification (only if app is in background)
        if (Math.random() > 0.7) {
          // Randomly send push sometimes to avoid spamming
          sendPushNotification(place);
        }
      }
    });
  }, [userLocation, places, journeyStarted, notifiedPlaces]);

  // Function to refresh nearby places
  const refreshNearbyPlaces = useCallback(
    async (latitude: number, longitude: number) => {
      if (isRefreshingPlaces) return;

      try {
        setIsRefreshingPlaces(true);

        // Get places using the updated controller that returns places and furthestDistance
        const { places: newPlaces, furthestDistance } = await fetchNearbyPlaces(
          latitude,
          longitude
        );

        // Set the circle radius based on the furthest place
        setCircleRadius(furthestDistance);

        if (newPlaces && newPlaces.length > 0) {
          // Check which places have been visited before
          const placesWithVisitedStatus = await checkVisitedPlaces(newPlaces);

          // Keep selected place in the list if it exists
          if (selectedPlace) {
            const selectedPlaceExists = placesWithVisitedStatus.some(
              (place) => place.place_id === selectedPlace.place_id
            );

            if (!selectedPlaceExists) {
              // If the selected place isn't in the new list, add it
              const selectedWithVisitedStatus = await checkVisitedPlaces([selectedPlace]);
              setPlaces([...placesWithVisitedStatus, ...selectedWithVisitedStatus]);
            } else {
              setPlaces(placesWithVisitedStatus);
            }
          } else {
            setPlaces(placesWithVisitedStatus);
          }
        } else if (newPlaces && newPlaces.length === 0) {
          // If no places found, keep selected place if it exists
          if (selectedPlace) {
            const selectedWithVisitedStatus = await checkVisitedPlaces([selectedPlace]);
            setPlaces(selectedWithVisitedStatus);
          } else {
            setPlaces([]);
          }
        }

        setLastRefreshPosition({ latitude, longitude });
        setLastRefreshTime(Date.now());
        setLoading(false);

        // Mark initial loading as complete
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }
      } catch (error) {
        console.error("Error refreshing nearby places:", error);
        setLoading(false);

        // Still mark initial loading as complete even if there was an error
        if (!initialLoadingComplete) {
          setInitialLoadingComplete(true);
        }
      } finally {
        setIsRefreshingPlaces(false);
      }
    },
    [selectedPlace, isRefreshingPlaces, initialLoadingComplete]
  );

  // Calculate heading based on current and previous positions
  const calculateHeading = (
    prevLat: number,
    prevLng: number,
    currentLat: number,
    currentLng: number
  ): number => {
    // Convert to radians
    const startLat = (prevLat * Math.PI) / 180;
    const startLng = (prevLng * Math.PI) / 180;
    const destLat = (currentLat * Math.PI) / 180;
    const destLng = (currentLng * Math.PI) / 180;

    // Calculate heading
    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x =
      Math.cos(startLat) * Math.sin(destLat) -
      Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    return bearing;
  };

  // Update map camera to follow user with correct orientation
  const updateMapCamera = (location: Region, heading: number | null) => {
    if (!mapRef.current || !journeyStarted) return;

    const camera: Camera = {
      center: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      pitch: 45, // Add some tilt for better navigation view
      heading: heading || 0, // Use the calculated heading or default to north
      altitude: 2000, // Adjust for desired zoom level
      zoom: 17, // Close enough to see streets clearly
    };

    mapRef.current.animateCamera(camera, { duration: 1000 });
  };

  // Check if we should refresh places based on user movement
  const checkAndRefreshPlaces = useCallback(
    (newLocation: Region) => {
      // Don't try to refresh if initial loading isn't complete or if lastRefreshPosition isn't set
      if (!initialLoadingComplete || !lastRefreshPosition) return;

      const currentTime = Date.now();
      const timeSinceLastRefresh = currentTime - lastRefreshTime;

      // Only refresh if enough time has passed since the last refresh
      if (timeSinceLastRefresh < MARKER_REFRESH_THRESHOLD) return;

      const distance = haversineDistance(
        lastRefreshPosition.latitude,
        lastRefreshPosition.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      // If user has moved more than 50% of the circle radius, refresh places
      if (distance > circleRadius * 0.5) {
        refreshNearbyPlaces(newLocation.latitude, newLocation.longitude);
      }
    },
    [
      lastRefreshPosition,
      lastRefreshTime,
      circleRadius,
      refreshNearbyPlaces,
      initialLoadingComplete,
    ]
  );

  // Setup detailed location tracking when journey starts
  useEffect(() => {
    if (journeyStarted && selectedPlace) {
      // Reset previous position and heading
      setPreviousPosition(null);
      setUserHeading(null);
      // Reset destination saved state whenever a new journey starts
      setDestinationSaved(false);

      // Initial map camera update without heading (will point north)
      if (mapRef.current && userLocation) {
        const initialCamera: Camera = {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          pitch: 45,
          heading: 0,
          altitude: 100,
          zoom: 30,
        };

        mapRef.current.animateCamera(initialCamera, { duration: 500 });
      }
    }
  }, [journeyStarted]);

  // Update heading and refresh places based on movement
  useEffect(() => {
    if (!userLocation || !previousPosition) return;

    // Calculate heading if we have a previous position
    const heading = calculateHeading(
      previousPosition.latitude,
      previousPosition.longitude,
      userLocation.latitude,
      userLocation.longitude
    );

    // Only update heading if there's significant movement (to avoid jitter)
    const distance = haversineDistance(
      previousPosition.latitude,
      previousPosition.longitude,
      userLocation.latitude,
      userLocation.longitude
    );

    if (distance > 2) {
      // Only update heading if moved more than 2 meters
      setUserHeading(heading);
      if (journeyStarted) {
        updateMapCamera(userLocation, heading);
      }
      setPreviousPosition({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      // Check if we should refresh places (when not in journey mode)
      if (!journeyStarted) {
        checkAndRefreshPlaces(userLocation);
      }
    }
  }, [userLocation, previousPosition, journeyStarted]);

  // Separate useEffect specifically for checking if destination reached
  useEffect(() => {
    // Only run this effect when we have all needed data and journey is active
    if (!userLocation || !selectedPlace || !journeyStarted) return;

    // Skip the check if destination already reached
    if (destinationReached) return;

    // Check if destination has been reached
    const distanceToDestination = haversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      selectedPlace.geometry.location.lat,
      selectedPlace.geometry.location.lng
    );

    console.log(
      `Distance to destination: ${distanceToDestination}m (threshold: ${DESTINATION_REACHED_THRESHOLD}m)`
    );

    if (distanceToDestination <= DESTINATION_REACHED_THRESHOLD) {
      console.log("Destination reached!");
      setDestinationReached(true);
      setShowDetailsCard(false);
      setShowArrow(false);

      // Only save to database if not already saved
      if (!destinationSaved && journeyStarted) {
        // Note: We're passing the complete selectedPlace object which contains all place details
        // including rating, user_ratings_total, and reviews if available
        handleDestinationReached(
          selectedPlace,
          (isNewPlace: boolean) => {
            // Mark as saved to prevent duplicate entries
            setDestinationSaved(true);

            // If it's a new place, update places array to mark as visited
            if (isNewPlace) {
              setPlaces((prevPlaces) =>
                prevPlaces.map((place) => {
                  if (place.place_id === selectedPlace.place_id) {
                    return { ...place, isVisited: true };
                  }
                  return place;
                })
              );
            }
          },
          (error: Error) => {
            console.error("Failed to save destination to database:", error);
            Alert.alert(
              "Error",
              "There was an error saving this discovery. Please try again later."
            );
          }
        );
      }
    }
  }, [userLocation, selectedPlace, journeyStarted, destinationReached, destinationSaved]);

  const onStartJourney = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      setShowCard(false);
      setJourneyStarted(true);
      setShowDetailsCard(true);
      setDestinationReached(false);
      setDestinationSaved(false); // Reset saved state when starting a new journey

      // Increment counter to force route redraw
      setRouteUpdateCounter((prev) => prev + 1);
    } else {
      Alert.alert(
        "Location Permission Required",
        "We need location permission to guide you to your destination."
      );
    }
  };

  // Handle learn more action from destination card
  const handleLearnMore = () => {
    if (selectedPlace) {
      // Logic with AI
    }
  };

  // Handle dismissal of destination card
  const handleDismissDestinationCard = () => {
    setDestinationReached(false);
    handleCancel(
      setConfirmEndJourney,
      setSelectedPlace,
      setRouteCoordinates,
      setTravelTime,
      setDistance,
      setShowArrow,
      setShowDetailsCard,
      setShowCard,
      setJourneyStarted
    );
    setPreviousPosition(null);
    setUserHeading(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleSwipeOff = () => {
    setShowDetailsCard(false);
    setShowArrow(true);
  };

  const handleArrowPress = () => {
    setShowArrow(false);
    setShowDetailsCard(true);
  };

  // Only display the selected place marker if journey is started
  const markersToDisplay = journeyStarted && selectedPlace ? [selectedPlace] : places;

  // Function to determine marker color based on status
  const getMarkerColor = (place) => {
    if (selectedPlace?.place_id === place.place_id) {
      return MARKER_COLORS.SELECTED;
    }
    if (selectedPlace?.place_id === place.place_id && place.isVisited === true) {
      return MARKER_COLORS.VISITED;
    }
    if (selectedPlace?.place_id === place.place_id && place.isVisited === false) {
      return MARKER_COLORS.SELECTED;
    }
    // Only show blue if explicitly marked as visited in the database (strict equality)
    if (place.isVisited === true) {
      return MARKER_COLORS.VISITED;
    }
    return MARKER_COLORS.DEFAULT;
  };

  // Generate a random notification message
  const getNotificationMessage = (placeName) => {
    const messages = [
      `${placeName} is just around the corner!`,
      `You're close to ${placeName}! Discover it now.`,
      `Adventure awaits at nearby ${placeName}!`,
      `New discovery opportunity: ${placeName} is close by!`,
      `${placeName} is within walking distance. Check it out!`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region || undefined}
        customMapStyle={customMapStyle}
        showsPointsOfInterest={false}
        showsUserLocation
        provider={PROVIDER_DEFAULT}
        followsUserLocation={journeyStarted}
        rotateEnabled={true}
        pitchEnabled={true}
        onUserLocationChange={(event) => {
          const { coordinate } = event.nativeEvent;
          if (coordinate) {
            // Update user location
            const locationUpdate = {
              latitude: coordinate.latitude,
              longitude: coordinate.longitude,
              latitudeDelta: region?.latitudeDelta || 0.01,
              longitudeDelta: region?.longitudeDelta || 0.01,
            };

            setUserLocation(locationUpdate);

            // Initialize previous position if not set
            if (!previousPosition) {
              setPreviousPosition({
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
              });
            }
          }
        }}
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={circleRadius}
            strokeColor={Colors.primary}
            strokeWidth={2}
            fillColor={`${Colors.primary}10`}
          />
        )}

        {/* Show proximity circles around undiscovered places */}
        {places
          .filter((place) => place.isVisited !== true)
          .map((place) => (
            <Circle
              key={`proximity-${place.place_id}`}
              center={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              radius={PROXIMITY_NOTIFICATION_THRESHOLD}
              strokeColor={Colors.primary}
              strokeWidth={0.5}
              fillColor={"rgba(255, 58, 117, 0.09)"}
            />
          ))}

        {markersToDisplay.map((place) => (
          <Marker
            key={place.place_id}
            coordinate={{
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            }}
            pinColor={getMarkerColor(place)}
            onPress={() => !journeyStarted && handlePlaceSelection(place)}
          />
        ))}

        {routeCoordinates.length > 0 && journeyStarted && (
          <MapViewDirections
            key={`route-${routeKey}-${travelMode}`} // Force re-render when travel mode changes
            origin={userLocation || region}
            resetOnChange={false}
            mode={travelMode.toUpperCase() as MapViewDirectionsMode}
            destination={{
              latitude: selectedPlace?.geometry.location.lat || 0,
              longitude: selectedPlace?.geometry.location.lng || 0,
            }}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={8}
            strokeColor={Colors.primary}
            optimizeWaypoints={true}
            onReady={(result) => {
              if (result.distance && result.duration) {
                // Always update the travel time and distance when route is ready
                const newTravelTime = `${parseFloat(result.duration.toString()).toFixed(1)} min`;
                const newDistance = `${parseFloat(result.distance.toString()).toFixed(1)} km`;

                console.log(
                  `Route ready: ${result.distance.toFixed(
                    1
                  )}km with ${travelMode} mode, time: ${newTravelTime}`
                );

                setTravelTime(newTravelTime);
                setDistance(newDistance);
              }
            }}
            onError={(errorMessage) => {
              console.error("MapViewDirections error:", errorMessage);
            }}
          />
        )}
      </MapView>

      {/* In-app notification for nearby places */}
      {notificationVisible && nearbyPlace && (
        <Animated.View
          style={[
            styles.notificationContainer,
            {
              opacity: notificationOpacity,
              transform: [{ translateY: notificationTranslateY }],
            },
          ]}
        >
          <View style={styles.notificationInner}>
            <View style={styles.notificationIconContainer}>
              <MaterialIcon name="location-on" size={24} color="#fff" />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Nearby Discovery!</Text>
              <Text style={styles.notificationText}>
                {getNotificationMessage(nearbyPlace.name)}
              </Text>
            </View>
            <View style={styles.notificationActions}>
              <TouchableOpacity
                style={styles.notificationAction}
                onPress={() => handleNotificationResponse(nearbyPlace)}
              >
                <Text style={styles.notificationActionText}>Explore</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.notificationDismiss} onPress={dismissNotification}>
                <MaterialIcon name="close" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Notification count badge (only shows when you have notifications) */}
      {notificationCount > 0 && !notificationVisible && (
        <TouchableOpacity
          style={styles.notificationBadge}
          onPress={() => {
            // Find the closest unvisited place and show notification
            if (places.length > 0 && userLocation) {
              let closestPlace = null;
              let minDistance = Infinity;

              places.forEach((place) => {
                if (place.isVisited !== true) {
                  const distance = haversineDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    place.geometry.location.lat,
                    place.geometry.location.lng
                  );

                  if (distance < minDistance) {
                    minDistance = distance;
                    closestPlace = place;
                  }
                }
              });

              if (closestPlace) {
                showInAppNotification(closestPlace);
              }
            }
          }}
        >
          <FontAwesome name="bell" size={16} color="#fff" />
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{notificationCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {showCard && selectedPlace && travelTime && (
        <ExploreCard
          placeName={selectedPlace.name}
          travelTime={travelTime}
          onStartJourney={onStartJourney}
          visible={showCard}
          travelMode={travelMode}
          placeDescription={selectedPlace.description}
          placeImage={
            selectedPlace.photos && selectedPlace.photos.length > 0
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
              : undefined
          }
          onCancel={() =>
            handleCancel(
              setConfirmEndJourney,
              setSelectedPlace,
              setRouteCoordinates,
              setTravelTime,
              setDistance,
              setShowCard,
              setJourneyStarted,
              setShowArrow,
              setShowDetailsCard
            )
          }
        />
      )}

      {journeyStarted && selectedPlace && travelTime && distance && showDetailsCard && (
        <DetailsCard
          placeName={selectedPlace.name}
          travelTime={travelTime}
          distance={distance}
          travelMode={travelMode} // Now required, not optional
          onSwipeOff={handleSwipeOff}
          onInfoPress={() => {
            Alert.alert(
              "Route Information",
              `This route uses ${travelMode} mode because the destination is ${
                travelMode === "driving" ? "over" : "under"
              } 5km away. Travel time: ${travelTime}, Distance: ${distance}`
            );
          }}
        />
      )}

      {showArrow && (
        <TouchableOpacity style={styles.arrowContainer} onPress={handleArrowPress}>
          <FeatherIcon name={"more-horizontal"} size={22} color={NeutralColors.black}></FeatherIcon>
        </TouchableOpacity>
      )}

      {journeyStarted && !destinationReached && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              handleCancel(
                setConfirmEndJourney,
                setSelectedPlace,
                setRouteCoordinates,
                setTravelTime,
                setDistance,
                setShowCard,
                setShowDetailsCard,
                setShowArrow,
                setJourneyStarted
              )
            }
          >
            <Text style={styles.cancelButtonText}>End Journey</Text>
          </TouchableOpacity>
        </View>
      )}

      {destinationReached && selectedPlace && (
        <View style={styles.destinationCardContainer}>
          <DestinationCard
            discoveryDate={new Date().toISOString()}
            placeImage={
              selectedPlace.photos && selectedPlace.photos.length > 0
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
                : undefined
            }
            placeName={selectedPlace.name}
            onLearnMorePress={handleLearnMore}
            onDismiss={handleDismissDestinationCard}
            visible={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: "50%",
    backgroundColor: Colors.danger,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  arrowContainer: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: NeutralColors.white,
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
  // Notification styles
  notificationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 45 : 15,
    paddingHorizontal: 10,
    zIndex: 1000,
  },
  notificationInner: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    minHeight: 80,
  },
  notificationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#222",
    marginBottom: 3,
  },
  notificationText: {
    fontSize: 14,
    color: "#555",
  },
  notificationActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationAction: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    marginRight: 8,
  },
  notificationActionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  notificationDismiss: {
    padding: 5,
  },
  notificationBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 45 : 15,
    right: 15,
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  badgeCount: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: Colors.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "white",
  },
  badgeCountText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});

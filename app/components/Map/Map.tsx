import React, { useEffect, useState, useRef, useCallback } from "react";
import MapView, { PROVIDER_GOOGLE, Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";
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
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
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
import TurnByTurnNavigation from "./TurnByTurnNavigation";
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
  getVisitedPlaceDetails,
} from "../../handlers/Map/visitedPlacesHandlers";
import DiscoveredCard from "./DiscoveredCard";
import { isPlaceVisited } from "../../controllers/Map/visitedPlacesController";

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
const NOTIFICATION_COOLDOWN = 600000; // 10 minutes cooldown between notifications for the same place

// Define styles for the component
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

export default function Map() {
  const [region, setRegion] = useState(null);
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState<Place>(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [travelTime, setTravelTime] = useState(null);
  const [distance, setDistance] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [showDetailsCard, setShowDetailsCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userHeading, setUserHeading] = useState(null);
  const [locationWatcherCleanup, setLocationWatcherCleanup] = useState(null);
  const [destinationReached, setDestinationReached] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const [lastRefreshPosition, setLastRefreshPosition] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isRefreshingPlaces, setIsRefreshingPlaces] = useState(false);
  const [circleRadius, setCircleRadius] = useState(DEFAULT_CIRCLE_RADIUS);
  const [initialLoadingComplete, setInitialLoadingComplete] = useState(false);
  const [destinationSaved, setDestinationSaved] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>("walking");
  const [routeUpdateCounter, setRouteUpdateCounter] = useState(0);
  const [showProximityNotification, setShowProximityNotification] = useState(false);
  const [nearbyPlace, setNearbyPlace] = useState(null);
  const [notifiedPlaces, setNotifiedPlaces] = useState({});
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const notificationOpacity = useRef(new Animated.Value(0)).current;
  const notificationTranslateY = useRef(new Animated.Value(-100)).current;
  const [routeKey, setRouteKey] = useState(0);
  const [previousPosition, setPreviousPosition] = useState(null);
  const [lastAnnouncedPosition, setLastAnnouncedPosition] = useState(null);

  // New turn-by-turn navigation state
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [nextStepDistance, setNextStepDistance] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [lastAnnouncedStep, setLastAnnouncedStep] = useState(-1);
  const [navigationVisible, setNavigationVisible] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasSpokenInitialInstruction, setHasSpokenInitialInstruction] = useState<Boolean>(false);

  //Discovered Card state variables
  const [showDiscoveredCard, setShowDiscoveredCard] = useState(false);
  const [visitedPlaceDetails, setVisitedPlaceDetails] = useState(null);

  // New state variables for improved navigation
  const [lastAnnouncementTime, setLastAnnouncementTime] = useState(0);
  const ANNOUNCEMENT_COOLDOWN = 20000; // 8 seconds minimum between announcements
  const [locationUpdateCounter, setLocationUpdateCounter] = useState(0);
  const LOCATION_UPDATE_THROTTLE = 3; // Only process every 3rd update
  const [speechQueue, setSpeechQueue] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const INITIAL_NAVIGATION_DELAY = 20000; // Delay first instruction by 20 seconds

  const navigation = useNavigation();
  const mapRef = useRef(null);

  // Process the speech queue whenever it changes
  useEffect(() => {
    processSpeechQueue();
  }, [speechQueue]);

  // Function to process the speech queue
  const processSpeechQueue = useCallback(async () => {
    if (speechQueue.length === 0 || isSpeaking || !soundEnabled) return;

    setIsSpeaking(true);
    const instruction = speechQueue[0];

    try {
      // Stop any currently speaking instruction
      await Speech.stop();

      // Play notification sound before speaking
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/navigation-alert.mp3")
        );

        await sound.playAsync();

        // Wait a moment before speaking
        setTimeout(() => {
          Speech.speak(instruction, {
            language: "en-US",
            pitch: 1.0,
            rate: 0.9,
            onDone: () => {
              console.log("Finished speaking instruction");
              // Remove the spoken instruction from queue and set speaking to false
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
            onError: (error) => {
              console.warn("Error speaking instruction:", error);
              // Even on error, remove from queue and continue
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
          });
        }, 700);
      } catch (soundError) {
        console.warn("Error playing notification sound:", soundError);
        // Fallback if sound file can't be loaded
        Speech.speak(instruction, {
          language: "en-US",
          pitch: 1.0,
          rate: 0.9,
          onDone: () => {
            setSpeechQueue((prev) => prev.slice(1));
            setIsSpeaking(false);
          },
          onError: () => {
            setSpeechQueue((prev) => prev.slice(1));
            setIsSpeaking(false);
          },
        });
      }
    } catch (error) {
      console.warn("Error with text-to-speech:", error);
      // Recover from error
      setSpeechQueue((prev) => prev.slice(1));
      setIsSpeaking(false);
    }
  }, [speechQueue, isSpeaking, soundEnabled]);

  // Function to parse route instructions from Google Directions API response
  const parseRouteInstructions = (result) => {
    try {
      if (!result.legs || !result.legs[0] || !result.legs[0].steps) {
        console.warn("Invalid route data format");
        return [];
      }

      const steps = result.legs[0].steps;

      return steps.map((step, index) => ({
        id: index,
        instructions: step.html_instructions.replace(/<[^>]*>/g, ""), // Remove HTML tags
        distance: {
          text: step.distance.text,
          value: step.distance.value, // meters
        },
        duration: {
          text: step.duration.text,
          value: step.duration.value, // seconds
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

  // Update map camera to follow user with correct orientation
  const updateMapCamera = (location, heading) => {
    if (!mapRef.current || !journeyStarted) return;

    const camera = {
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
    (newLocation) => {
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
    [lastRefreshPosition, lastRefreshTime, circleRadius, initialLoadingComplete]
  );

  // Function to refresh nearby places
  const refreshNearbyPlaces = useCallback(
    async (latitude, longitude) => {
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
        const initialCamera = {
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

  // Function to determine which maneuver icon to show
  const getManeuverIcon = (maneuver) => {
    switch (maneuver) {
      case "turn-right":
        return <MaterialIcon name="turn-right" size={28} color="#fff" />;
      case "turn-slight-right":
        return <MaterialIcon name="turn-slight-right" size={28} color="#fff" />;
      case "turn-sharp-right":
        return <MaterialIcon name="turn-sharp-right" size={28} color="#fff" />;
      case "turn-left":
        return <MaterialIcon name="turn-left" size={28} color="#fff" />;
      case "turn-slight-left":
        return <MaterialIcon name="turn-slight-left" size={28} color="#fff" />;
      case "turn-sharp-left":
        return <MaterialIcon name="turn-sharp-left" size={28} color="#fff" />;
      case "roundabout-right":
      case "roundabout-left":
        return <MaterialIcon name="rotate-right" size={28} color="#fff" />;
      case "uturn-right":
      case "uturn-left":
        return <MaterialIcon name="u-turn-right" size={28} color="#fff" />;
      case "ramp-right":
      case "ramp-left":
        return <MaterialIcon name="turn-slight-right" size={28} color="#fff" />;
      case "merge":
        return <MaterialIcon name="merge-type" size={28} color="#fff" />;
      case "fork-right":
      case "fork-left":
        return <FontAwesome name="code-fork" size={28} color="#fff" />;
      case "straight":
        return <MaterialIcon name="arrow-upward" size={28} color="#fff" />;
      default:
        return <MaterialIcon name="directions" size={28} color="#fff" />;
    }
  };

  // Updated function to speak navigation instructions using queue
  const speakInstruction = useCallback(
    (instruction) => {
      if (!soundEnabled) return;

      // Only add to queue if the instruction isn't already queued
      if (!speechQueue.includes(instruction)) {
        setSpeechQueue((prev) => [...prev, instruction]);
      }
    },
    [soundEnabled, speechQueue]
  );

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

  const onStartJourney = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      setShowCard(false);
      setShowDiscoveredCard(false);
      setJourneyStarted(true);
      setShowDetailsCard(true);
      setDestinationReached(false);
      setDestinationSaved(false); // Reset saved state when starting a new journey
      setNavigationVisible(true); // Show navigation panel when journey starts

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

  const handleSwipeOff = () => {
    setShowDetailsCard(false);
    setShowArrow(true);
  };

  const handleArrowPress = () => {
    setShowArrow(false);
    setShowDetailsCard(true);
  };

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

  // Function to show in-app notification
  const showInAppNotification = (place) => {
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
  const sendPushNotification = async (place) => {
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
  const handleNotificationResponse = (place) => {
    // If user taps notification, select the place
    handlePlaceSelection(place);
    dismissNotification();
  };

  // Custom function to handle place selection (extracted from handleMarkerPress)
  const handlePlaceSelection = async (place) => {
    if (!userLocation && !region) {
      Alert.alert("Location Error", "Unable to determine your current location.");
      return;
    }

    // Set the selected place
    setSelectedPlace(place);

    try {
      // Check if this place is already visited and fetch details if necessary
      const isVisited = await isPlaceVisited(place.place_id);

      if (isVisited) {
        console.log("Selected place has been discovered:", place.name);

        // Fetch the visited place details from the controller
        const visitedDetails = await getVisitedPlaceDetails(place.place_id);

        if (visitedDetails) {
          // Store the full details for use in the DiscoveredCard
          setVisitedPlaceDetails(visitedDetails);
          setShowDiscoveredCard(true);

          // Still get route info for reference
          await getRouteInfo(place);
          return;
        }
      }

      // If we get here, place is not visited or we couldn't get details
      // Show the regular card based on standard isVisited flag
      if (place.isVisited === true) {
        setShowDiscoveredCard(true);
      } else {
        setShowCard(true);
      }

      // Always get route information
      await getRouteInfo(place);
    } catch (error) {
      console.error("Error in place selection:", error);
      Alert.alert("Error", "There was a problem processing this place.");
    }
  };

  // Helper function to get route information
  const getRouteInfo = async (place) => {
    try {
      const origin = `${userLocation?.latitude || region?.latitude},${
        userLocation?.longitude || region?.longitude
      }`;
      const destination = `${place.geometry.location.lat},${place.geometry.location.lng}`;

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
          setTravelMode("driving" as TravelMode);
        } else {
          setTravelMode(routeTravelMode as TravelMode);
        }

        // Force route recalculation by updating the key
        setRouteKey((prev) => prev + 1);

        return true;
      } else {
        console.warn("Could not calculate a route to this destination.");
        return false;
      }
    } catch (error) {
      console.error("Error getting route:", error);
      return false;
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

      // Clean up speech when component unmounts
      Speech.stop();
      setSpeechQueue([]);
    };
  }, []);

  //Handlers for discovered card
  const handleDismissDiscoveredCard = () => {
    setShowDiscoveredCard(false);
    setSelectedPlace(null);
    setVisitedPlaceDetails(null);
  };

  const handleViewDiscoveredDetails = () => {
    setShowDiscoveredCard(false);
    // Here you can implement navigation to a detailed view
    console.log("View details for:", selectedPlace?.name);
  };

  // Updated navigation instructions based on user location with cooldown and throttling
  useEffect(() => {
    if (!userLocation || !journeyStarted || navigationSteps.length === 0) return;

    // Find the closest upcoming step
    let minDistance = Infinity;
    let closestStepIndex = stepIndex;

    // Only check from current step index onwards to avoid going backwards
    for (let i = stepIndex; i < navigationSteps.length; i++) {
      const step = navigationSteps[i];
      const distanceToStep = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        step.endLocation.latitude,
        step.endLocation.longitude
      );

      if (distanceToStep < minDistance) {
        minDistance = distanceToStep;
        closestStepIndex = i;
      }
    }

    // Get current time to enforce cooldown
    const now = Date.now();
    const timeSinceLastAnnouncement = now - lastAnnouncementTime;
    const canAnnounce = timeSinceLastAnnouncement > ANNOUNCEMENT_COOLDOWN;

    // Calculate how far user has moved since last announcement
    let distanceMoved = Infinity;
    if (lastAnnouncedPosition) {
      distanceMoved = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        lastAnnouncedPosition.latitude,
        lastAnnouncedPosition.longitude
      );
    }

    // Only allow announcements if user has moved at least 10 meters
    const hasMovedEnough = distanceMoved > 10;

    // Moving to a new step - announce only once when we first detect the step change
    if (closestStepIndex > stepIndex) {
      setCurrentStep(navigationSteps[closestStepIndex]);
      setStepIndex(closestStepIndex);

      // Speak only when moving to a new step AND we haven't announced it yet
      if (closestStepIndex !== lastAnnouncedStep && canAnnounce) {
        console.log(`Speaking new instruction for step ${closestStepIndex}`);
        speakInstruction(navigationSteps[closestStepIndex].instructions);
        setLastAnnouncedStep(closestStepIndex);
        setLastAnnouncementTime(now);
        // Store position where announcement was made
        setLastAnnouncedPosition({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        });
      }
    }
    // First announcement only happens once at the beginning
    else if (stepIndex === 0 && lastAnnouncedStep === -1 && canAnnounce) {
      // This is the very first announcement for the initial step
      speakInstruction(`Starting navigation. ${navigationSteps[0].instructions}`);
      setLastAnnouncedStep(0);
      setLastAnnouncementTime(now);
      // Store position where announcement was made
      setLastAnnouncedPosition({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });
    }

    // Update the distance to the next maneuver
    if (closestStepIndex < navigationSteps.length) {
      const distanceToNextStep = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        navigationSteps[closestStepIndex].endLocation.latitude,
        navigationSteps[closestStepIndex].endLocation.longitude
      );

      // Format the distance for display
      if (distanceToNextStep > 1000) {
        setNextStepDistance(`${(distanceToNextStep / 1000).toFixed(1)} km`);
      } else {
        setNextStepDistance(`${Math.round(distanceToNextStep)} m`);
      }

      // Only announce "approaching" when:
      // 1. We're in the right distance range
      // 2. We're still on the same step to avoid duplication
      // 3. Enough time has passed
      // 4. User has moved at least 10 meters since last announcement
      if (
        distanceToNextStep < 50 &&
        distanceToNextStep > 20 &&
        closestStepIndex === lastAnnouncedStep &&
        canAnnounce &&
        hasMovedEnough
      ) {
        speakInstruction(
          `In ${Math.round(distanceToNextStep)} meters, ${
            navigationSteps[closestStepIndex].instructions
          }`
        );
        setLastAnnouncementTime(now);
        // Store position where announcement was made
        setLastAnnouncedPosition({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        });
      }
    }
  }, [
    userLocation,
    journeyStarted,
    navigationSteps,
    stepIndex,
    lastAnnouncedStep,
    lastAnnouncementTime,
    lastAnnouncedPosition,
    speakInstruction,
  ]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Only display the selected place marker if journey is started
  const markersToDisplay = journeyStarted && selectedPlace ? [selectedPlace] : places;

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
          // Throttle location updates
          setLocationUpdateCounter((prev) => (prev + 1) % LOCATION_UPDATE_THROTTLE);
          if (locationUpdateCounter !== 0) return;

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
        {/* {places
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
          ))} */}

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

                // Parse and set the navigation steps
                const steps = parseRouteInstructions(result);
                setNavigationSteps(steps);

                // Initialize with the first step
                if (steps.length > 0) {
                  setCurrentStep(steps[0]);
                  setStepIndex(0);
                }

                console.log(`Route loaded with ${steps.length} navigation steps`);
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
          rating={selectedPlace.rating}
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
      {showDiscoveredCard && selectedPlace && (
        <DiscoveredCard
          onVisitAgain={onStartJourney}
          placeName={visitedPlaceDetails.name}
          placeDescription={visitedPlaceDetails.description || "A place you've already discovered."}
          placeImage={
            visitedPlaceDetails.photos && visitedPlaceDetails.photos.length > 0
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${selectedPlace.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`
              : undefined
          }
          discoveryDate={visitedPlaceDetails.visitedAt}
          rating={visitedPlaceDetails.rating}
          description={visitedPlaceDetails.description}
          onViewDetails={handleViewDiscoveredDetails}
          onDismiss={handleDismissDiscoveredCard}
          visible={showDiscoveredCard}
        />
      )}

      {journeyStarted && selectedPlace && travelTime && distance && showDetailsCard && (
        <DetailsCard
          placeName={selectedPlace.name}
          travelTime={travelTime}
          distance={distance}
          travelMode={travelMode}
          onSwipeOff={handleSwipeOff}
          onInfoPress={() => {
            Alert.alert(
              "Route Information",
              `This route uses ${travelMode} mode because the destination is ${
                travelMode === "driving" ? "over" : "under"
              } 5km away. Travel time: ${travelTime}, Distance: ${distance}`
            );
          }}
          // Add navigation properties:
          currentStep={currentStep}
          nextStepDistance={nextStepDistance}
          navigationSteps={navigationSteps}
          stepIndex={stepIndex}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          getManeuverIcon={getManeuverIcon}
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
            onPress={() => {
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
              );

              // Reset navigation state
              setNavigationSteps([]);
              setCurrentStep(null);
              setStepIndex(0);
              setLastAnnouncedStep(-1);
              setNavigationVisible(true);

              // Clear speech queue and stop any speaking
              setSpeechQueue([]);
              setIsSpeaking(false);
              Speech.stop();
            }}
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

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ListRenderItem,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import {
  fetchNearbyPlaces,
  clearPlacesCache,
  fetchPlaceDetailsOnDemand,
  getCacheStats,
} from "../controllers/Map/placesController";
import {
  getCurrentLocation,
  getNearbyPlacesState,
  onPlacesUpdate,
  globalPlacesState,
  updateNearbyPlaces,
} from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";
import { getPlaceCardImageUrl } from "../utils/mapImageUtils";
import { formatDistanceToNow } from "date-fns";
import Header from "../components/Global/Header";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Place, NearbyPlacesResponse, VisitedPlaceDetails, Region } from "../types/MapTypes";
import MapLoading from "../components/Map/MapLoading";
import NetInfo from "@react-native-community/netinfo";

const { width } = Dimensions.get("window");
const GRID_CARD_WIDTH = (width - 48) / 2;

type RootStackParamList = {
  ViewAll: { viewType?: ViewType; preloadedPlaces?: (Place | VisitedPlaceDetails)[] };
  PlaceDetails: { placeId: string; place?: Place | VisitedPlaceDetails };
  Explore: undefined;
};

type ViewAllScreenRouteProp = RouteProp<RootStackParamList, "ViewAll">;
type ViewAllScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type ViewType = "nearbyPlaces" | "myPlaces";

interface HeaderConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

interface ViewAllScreenProps {
  route: ViewAllScreenRouteProp;
  navigation: ViewAllScreenNavigationProp;
}

const ViewAllScreen: React.FC<ViewAllScreenProps> = ({ route, navigation }) => {
  const { viewType = "nearbyPlaces" } = route.params || {};
  const [places, setPlaces] = useState<(Place | VisitedPlaceDetails)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const ignoreSubscriptionUpdates = useRef<boolean>(false);
  const isInitialized = useRef(false);
  const placesSubscriptionRef = useRef<(() => void) | null>(null);

  const headerConfig: Record<ViewType, HeaderConfig> = {
    myPlaces: {
      title: "My Places",
      subtitle: "Places you've visited",
      icon: "bookmark",
      color: Colors.primary,
    },
    nearbyPlaces: {
      title: "Nearby Places",
      subtitle: "Discover attractions around you",
      icon: "location",
      color: Colors.primary,
    },
  };

  const currentHeaderConfig = headerConfig[viewType] || headerConfig.nearbyPlaces;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      console.log(
        `[ViewAllScreen] Network status changed: ${connected ? "connected" : "disconnected"}`
      );
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const initializeComponent = async () => {
      if (viewType === "nearbyPlaces") {
        const placesState = getNearbyPlacesState();
        if (placesState.hasPreloaded && placesState.places && placesState.places.length > 0) {
          console.log(`[ViewAllScreen] Using ${placesState.places.length} preloaded places`);
          setPlaces(placesState.places);
          setLoading(false);
          isInitialized.current = true;
        } else {
          console.log("[ViewAllScreen] No preloaded places, need to fetch");
          await fetchData(false);
        }
      } else {
        await fetchVisitedPlacesFromFirestore();
      }

      isInitialized.current = true;
    };

    initializeComponent();

    return () => {
      if (placesSubscriptionRef.current) {
        placesSubscriptionRef.current();
        placesSubscriptionRef.current = null;
      }
    };
  }, [viewType]);

  useEffect(() => {
    if (viewType !== "nearbyPlaces") return;
    if (placesSubscriptionRef.current) {
      placesSubscriptionRef.current();
      placesSubscriptionRef.current = null;
    }
    const unsubscribe = onPlacesUpdate((placesState) => {
      if (ignoreSubscriptionUpdates.current) {
        console.log("[ViewAllScreen] Ignoring subscription update");
        return;
      }

      if (placesState.hasPreloaded && placesState.places && placesState.places.length > 0) {
        setPlaces(placesState.places);
        setLoading(false);
        console.log(
          `[ViewAllScreen] Updated places from subscription: ${placesState.places.length} places`
        );
      }
    });
    placesSubscriptionRef.current = unsubscribe;
    return () => {
      if (placesSubscriptionRef.current) {
        placesSubscriptionRef.current();
        placesSubscriptionRef.current = null;
      }
    };
  }, [viewType]);

  useFocusEffect(
    useCallback(() => {
      console.log("[ViewAllScreen] Screen focused");

      return () => {
        console.log("[ViewAllScreen] Screen unfocused");
      };
    }, [viewType])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true).finally(() => setRefreshing(false));
  }, []);

  const fetchData = async (forceRefresh: boolean = false): Promise<void> => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);

      if (viewType === "myPlaces") {
        await fetchVisitedPlacesFromFirestore();
      } else {
        const location: Region | null = await getCurrentLocation();
        if (!location) {
          setError("Unable to get your location");
          setLoading(false);
          return;
        }

        console.log(`[ViewAllScreen] Fetching places with params: forceRefresh=${forceRefresh}`);
        try {
          await updateNearbyPlaces(location, forceRefresh);
          console.log("[ViewAllScreen] Called updateNearbyPlaces successfully");
          setTimeout(() => {
            if (loading) {
              const placesState = getNearbyPlacesState();
              if (placesState.places && placesState.places.length > 0) {
                setPlaces(placesState.places);
              }
              setLoading(false);
            }
          }, 1000);
        } catch (apiError) {
          console.error("[ViewAllScreen] Error in updateNearbyPlaces:", apiError);
          console.log("[ViewAllScreen] Falling back to direct fetchNearbyPlaces");
          const { places: nearbyPlaces }: NearbyPlacesResponse = await fetchNearbyPlaces(
            location.latitude,
            location.longitude,
            forceRefresh
          );

          console.log(`[ViewAllScreen] Fetched ${nearbyPlaces?.length || 0} places directly`);
          setPlaces(nearbyPlaces || []);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("[ViewAllScreen] Error fetching places:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const fetchVisitedPlacesFromFirestore = async (): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("[ViewAllScreen] No authenticated user found");
        setPlaces([]);
        setLoading(false);
        return;
      }
      const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const querySnapshot = await getDocs(userVisitedPlacesRef);

      if (querySnapshot.empty) {
        console.log("[ViewAllScreen] No saved places found in Firestore");
        setPlaces([]);
      } else {
        const userPlacesData = querySnapshot.docs
          .filter((doc) => {
            const data = doc.data();
            return !data._isInitDocument && data.name;
          })
          .map((doc) => {
            const data = doc.data();

            return {
              id: doc.id,
              place_id: data.place_id || doc.id,
              name: data.name || "Unknown Place",
              vicinity: data.vicinity || "",
              description: data.description || "",
              geometry: data.geometry || {
                location: { lat: 0, lng: 0 },
              },
              photos: data.photos || [],
              rating: data.rating || null,
              user_ratings_total: data.user_ratings_total || null,
              price_level: data.price_level || null,
              visitedAt: data.visitedAt || null,
              isVisited: true,
              website: data.website || null,
              url: data.url || null,
              formatted_phone_number: data.formatted_phone_number || null,
              opening_hours: data.opening_hours || null,
              icon: data.icon || null,
              types: data.types || [],
            } as VisitedPlaceDetails;
          });

        console.log(`[ViewAllScreen] Found ${userPlacesData.length} places in Firestore`);
        setPlaces(userPlacesData);
      }
    } catch (error) {
      console.error("[ViewAllScreen] Error fetching visited places from Firestore:", error);
      setError("Failed to load your visited places");
    } finally {
      setLoading(false);
    }
  };

  const navigateToPlaceDetails = async (placeId: string): Promise<void> => {
    try {
      const placeObject = places.find((place) => place.place_id === placeId);

      if (!placeObject) {
        console.error("[ViewAllScreen] Place not found for navigation:", placeId);
        Alert.alert("Error", "Could not find place details");
        return;
      }

      if (isConnected && !placeObject.hasFullDetails && viewType === "nearbyPlaces") {
        try {
          console.log(
            `[ViewAllScreen] Fetching full details for ${placeObject.name} before navigation`
          );
          const detailedPlace = await fetchPlaceDetailsOnDemand(placeId);

          if (detailedPlace) {
            console.log(`[ViewAllScreen] Got full details for ${detailedPlace.name}, navigating`);
            navigation.navigate("PlaceDetails", {
              placeId,
              place: detailedPlace,
            });
            return;
          }
        } catch (error) {
          console.error("[ViewAllScreen] Error fetching place details:", error);
        }
      }

      navigation.navigate("PlaceDetails", {
        placeId,
        place: placeObject,
      });
    } catch (error) {
      console.error("[ViewAllScreen] Error during navigation:", error);
      Alert.alert("Navigation Error", "Could not navigate to place details");
    }
  };

  const formatVisitDate = (dateString?: string): string => {
    if (!dateString) return "Visited recently";

    try {
      const visitDate = new Date(dateString);
      return `Visited ${formatDistanceToNow(visitDate, { addSuffix: true })}`;
    } catch (error) {
      return "Visited recently";
    }
  };

  const renderGridItem: ListRenderItem<Place | VisitedPlaceDetails> = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.gridCard}
        onPress={() => navigateToPlaceDetails(item.place_id)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getPlaceCardImageUrl(item, GRID_CARD_WIDTH, GRID_CARD_WIDTH * 1.2) }}
          style={styles.gridImage}
        />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.placeName} numberOfLines={2}>
            {item.name || "Unknown Place"}
          </Text>
          {item.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
          {item.isVisited && (
            <View style={styles.visitedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={styles.visitedText}>Visited</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderListItem: ListRenderItem<Place | VisitedPlaceDetails> = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => navigateToPlaceDetails(item.place_id)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getPlaceCardImageUrl(item, width - 32, 180) }}
          style={styles.listImage}
        />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.cardGradient} />
        <View style={styles.cardContent}>
          <Text style={styles.placeName}>{item.name || "Unknown Place"}</Text>
          <View style={styles.placeInfo}>
            <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.placeVicinity} numberOfLines={1}>
              {item.vicinity || "Unknown location"}
            </Text>
          </View>
          <View style={styles.visitDateContainer}>
            <Ionicons name="time-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.visitDateText}>{formatVisitDate(item.visitedAt)}</Text>
          </View>
        </View>
        {item.rating && (
          <View style={styles.ratingContainerList}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (): React.ReactNode => {
    if (viewType === "myPlaces") {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Places Visited Yet</Text>
          <Text style={styles.emptyText}>
            Your visited places will appear here. Start exploring to add places to your collection!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate("Explore")}
          >
            <Text style={styles.exploreButtonText}>Explore Nearby Places</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Nearby Places Found</Text>
          <Text style={styles.emptyText}>
            We couldn't find any tourist attractions nearby. Try again later or in a different
            location.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.headerContainer}>
        <Header
          title={currentHeaderConfig.title}
          subtitle={currentHeaderConfig.subtitle}
          showIcon={false}
          iconName={currentHeaderConfig.icon}
          iconColor={currentHeaderConfig.color}
          showBackButton={true}
          showHelp={false}
          onHelpPress={() => {}}
          onBackPress={() => navigation.goBack()}
        />
      </View>
      {!isConnected && (
        <View style={styles.networkStatusContainer}>
          <Text style={styles.networkStatusText}>Offline Mode</Text>
        </View>
      )}
      {loading ? (
        <MapLoading />
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 ? (
        renderEmptyState()
      ) : viewType === "nearbyPlaces" ? (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id || item.id || Math.random().toString()}
          renderItem={renderGridItem}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListHeaderComponent={
            debugInfo ? (
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>{debugInfo}</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id || item.id || Math.random().toString()}
          renderItem={renderListItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingTop:
      Platform.OS === "ios"
        ? Platform.select({
            ios: Math.max(StatusBar.currentHeight || 0, 10),
            default: 0,
          })
        : StatusBar.currentHeight || 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
  headerRightContainer: {
    flexDirection: "row",
  },
  headerButton: {
    marginLeft: 8,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  networkStatusContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: "center",
  },
  networkStatusText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "500",
  },

  debugContainer: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  gridContent: {
    padding: 16,
    paddingBottom: 80,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_WIDTH * 1.2,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: NeutralColors.gray400,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  listCard: {
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: NeutralColors.gray400,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  placeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  placeVicinity: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    flex: 1,
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  visitDateText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  ratingContainerList: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 3,
  },
  visitedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitedText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: NeutralColors.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default ViewAllScreen;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { SearchBar } from "../components/Global/SearchBar";
import { fetchNearbyPlaces } from "../controllers/Map/placesController";
import { getCurrentLocation } from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";
import PlacesCarousel from "../components/Places/PlacesCarousel";

const ExploreScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [myPlaces, setMyPlaces] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMyPlaces, setLoadingMyPlaces] = useState(true);
  const [error, setError] = useState(null);
  const [noPlacesFound, setNoPlacesFound] = useState(false);
  const [noMyPlacesFound, setNoMyPlacesFound] = useState(false);

  useEffect(() => {
    fetchNearbyData();
    fetchUserPlacesFromFirestore();
  }, []);

  const fetchNearbyData = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoPlacesFound(false);

      // Get user's current location
      const location = await getCurrentLocation();
      if (!location) {
        setError("Unable to get your location");
        setLoading(false);
        return;
      }

      // Fetch nearby places using the updated Places API
      const { places, furthestDistance } = await fetchNearbyPlaces(
        location.latitude,
        location.longitude
      );

      if (!places || places.length === 0) {
        // No places found, display the empty state card
        setNoPlacesFound(true);
        setNearbyPlaces([]);
      } else {
        setNearbyPlaces(places);
        setNoPlacesFound(false);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching nearby data:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const fetchUserPlacesFromFirestore = async () => {
    try {
      setLoadingMyPlaces(true);
      setNoMyPlacesFound(false);

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        setNoMyPlacesFound(true);
        setLoadingMyPlaces(false);
        return;
      }

      // visitedPlaces is a subcollection under the user document
      const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const querySnapshot = await getDocs(userVisitedPlacesRef);

      if (querySnapshot.empty) {
        console.log("No saved places found in Firestore");
        setNoMyPlacesFound(true);
        setMyPlaces([]);
      } else {
        // Transform Firestore documents to place objects
        const userPlacesData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          // Include ALL properties including rating
          return {
            ...data, // Keep all original properties
            id: doc.id,
            place_id: data.place_id,
            name: data.name,
            vicinity: data.vicinity || "",
            description: data.description || "",
            geometry: data.geometry,
            photos: data.photos || [],
            // Make sure rating info is included
            rating: data.rating || null,
            user_ratings_total: data.user_ratings_total || null,
            // Date formatting
            visitedAt: data.visitedAt,
            visitDate: data.visitedAt ? new Date(data.visitedAt) : new Date(),
          };
        });

        console.log(`Found ${userPlacesData.length} places in Firestore`);
        // Debug: Log the first place to check if rating is present
        if (userPlacesData.length > 0) {
          console.log("Sample place data:", {
            name: userPlacesData[0].name,
            rating: userPlacesData[0].rating,
          });
        }

        setMyPlaces(userPlacesData);
        setNoMyPlacesFound(false);
      }

      setLoadingMyPlaces(false);
    } catch (error) {
      console.error("Error fetching user places from Firestore:", error);
      setNoMyPlacesFound(true);
      setLoadingMyPlaces(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim() === "") return;
    navigation.navigate("Search", { initialQuery: searchQuery });
  };

  const navigateToViewAll = (type) => {
    navigation.navigate("ViewAll", { viewType: type });
  };

  const navigateToPlaceDetails = (placeId) => {
    navigation.navigate("Place", { placeId });
  };

  const navigateToDiscover = () => {
    navigation.navigate("Discover");
  };

  // Enhanced empty state component with better visuals
  const renderEmptyState = (
    message,
    icon = "location-outline",
    buttonAction = navigateToDiscover,
    buttonText = "Discover New Places"
  ) => {
    return (
      <View style={styles.emptyStateCard}>
        {/* Background decoration */}
        <View style={styles.emptyStateDecoration}>
          <View style={[styles.decorationCircle, styles.circle1]} />
          <View style={[styles.decorationCircle, styles.circle2]} />
          <View style={[styles.decorationCircle, styles.circle3]} />
        </View>

        <View style={styles.emptyStateContent}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name={icon} size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>No Places Found</Text>
          <Text style={styles.emptyStateMessage}>{message}</Text>

          <TouchableOpacity style={styles.emptyStateButton} onPress={buttonAction}>
            <Text style={styles.emptyStateButtonText}>{buttonText}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNoPlacesCard = () => {
    return (
      <View style={styles.sectionContainer}>
        {renderEmptyState(
          "Sorry, we couldn't find any tourist attractions nearby. Try exploring a different area or searching for specific places.",
          "compass-outline"
        )}
      </View>
    );
  };

  const renderMyPlacesSection = () => {
    if (loadingMyPlaces) {
      return (
        <View style={[styles.loadingContainer, { height: 180 }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your places...</Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Places</Text>
          {myPlaces.length > 0 && (
            <TouchableOpacity onPress={() => navigateToViewAll("myPlaces")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {noMyPlacesFound || myPlaces.length === 0 ? (
          renderEmptyState(
            "You haven't discovered any places yet. Start your journey by exploring new destinations!",
            "footsteps-outline",
            navigateToDiscover,
            "Start Exploring"
          )
        ) : (
          <PlacesCarousel places={myPlaces} onPlacePress={navigateToPlaceDetails} />
        )}
      </>
    );
  };

  const renderNearbyPlacesSection = () => {
    if (loading) {
      return (
        <View style={[styles.loadingContainer, { height: 180 }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding places nearby...</Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Places</Text>
          {nearbyPlaces.length > 0 && (
            <TouchableOpacity onPress={() => navigateToViewAll("nearbyPlaces")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {noPlacesFound || nearbyPlaces.length === 0 ? (
          renderEmptyState(
            "No tourist attractions found nearby. Try exploring a different area.",
            "compass-outline",
            () => {
              // Add a way to refresh by pulling down or show a refresh button
              fetchNearbyData();
            },
            "Try Again"
          )
        ) : (
          <PlacesCarousel places={nearbyPlaces} onPlacePress={navigateToPlaceDetails} />
        )}
      </>
    );
  };

  const renderContent = () => {
    // Show only the loading state when both are loading
    if (loading && loadingMyPlaces) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      );
    }

    // Show error screen if fetching fails
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchNearbyData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If both sections have no content, show a consolidated empty state
    if (noPlacesFound && noMyPlacesFound && !loading && !loadingMyPlaces) {
      return renderNoPlacesCard();
    }

    // Otherwise, show both sections (either with content or individual empty states)
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* My Places Section */}
        <View style={styles.sectionContainer}>{renderMyPlacesSection()}</View>

        {/* Nearby Places Section */}
        <View style={styles.sectionContainer}>{renderNearbyPlacesSection()}</View>
      </ScrollView>
    );
  };

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.container}>
        <Header title="Places" />

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} onSearch={handleSearch} />
        </View>

        {renderContent()}
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: NeutralColors.white,
    fontWeight: "bold",
  },
  sectionContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: NeutralColors.black,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Enhanced empty state styles
  emptyStateCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    position: "relative",
    minHeight: 200,
  },
  emptyStateDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorationCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  circle1: {
    width: 120,
    height: 120,
    top: -60,
    right: -30,
    opacity: 0.05,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: 20,
    opacity: 0.03,
  },
  circle3: {
    width: 40,
    height: 40,
    top: 40,
    left: 30,
    opacity: 0.07,
  },
  emptyStateContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  emptyStateIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
  },
});

export default ExploreScreen;

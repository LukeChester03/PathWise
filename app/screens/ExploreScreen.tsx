import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import { SearchBar } from "../components/Global/SearchBar";
import { fetchNearbyPlaces } from "../controllers/Map/placesController";
import { getCurrentLocation } from "../controllers/Map/locationController";
import { Colors, NeutralColors } from "../constants/colours";
import PlacesCarousel from "../components/Places/PlacesCarousel";
import GettingStartedModal from "../components/Places/GettingStartedModal";

const { width } = Dimensions.get("window");

const ExploreScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [helpModalVisible, setHelpModalVisible] = useState(false);
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
            // Date formatting
            visitedAt: data.visitedAt,
            visitDate: data.visitedAt ? new Date(data.visitedAt) : new Date(),
          };
        });

        console.log(`Found ${userPlacesData.length} places in Firestore`);
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
        <LinearGradient
          colors={["rgba(255,255,255,0.5)", "rgba(240,240,255,0.8)"]}
          style={styles.emptyStateGradient}
        />

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
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.emptyStateButtonText}>{buttonText}</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLoadingState = (message, height = 220) => {
    return (
      <View style={[styles.shimmerContainer, { height }]}>
        <View style={styles.shimmerContent}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    );
  };

  const renderMyPlacesSection = () => {
    if (loadingMyPlaces) {
      return renderLoadingState("Loading your places...");
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="bookmark" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>My Places</Text>
          </View>
          {myPlaces.length > 0 && (
            <TouchableOpacity
              onPress={() => navigateToViewAll("myPlaces")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
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
      return renderLoadingState("Finding places nearby...");
    }

    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="location" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Nearby Places</Text>
          </View>
          {nearbyPlaces.length > 0 && (
            <TouchableOpacity
              onPress={() => navigateToViewAll("nearbyPlaces")}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {noPlacesFound || nearbyPlaces.length === 0 ? (
          renderEmptyState(
            "No tourist attractions found nearby. Try exploring a different area.",
            "compass-outline",
            () => {
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

  const renderFeaturedSection = () => {
    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="star" size={22} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Popular Destinations</Text>
          </View>
        </View>

        <View style={styles.featuredGrid}>
          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?city" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Cities</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?nature" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Nature</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?beach" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Beaches</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredItem} onPress={navigateToDiscover}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/?mountain" }}
              style={styles.featuredImage}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              style={styles.featuredGradient}
            >
              <Text style={styles.featuredTitle}>Mountains</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    // If both sections have no content, show a consolidated empty state
    if (noPlacesFound && noMyPlacesFound && !loading && !loadingMyPlaces) {
      return (
        <View style={styles.sectionContainer}>
          {renderEmptyState(
            "We couldn't find any places to show. Try exploring a different area or search for specific places.",
            "compass-outline"
          )}
        </View>
      );
    }

    // Otherwise, show both sections (either with content or individual empty states)
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* My Places Section */}
        <View style={styles.sectionContainer}>{renderMyPlacesSection()}</View>

        {/* Nearby Places Section */}
        <View style={styles.sectionContainer}>{renderNearbyPlacesSection()}</View>

        {/* Featured Destinations Section */}
        <View style={styles.sectionContainer}>{renderFeaturedSection()}</View>
      </ScrollView>
    );
  };

  // Create a right component for the header with notification icon
  const headerRightComponent = (
    <TouchableOpacity style={styles.notificationButton}>
      <View style={styles.notificationIconContainer}>
        <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
        <View style={styles.notificationBadge} />
      </View>
    </TouchableOpacity>
  );

  const handleHelpPress = () => {
    setHelpModalVisible(true);
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container}>
        {/* Enhanced Header with subtitle and icon */}
        <Header
          title="Places"
          subtitle="Discover new places around you"
          showIcon={true}
          iconName="compass"
          iconColor={Colors.primary}
          rightComponent={headerRightComponent}
          customStyles={styles.headerCustomStyles}
          onHelpPress={handleHelpPress}
        />

        {/* Getting Started Modal */}
        <GettingStartedModal
          visible={helpModalVisible}
          onClose={() => setHelpModalVisible(false)}
        />

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
  headerCustomStyles: {
    marginBottom: 0,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    zIndex: 5,
  },
  notificationButton: {
    padding: 8,
  },
  notificationIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
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
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shimmerContainer: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    overflow: "hidden",
    marginBottom: 8,
  },
  shimmerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
    maxWidth: "80%",
  },
  retryButton: {
    marginTop: 20,
    overflow: "hidden",
    borderRadius: 10,
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: NeutralColors.white,
    fontWeight: "600",
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
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
    marginRight: 2,
  },

  // Featured grid
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featuredItem: {
    width: (width - 40) / 2,
    height: 120,
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "flex-end",
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  featuredTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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
    minHeight: 220,
  },
  emptyStateGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    overflow: "hidden",
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
  },
});

export default ExploreScreen;

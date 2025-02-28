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
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
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
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's current location
      const location = await getCurrentLocation();
      if (!location) {
        setError("Unable to get your location");
        setLoading(false);
        return;
      }

      // Fetch nearby places using the Google Places API
      const places = await fetchNearbyPlaces(location.latitude, location.longitude);
      setNearbyPlaces(places || []);

      // In a real app, you would fetch the user's visited places from your backend
      // For now, we'll use some of the places as mock data
      const mockMyPlaces = places ? places.slice(0, 4) : [];
      setMyPlaces(mockMyPlaces);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Something went wrong");
      setLoading(false);
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

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* My Places Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Places</Text>
            <TouchableOpacity onPress={() => navigateToViewAll("ViewAll")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {myPlaces.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="location-outline" size={50} color="#ccc" />
              <Text style={styles.emptyStateText}>You haven't visited any places yet</Text>
            </View>
          ) : (
            <PlacesCarousel places={myPlaces} onPlacePress={navigateToPlaceDetails} />
          )}
        </View>

        {/* Nearby Places Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Places</Text>
            <TouchableOpacity onPress={() => navigateToViewAll("nearbyPlaces")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {nearbyPlaces.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="location-outline" size={50} color="#ccc" />
              <Text style={styles.emptyStateText}>No nearby places found</Text>
            </View>
          ) : (
            <PlacesCarousel places={nearbyPlaces} onPlacePress={navigateToPlaceDetails} />
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Places</Text>
        </View>

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
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: NeutralColors.black,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
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
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
    borderRadius: 12,
    backgroundColor: NeutralColors.gray400,
    marginHorizontal: 16,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: NeutralColors.gray500,
    textAlign: "center",
  },
});

export default ExploreScreen;

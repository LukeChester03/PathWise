// components/Home/DiscoveredLocationsSection.js
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const LOCATION_CARD_WIDTH = width * 0.4;
const SPACING = 12;

const DiscoveredLocationsSection = ({ navigateToScreen }) => {
  const [discoveredLocations, setDiscoveredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const locationsScrollX = useRef(new Animated.Value(0)).current;
  const locationsListRef = useRef(null);

  useEffect(() => {
    fetchUserDiscoveredLocations();
  }, []);

  // Function to fetch user's discovered locations from database
  const fetchUserDiscoveredLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      // This would be your actual database fetch
      // For now, we'll simulate a database call with a timeout
      setTimeout(() => {
        // For testing: set to empty array to see empty state
        // Or fill with data to see populated state
        const data = []; // Empty array for demonstration

        // Uncomment the below line to test with data
        /* 
        const data = [
          {
            id: 1,
            name: "Eiffel Tower",
            city: "Paris",
            image: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?q=80&w=1501&auto=format&fit=crop",
            date: "2 days ago",
          },
          {
            id: 2,
            name: "Colosseum",
            city: "Rome",
            image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1396&auto=format&fit=crop",
            date: "1 week ago",
          },
        ]; 
        */

        setDiscoveredLocations(data);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error("Error fetching discovered locations:", err);
      setError("Unable to load your discovered locations");
      setLoading(false);
    }
  };

  const onLocationsScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: locationsScrollX } } }],
    {
      useNativeDriver: false,
    }
  );

  const renderLocationCard = ({ item, index }) => {
    // For the "View All" card at the end
    if (item.id === "ViewAll") {
      return (
        <TouchableOpacity
          style={styles.viewAllCard}
          onPress={() => navigateToScreen("Explore")}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#d03f74", "#ff1493"]}
            style={styles.viewAllGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.viewAllContent}>
              <Ionicons name="grid" size={32} color="#fff" />
              <Text style={styles.viewAllText}>View All</Text>
              <Text style={styles.viewAllSubtext}>
                See all {discoveredLocations.length} discovered places
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.locationCard}
        onPress={() => navigateToScreen("Explore")}
        activeOpacity={0.9}
      >
        <Image source={{ uri: item.image }} style={styles.locationImage} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.locationGradient}
        />
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <View style={styles.locationMeta}>
            <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.locationCity}>{item.city}</Text>
          </View>
          <View style={styles.locationDate}>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Ultra-modern empty state component
  const renderEmptyState = () => {
    return (
      <TouchableOpacity
        style={styles.emptyStateCard}
        onPress={() => navigateToScreen("Discover")}
        activeOpacity={0.9}
      >
        {/* Background circles */}
        <View style={[styles.backgroundCircle, styles.circle1]} />
        <View style={[styles.backgroundCircle, styles.circle2]} />
        <View style={[styles.backgroundCircle, styles.circle3]} />
        <View style={[styles.backgroundCircle, styles.circle4]} />

        <View style={styles.emptyStateContent}>
          <View style={styles.leftContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="compass" size={22} color="#fff" />
            </View>
          </View>

          <View style={styles.middleContainer}>
            <Text style={styles.emptyStateTitle}>Start your journey</Text>
            <Text style={styles.emptyStateText}>Discover new places</Text>
          </View>

          <View style={styles.rightContainer}>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={18} color="#d03f74" />
            </View>
          </View>
        </View>

        {/* "Click to explore" text at the bottom */}
        <View style={styles.clickPromptContainer}>
          <View style={styles.clickPromptLine} />
          <Text style={styles.clickPromptText}>tap to explore</Text>
          <View style={styles.clickPromptLine} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#d03f74" />
          <Text style={styles.loadingText}>Loading your places...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color="#d03f74" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchUserDiscoveredLocations} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (discoveredLocations.length === 0) {
      return renderEmptyState();
    }

    const dataWithViewAll = [...discoveredLocations, { id: "ViewAll" }];

    return (
      <Animated.FlatList
        ref={locationsListRef}
        data={dataWithViewAll}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLocationCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.locationsCarousel}
        snapToInterval={LOCATION_CARD_WIDTH + SPACING}
        decelerationRate="fast"
        onScroll={onLocationsScroll}
        scrollEventThrottle={16}
        snapToAlignment="start"
        bounces={true}
      />
    );
  };

  return (
    <View style={styles.locationsContainer}>
      <Text style={styles.sectionTitle}>Discovered Locations</Text>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  locationsContainer: {
    paddingTop: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  locationsCarousel: {
    paddingLeft: SPACING,
    paddingRight: SPACING,
  },
  locationCard: {
    width: LOCATION_CARD_WIDTH,
    height: 180,
    marginRight: SPACING,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  locationImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  locationGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  locationInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  locationMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locationCity: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  locationDate: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  viewAllCard: {
    width: LOCATION_CARD_WIDTH,
    height: 180,
    marginRight: SPACING,
    borderRadius: 16,
    overflow: "hidden",
  },
  viewAllGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllContent: {
    alignItems: "center",
    padding: 16,
  },
  viewAllText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 12,
    marginBottom: 4,
  },
  viewAllSubtext: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    textAlign: "center",
  },

  // Ultra-modern empty state styles
  emptyStateCard: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    position: "relative", // For background circles
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backgroundCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "#d03f74",
  },
  circle1: {
    width: 140,
    height: 140,
    top: -70,
    right: -40,
    opacity: 0.04,
  },
  circle2: {
    width: 90,
    height: 90,
    bottom: -30,
    left: -20,
    opacity: 0.03,
  },
  circle3: {
    width: 40,
    height: 40,
    top: 40,
    left: 30,
    opacity: 0.05,
  },
  circle4: {
    width: 60,
    height: 60,
    top: -20,
    left: 100,
    opacity: 0.02,
  },
  emptyStateContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
    zIndex: 1, // Above the circles
  },
  leftContainer: {
    width: 42,
    justifyContent: "center",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d03f74",
    justifyContent: "center",
    alignItems: "center",
  },
  middleContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    letterSpacing: 0.3,
  },
  rightContainer: {
    width: 40,
    alignItems: "flex-end",
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(208, 63, 116, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  clickPromptContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  clickPromptLine: {
    width: 30,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  clickPromptText: {
    fontSize: 12,
    color: "#999",
    marginHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Loading state styles
  loadingContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },

  // Error state styles
  errorContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 14,
  },
  retryButton: {
    backgroundColor: "#d03f74",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default DiscoveredLocationsSection;

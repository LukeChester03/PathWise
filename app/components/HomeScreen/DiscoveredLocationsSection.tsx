// components/Home/DiscoveredLocationsSection.js
import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const LOCATION_CARD_WIDTH = width * 0.4;
const SPACING = 12;

const DiscoveredLocationsSection = ({ navigateToScreen }) => {
  const locationsScrollX = useRef(new Animated.Value(0)).current;
  const locationsListRef = useRef(null);

  // Hard-coded discovered locations
  const discoveredLocations = [
    {
      id: 1,
      name: "Eiffel Tower",
      city: "Paris",
      image:
        "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?q=80&w=1501&auto=format&fit=crop",
      date: "2 days ago",
    },
    {
      id: 2,
      name: "Colosseum",
      city: "Rome",
      image:
        "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1396&auto=format&fit=crop",
      date: "1 week ago",
    },
    {
      id: 3,
      name: "Big Ben",
      city: "London",
      image:
        "https://images.unsplash.com/photo-1500380804539-4e1e8c1e7118?q=80&w=1450&auto=format&fit=crop",
      date: "2 weeks ago",
    },
    {
      id: 4,
      name: "Sagrada Familia",
      city: "Barcelona",
      image:
        "https://images.unsplash.com/photo-1583779457094-ab6f9164f5e8?q=80&w=1374&auto=format&fit=crop",
      date: "3 weeks ago",
    },
    {
      id: 5,
      name: "Acropolis",
      city: "Athens",
      image:
        "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?q=80&w=1470&auto=format&fit=crop",
      date: "1 month ago",
    },
    {
      id: 6,
      name: "Burj Khalifa",
      city: "Dubai",
      image:
        "https://images.unsplash.com/photo-1582672060674-bc2bd808a8f5?q=80&w=1335&auto=format&fit=crop",
      date: "1 month ago",
    },
  ];

  const onLocationsScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: locationsScrollX } } }],
    {
      useNativeDriver: false,
    }
  );

  const renderLocationCard = ({ item, index }) => {
    // For the "View All" card at the end
    if (index === discoveredLocations.length) {
      return (
        <TouchableOpacity
          style={styles.viewAllCard}
          onPress={() => navigateToScreen("Places")}
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
        onPress={() => navigateToScreen("PlaceDetails")}
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

  return (
    <View style={styles.locationsContainer}>
      <Text style={styles.sectionTitle}>Discovered Locations</Text>

      <Animated.FlatList
        ref={locationsListRef}
        data={[...discoveredLocations, { id: "viewAll" }]}
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
});

export default DiscoveredLocationsSection;

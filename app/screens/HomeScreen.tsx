import React, { useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";
import { SearchBar } from "../components/Global/SearchBar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const LOCATION_CARD_WIDTH = width * 0.4;
const STATS_CARD_WIDTH = width * 0.75;
const SPACING = 12;

const HomeScreen = () => {
  const navigation = useNavigation();
  const userName = "User";
  const scrollX = useRef(new Animated.Value(0)).current;
  const locationsScrollX = useRef(new Animated.Value(0)).current;
  const statsScrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const locationsListRef = useRef(null);
  const statsListRef = useRef(null);

  // Hard-coded user stats
  const userStats = [
    {
      id: 1,
      icon: "map",
      value: 14,
      label: "Places",
      gradientColors: ["#4A90E2", "#5DA9FF"],
    },
    {
      id: 2,
      icon: "earth",
      value: 3,
      label: "Countries",
      gradientColors: ["#FF7043", "#FF8A65"],
    },
    {
      id: 3,
      icon: "flame",
      value: 5,
      label: "Day Streak",
      gradientColors: ["#d03f74", "#ff1493"],
    },
    {
      id: 4,
      icon: "star",
      value: 24,
      label: "Achievements",
      gradientColors: ["#50C878", "#63E08C"],
    },
  ];

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

  const featureCards = [
    {
      id: 1,
      title: "Discover",
      description: "Explore new locations and get guided directions to exciting places around you.",
      icon: "compass",
      screen: "Discover",
      gradientColors: ["#4A90E2", "#5DA9FF"],
    },
    {
      id: 2,
      title: "Learn",
      description:
        "Get AI-powered information tailored to each location, like having a personal tour guide.",
      icon: "sparkles",
      screen: "Learn",
      gradientColors: ["#50C878", "#63E08C"],
    },
    {
      id: 3,
      title: "Places",
      description: "View and collect places you've visited to build your personal travel journal.",
      icon: "location",
      screen: "Places",
      gradientColors: ["#FF7043", "#FF8A65"],
    },
  ];

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
  });

  const onLocationsScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: locationsScrollX } } }],
    {
      useNativeDriver: false,
    }
  );

  const onStatsScroll = Animated.event([{ nativeEvent: { contentOffset: { x: statsScrollX } } }], {
    useNativeDriver: false,
  });

  const renderCard = ({ item, index }) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING * 2),
      index * (CARD_WIDTH + SPACING * 2),
      (index + 1) * (CARD_WIDTH + SPACING * 2),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToScreen(item.screen)}
          activeOpacity={0.95}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardTop}>
              <LinearGradient
                colors={item.gradientColors}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={item.icon} size={28} color="white" />
              </LinearGradient>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>

            <Text style={styles.cardDescription}>{item.description}</Text>

            <LinearGradient
              colors={item.gradientColors}
              style={styles.cardButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.buttonText}>{item.title}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
                See all {userStats[0].value} discovered places
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

  const renderStatCard = ({ item, index }) => {
    const inputRange = [
      (index - 1) * (STATS_CARD_WIDTH + SPACING * 2),
      index * (STATS_CARD_WIDTH + SPACING * 2),
      (index + 1) * (STATS_CARD_WIDTH + SPACING * 2),
    ];

    const scale = statsScrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.statCardContainer,
          {
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.9} style={styles.statCard}>
          <LinearGradient
            colors={item.gradientColors}
            style={styles.statGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statContent}>
              <View style={styles.statIconContainer}>
                <Ionicons name={item.icon} size={28} color="#fff" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            {/* Background Image with Gradient Overlay */}
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
              }}
              style={styles.backgroundImage}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
              style={styles.gradientOverlay}
            />

            {/* Welcome Text */}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeGreeting}>Hello,</Text>
              <Text style={styles.welcomeText}>{userName}</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <SearchBar />
            </View>
          </View>

          {/* User Stats Section */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Your Journey</Text>

            <Animated.FlatList
              ref={statsListRef}
              data={userStats}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderStatCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsCarousel}
              snapToInterval={STATS_CARD_WIDTH + SPACING * 2}
              decelerationRate="fast"
              onScroll={onStatsScroll}
              scrollEventThrottle={16}
              snapToAlignment="center"
              bounces={true}
            />
          </View>

          {/* Discovered Locations Section */}
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

          {/* Features Section */}
          <View style={styles.featuresContainer}>
            <Text style={styles.sectionTitle}>Explore Features</Text>

            {/* Feature Cards Carousel */}
            <Animated.FlatList
              ref={flatListRef}
              data={featureCards}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContainer}
              snapToInterval={CARD_WIDTH + SPACING * 2}
              decelerationRate="fast"
              onScroll={onScroll}
              scrollEventThrottle={16}
              snapToAlignment="center"
              bounces={true}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

export default HomeScreen;

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Stats Section
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCarousel: {
    paddingLeft: SPACING,
    paddingRight: width - STATS_CARD_WIDTH - SPACING,
    alignItems: "center",
  },
  statCardContainer: {
    width: STATS_CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center",
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    width: "100%",
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  statInfo: {
    justifyContent: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerContainer: {
    height: 260,
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  welcomeTextContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  welcomeGreeting: {
    fontSize: 22,
    color: "#fff",
    opacity: 0.9,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Locations Section
  locationsContainer: {
    paddingTop: 8,
    paddingHorizontal: 20,
    marginBottom: 24,
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
  // Features Section
  featuresContainer: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  carouselContainer: {
    paddingLeft: SPACING,
    paddingRight: width - CARD_WIDTH - SPACING,
    alignItems: "center", // Ensure cards are centered horizontally
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: SPACING,
    alignItems: "center", // Center cards vertically within the container
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 200, // Fixed height for all cards
  },
  cardContent: {
    padding: 24,
    justifyContent: "space-between",
    minHeight: 200, // Match minHeight with the card container
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  cardDescription: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 24,
  },
  cardButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

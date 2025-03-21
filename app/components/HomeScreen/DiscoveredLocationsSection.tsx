// components/HomeScreen/DiscoveredLocationsSection.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getVisitedPlaces } from "../../controllers/Map/visitedPlacesController";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");
const LOCATION_CARD_WIDTH = width * 0.42; // Slightly wider cards
const SPACING = 12;

interface DiscoveredLocationsSectionProps {
  navigateToScreen: (screenName: string, params?: any) => void;
}

interface PlaceData {
  id: string;
  name: string;
  city: string;
  image: string;
  date: string;
  placeData: any;
  rating: number | null;
}

const DiscoveredLocationsSection: React.FC<DiscoveredLocationsSectionProps> = ({
  navigateToScreen,
}) => {
  const [discoveredLocations, setDiscoveredLocations] = useState<PlaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(30)).current;
  const scaleAnimation = useRef(new Animated.Value(0.9)).current;
  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;

  // Scroll handling for location cards
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserDiscoveredLocations();

    // Start animations
    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    fadeAnimation.setValue(0.6);
    // Start the entrance animations
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Start loading animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(loadingAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  }, []);

  // Function to fetch user's discovered locations from database
  const fetchUserDiscoveredLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get visited places from database
      const visitedPlaces = await getVisitedPlaces();

      // Process the visited places to match our component's data structure
      const formattedLocations = visitedPlaces
        .filter((place) => place && place.place_id) // Filter out any invalid places
        .map((place) => {
          // Create a clean city string by limiting length
          let cityText = place.vicinity || place.formatted_address || "Unknown location";
          if (cityText.length > 25) {
            cityText = cityText.substring(0, 22) + "...";
          }

          // Ensure place.name exists and is a string
          const placeName = typeof place.name === "string" ? place.name : "Unnamed Place";

          // Generate placeholder images with location name if no photo is available
          const placeholderImage = `https://via.placeholder.com/400x300/f0f0f0/666666?text=${encodeURIComponent(
            placeName.substring(0, 15)
          )}`;

          // Ensure we have a valid id for the list item
          const id =
            place.place_id ||
            place.id ||
            `place-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

          return {
            id: id,
            name: placeName.length > 20 ? placeName.substring(0, 18) + "..." : placeName,
            city: cityText,
            // Use photos array if available or fallback to a placeholder
            image:
              place.photos && place.photos.length > 0 && place.photos[0].photo_reference
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA`
                : placeholderImage,
            // Format the visit date
            date: formatVisitDate(place.visitedAt),
            // Include the full place data for potential use
            placeData: place,
            // Add rating if available
            rating: place.rating || null,
          };
        });

      setDiscoveredLocations(formattedLocations);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching discovered locations:", err);
      setError("Unable to load your discovered locations");
      setLoading(false);
    }
  };

  // Helper function to format visit date
  const formatVisitDate = (visitedAt: string | number | Date | undefined) => {
    if (!visitedAt) return "Unknown date";

    try {
      const visitDate = new Date(visitedAt);

      // Check if the date is valid
      if (isNaN(visitDate.getTime())) {
        return "Unknown date";
      }

      const now = new Date();
      // Get time in milliseconds and convert to days
      const diffTime = Math.abs(now.getTime() - visitDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "Today";
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
      } else {
        return visitDate.toLocaleDateString();
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const renderLocationCard = ({
    item,
    index,
  }: {
    item: PlaceData | { id: string };
    index: number;
  }) => {
    // For the "View All" card at the end
    if (item.id === "ViewAll") {
      // Animation for the view-all card
      const viewAllOpacity = scrollX.interpolate({
        inputRange: [
          (discoveredLocations.length - 1) * (LOCATION_CARD_WIDTH + SPACING) - width,
          (discoveredLocations.length - 0.5) * (LOCATION_CARD_WIDTH + SPACING) - width,
        ],
        outputRange: [0.6, 1],
        extrapolate: "clamp",
      });

      return (
        <Animated.View
          style={{
            opacity: viewAllOpacity,
            transform: [
              {
                scale: scrollX.interpolate({
                  inputRange: [
                    (discoveredLocations.length - 1) * (LOCATION_CARD_WIDTH + SPACING) - width,
                    discoveredLocations.length * (LOCATION_CARD_WIDTH + SPACING) - width,
                  ],
                  outputRange: [0.92, 1],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.viewAllCard}
            onPress={() => navigateToScreen("ViewAll")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#d03f74", "#ff1493"]}
              style={styles.viewAllGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View
                style={[
                  styles.backgroundCircle,
                  {
                    transform: [
                      {
                        translateY: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -8],
                        }),
                      },
                      {
                        scale: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.backgroundCircle2,
                  {
                    transform: [
                      {
                        translateX: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 10],
                        }),
                      },
                      {
                        translateY: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 5],
                        }),
                      },
                    ],
                  },
                ]}
              />

              <View style={styles.viewAllContent}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: loadingAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.15, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="grid" size={28} color="#fff" />
                </Animated.View>
                <Text style={styles.viewAllText}>View All</Text>
                <Text style={styles.viewAllSubtext}>
                  See all {discoveredLocations.length} discovered places
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    const typedItem = item as PlaceData;

    // Calculate input range for animations
    const inputRange = [
      (index - 1) * (LOCATION_CARD_WIDTH + SPACING),
      index * (LOCATION_CARD_WIDTH + SPACING),
      (index + 1) * (LOCATION_CARD_WIDTH + SPACING),
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: "clamp",
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: "clamp",
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [7, 0, 7],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{
          opacity: Animated.multiply(fadeAnimation, opacity),
          transform: [{ scale }, { translateY }],
        }}
      >
        <TouchableOpacity
          style={styles.locationCard}
          onPress={() =>
            navigateToScreen("PlaceDetails", {
              placeId: typedItem.id,
              placeData: typedItem.placeData,
            })
          }
          activeOpacity={0.9}
        >
          <Image source={{ uri: typedItem.image }} style={styles.locationImage} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.locationGradient}
          />

          {/* Rating badge with animation if available */}
          {typedItem.rating && (
            <Animated.View
              style={[
                styles.ratingBadge,
                {
                  transform: [
                    {
                      scale: loadingAnimation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 1.08, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 2 }} />
              <Text style={styles.ratingText}>{typedItem.rating.toFixed(1)}</Text>
            </Animated.View>
          )}

          <View style={styles.locationInfo}>
            <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">
              {typedItem.name}
            </Text>
            <View style={styles.locationMeta}>
              <Text style={styles.locationCity} numberOfLines={1} ellipsizeMode="tail">
                {typedItem.city}
              </Text>
            </View>
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={10} color="#fff" style={{ marginRight: 2 }} />
              <Text style={styles.dateText}>{typedItem.date}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Animated empty state component
  const renderEmptyState = () => {
    return (
      <Animated.View
        style={[
          styles.emptyStateCard,
          {
            opacity: fadeAnimation,
            transform: [{ scale: scaleAnimation }, { translateY: slideAnimation }],
          },
        ]}
      >
        <TouchableOpacity
          style={{ width: "100%", height: "100%" }}
          onPress={() => navigateToScreen("Discover")}
          activeOpacity={0.9}
        >
          <View style={styles.emptyStateContent}>
            <Animated.View
              style={[
                styles.backgroundCircle3,
                {
                  transform: [
                    {
                      translateY: loadingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -12],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.backgroundCircle4,
                {
                  transform: [
                    {
                      translateX: loadingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 15],
                      }),
                    },
                  ],
                },
              ]}
            />

            <View style={styles.leftContainer}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [
                      {
                        scale: loadingAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [1, 1.12, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="compass" size={22} color="#fff" />
              </Animated.View>
            </View>

            <View style={styles.middleContainer}>
              <Text style={styles.emptyStateTitle}>Start your journey</Text>
              <Text style={styles.emptyStateText}>Discover new places</Text>
            </View>

            <View style={styles.rightContainer}>
              <Animated.View
                style={[
                  styles.arrowContainer,
                  {
                    transform: [
                      {
                        translateX: loadingAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 4],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={18} color="#d03f74" />
              </Animated.View>
            </View>
          </View>

          {/* "Click to explore" text at the bottom */}
          <Animated.View
            style={[
              styles.clickPromptContainer,
              {
                opacity: loadingAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          >
            <Animated.View
              style={[
                styles.clickPromptLine,
                {
                  width: 30, // Fixed width of 30
                  transform: [
                    {
                      scaleX: fadeAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1], // Scale from 0 to full width
                      }),
                    },
                  ],
                },
              ]}
            />
            <Text style={styles.clickPromptText}>tap to explore</Text>
            <Animated.View
              style={[
                styles.clickPromptLine,
                {
                  width: 30, // Fixed width of 30
                  transform: [
                    {
                      scaleX: fadeAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1], // Scale from 0 to full width
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Animated loading state
  const renderLoadingState = () => {
    return (
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: fadeAnimation,
            transform: [{ scale: scaleAnimation }],
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: loadingAnimation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.5, 1, 0.5],
            }),
          }}
        >
          <ActivityIndicator size="small" color="#d03f74" />
        </Animated.View>
        <Text style={styles.loadingText}>Loading your places...</Text>
      </Animated.View>
    );
  };

  // Animated error state
  const renderErrorState = () => {
    return (
      <Animated.View
        style={[
          styles.errorContainer,
          {
            opacity: fadeAnimation,
            transform: [{ scale: scaleAnimation }, { translateY: slideAnimation }],
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [
              {
                scale: loadingAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1.1, 1],
                }),
              },
            ],
          }}
        >
          <Ionicons name="alert-circle-outline" size={24} color="#d03f74" />
        </Animated.View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchUserDiscoveredLocations} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return renderLoadingState();
    }

    if (error) {
      return renderErrorState();
    }

    if (!discoveredLocations || discoveredLocations.length === 0) {
      return renderEmptyState();
    }

    // Make sure all items have a valid id for the keyExtractor
    const dataWithViewAll = [
      ...discoveredLocations.map((location) => ({
        ...location,
        id: location.id || `fallback-${Math.random().toString(36).substring(2, 9)}`,
      })),
      { id: "ViewAll" },
    ];

    return (
      <Animated.FlatList
        data={dataWithViewAll}
        keyExtractor={(item) =>
          item && item.id ? item.id.toString() : `key-${Math.random().toString(36).substring(2, 9)}`
        }
        renderItem={renderLocationCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.locationsCarousel}
        snapToInterval={LOCATION_CARD_WIDTH + SPACING}
        decelerationRate="fast"
        snapToAlignment="start"
        bounces={true}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      />
    );
  };

  return (
    <Animated.View
      style={[
        styles.locationsContainer,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      <Animated.Text
        style={[
          styles.sectionTitle,
          {
            opacity: headerAnimation,
            transform: [
              {
                translateX: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        Discovered Locations
      </Animated.Text>
      {renderContent()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  locationsContainer: {
    marginVertical: 16,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
    paddingLeft: 4,
  },
  locationsCarousel: {
    paddingVertical: 8,
    paddingRight: SPACING,
  },
  locationCard: {
    width: LOCATION_CARD_WIDTH,
    height: 170,
    marginRight: SPACING,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
    height: "65%",
  },
  locationInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  locationMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  locationCity: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  dateText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "500",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  ratingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  viewAllCard: {
    width: LOCATION_CARD_WIDTH,
    height: 170,
    marginRight: SPACING,
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  viewAllGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  backgroundCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -30,
    right: -30,
  },
  backgroundCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -20,
    left: -20,
  },
  backgroundCircle3: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    top: -70,
    right: -50,
  },
  backgroundCircle4: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    bottom: -30,
    left: -30,
  },
  viewAllContent: {
    alignItems: "center",
    padding: 16,
    zIndex: 1,
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

  // Empty state styles (with animation enhancements)
  emptyStateCard: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyStateContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
    zIndex: 1,
    height: "100%",
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
    height: 170,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    width: "100%",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },

  // Error state styles
  errorContainer: {
    height: 170,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 20,
    width: "100%",
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

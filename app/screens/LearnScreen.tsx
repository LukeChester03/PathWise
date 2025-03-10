import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { globalStyles } from "../constants/globalStyles";
import { Colors, NeutralColors } from "../constants/colours";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import PlacesCarousel from "../components/Places/PlacesCarousel";

const { width, height } = Dimensions.get("window");

// Mock data for when Firestore doesn't return places
const mockPlaces = [
  {
    id: "mock1",
    place_id: "mock1",
    name: "Eiffel Tower",
    location: "Paris, France",
    rating: 4.8,
    visitDate: "March 2, 2025",
    visitedAt: new Date(),
    isVisited: true,
    images: [
      {
        uri: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&q=80&w=1000",
      },
    ],
    placeType: "landmark",
    description: "Iconic iron lattice tower on the Champ de Mars",
  },
  {
    id: "mock2",
    place_id: "mock2",
    name: "Colosseum",
    location: "Rome, Italy",
    rating: 4.7,
    visitDate: "February 15, 2025",
    visitedAt: new Date(),
    isVisited: true,
    images: [
      {
        uri: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1000",
      },
    ],
    placeType: "historical",
    description: "Ancient Roman amphitheatre in the center of Rome",
  },
];

const LearnScreen = ({ route, navigation }) => {
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [showAiExplanation, setShowAiExplanation] = useState(false);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [noPlacesFound, setNoPlacesFound] = useState(false);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);

  // Create separate animation values to avoid conflicts
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;

  // Fetch user's visited places from Firestore
  useEffect(() => {
    console.log("LearnScreen mounted - fetching places");
    fetchUserVisitedPlaces();
  }, []);

  // Run entrance animations when component mounts
  useEffect(() => {
    console.log("Starting entrance animations");
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Create pulsing animation for AI badge
  useEffect(() => {
    console.log("Starting pulse animation");
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const pulseLoop = Animated.loop(pulse);
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, []);

  // Animation for AI explanation panel - using a separate animation value
  useEffect(() => {
    console.log("AI explanation toggled:", showAiExplanation);
    if (showAiExplanation) {
      Animated.timing(explanationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(explanationAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showAiExplanation]);

  const fetchUserVisitedPlaces = async () => {
    try {
      setLoadingPlaces(true);
      setNoPlacesFound(false);
      setError(null);
      console.log("Attempting to fetch visited places");

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        setUseMockData(true);
        setVisitedPlaces(mockPlaces);
        setNoPlacesFound(false);
        setLoadingPlaces(false);
        return;
      }

      try {
        // visitedPlaces is a subcollection under the user document
        const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
        const querySnapshot = await getDocs(userVisitedPlacesRef);

        console.log("Firestore query complete with", querySnapshot.size, "documents");

        if (querySnapshot.empty) {
          console.log("No visited places found in Firestore - using mock data");
          setUseMockData(true);
          setVisitedPlaces(mockPlaces);
          setNoPlacesFound(false);
        } else {
          // Transform Firestore documents to place objects
          const userPlacesData = querySnapshot.docs
            .filter((doc) => {
              // Filter out the initialization document
              const data = doc.data();
              return !data._isInitDocument;
            })
            .map((doc) => {
              const data = doc.data();
              console.log("Processing place:", data.name || doc.id);

              return {
                ...data, // Keep all original properties
                id: doc.id,
                place_id: data.place_id || doc.id,
                name: data.name || "Unknown Place",
                location: data.vicinity || data.location || "",
                description: data.description || "",
                geometry: data.geometry,
                photos: data.photos || [],
                images: data.photos
                  ? [
                      {
                        uri:
                          data.photos[0]?.photo_reference ||
                          "https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?q=80&w=1000",
                      },
                    ]
                  : [
                      {
                        uri: "https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?q=80&w=1000",
                      },
                    ],
                rating: data.rating || 4.5,
                visitedAt: data.visitedAt,
                visitDate: data.visitedAt
                  ? new Date(data.visitedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Recently",
                isVisited: true, // Explicitly mark as visited
              };
            });

          console.log(`Found ${userPlacesData.length} places in Firestore (excluding init doc)`);

          if (userPlacesData.length === 0) {
            console.log("No valid places found - using mock data");
            setUseMockData(true);
            setVisitedPlaces(mockPlaces);
            setNoPlacesFound(false);
          } else {
            setVisitedPlaces(userPlacesData);
            setNoPlacesFound(false);
          }
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        setUseMockData(true);
        setVisitedPlaces(mockPlaces);
        setNoPlacesFound(false);
      }

      setLoadingPlaces(false);
    } catch (error) {
      console.error("Error in fetchUserVisitedPlaces:", error);
      setError("Failed to load your visited places");
      setUseMockData(true);
      setVisitedPlaces(mockPlaces);
      setNoPlacesFound(false);
      setLoadingPlaces(false);
    }
  };

  // AI-generated insights and data
  const aiInsights = {
    topCategory: "Historical Sites",
    insights: [
      "You seem particularly interested in architectural landmarks with classical design elements",
      "Most of your visits occur on weekends between 10am-2pm, suggesting you're a midday explorer",
      `Your travel patterns show a preference for locations with cultural significance`,
      "Based on your visits, we predict you might enjoy Renaissance architecture sites",
    ],
    locationTrends: [
      { trend: "Urban Exploration", percentage: 65 },
      { trend: "Historical Sites", percentage: 80 },
      { trend: "Natural Settings", percentage: 35 },
      { trend: "Cultural Venues", percentage: 60 },
    ],
    recommendedPlaces: [
      "Vatican Museums, Vatican City",
      "British Museum, London",
      "Palace of Versailles, France",
    ],
    localPhrases: [
      { language: "French", phrase: "Bonjour", translation: "Hello" },
      { language: "Italian", phrase: "Grazie", translation: "Thank you" },
      { language: "Spanish", phrase: "¿Dónde está?", translation: "Where is it?" },
    ],
  };

  // Mock AI-generated content (would be fetched from Gemini API in a real app)
  const getPlaceDetails = (place) => {
    // This would be replaced with actual Gemini API call
    const defaultDetails = {
      description: `${place.name} is a popular destination that offers visitors a unique experience. This location has been visited by people from around the world.`,
      facts: [
        "This place has historical significance dating back many decades",
        "Visitors often spend around 2-3 hours exploring all the features",
        "Local culture has been significantly influenced by this landmark",
      ],
      yearBuilt: "Unknown",
      architect: "Unknown",
      visitors: "Many annually",
      aiThoughts:
        "This location represents a significant cultural and historical landmark. Its architecture and significance have made it a destination worthy of exploration and study.",
    };

    // For demonstration, customize for known landmarks
    if (place.name.includes("Eiffel") || place.name.includes("Tower")) {
      return {
        description:
          "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. Named after engineer Gustave Eiffel, it has become a global cultural icon of France and one of the world's most recognizable structures.",
        facts: [
          "The tower is 330 meters (1,083 ft) tall, about the same height as an 81-story building",
          "It was the tallest man-made structure in the world for 41 years until 1930",
          "During cold weather, the tower shrinks by about 6 inches (15 cm)",
        ],
        yearBuilt: "1889",
        architect: "Gustave Eiffel",
        visitors: "7 million annually",
        aiThoughts:
          "This iconic structure represents Parisian innovation during the industrial revolution. The tower's enduring popularity showcases how engineering marvels can transcend their utilitarian origins to become cultural touchstones.",
      };
    } else if (place.name.includes("Statue") || place.name.includes("Liberty")) {
      return {
        description:
          "The Statue of Liberty is a colossal neoclassical sculpture on Liberty Island in New York Harbor. A gift from the people of France, it was designed by French sculptor Frédéric Auguste Bartholdi and its metal framework was built by Gustave Eiffel.",
        facts: [
          "The statue is 305 feet tall from ground to torch",
          "The seven rays on her crown represent the seven continents and seas",
          "It was dedicated on October 28, 1886",
        ],
        yearBuilt: "1886",
        architect: "Frédéric Auguste Bartholdi",
        visitors: "4.5 million annually",
        aiThoughts:
          "Lady Liberty represents the enduring friendship between France and the United States while symbolizing freedom and democracy. The statue's iconic silhouette has welcomed millions of immigrants, becoming a global symbol of hope and opportunity.",
      };
    } else if (place.name.includes("Colosseum") || place.name.includes("Rome")) {
      return {
        description:
          "The Colosseum is an oval amphitheatre in the center of Rome, Italy. It is the largest ancient amphitheatre ever built and remains the largest standing amphitheatre in the world today, despite its age.",
        facts: [
          "Construction began under emperor Vespasian in 72 AD and completed in 80 AD",
          "It could hold an estimated 50,000 to 80,000 spectators",
          "It was used for gladiatorial contests and public spectacles",
        ],
        yearBuilt: "70-80 AD",
        architect: "Vespasian",
        visitors: "6 million annually",
        aiThoughts:
          "The Colosseum stands as a testament to Roman engineering prowess. Its sophisticated design included features like the hypogeum, velarium, and travertine facade, showcasing advanced architectural knowledge that influenced structures for millennia.",
      };
    }

    return defaultDetails;
  };

  // Handle place selection
  const handlePlaceSelect = (placeId, place) => {
    console.log("Place selected:", placeId, place?.name);
    setLoading(true);
    setSelectedPlaceId(placeId);
    setSelectedPlace(place);
    setShowAiExplanation(false);

    // Simulate API call to Gemini AI
    setTimeout(() => {
      setLoading(false);
      // Reset animations for new content
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Start animations for new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-show AI explanation after a short delay
      setTimeout(() => {
        setShowAiExplanation(true);
      }, 1500);
    }, 1500);
  };

  const handleBackPress = () => {
    console.log("Back button pressed");
    setSelectedPlaceId(null);
    setSelectedPlace(null);
  };

  const renderEmptyState = () => {
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
            <Ionicons name="book-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>No Places to Learn About</Text>
          <Text style={styles.emptyStateMessage}>
            Visit some places first, then come back to discover AI-powered insights about your
            travels!
          </Text>

          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate("Explore")}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.emptyStateButtonText}>Explore Places</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPlaceDetails = () => {
    if (!selectedPlace) {
      console.log("No selected place found for details view");
      return null;
    }

    console.log("Rendering details for place:", selectedPlace.name);
    const details = getPlaceDetails(selectedPlace);

    return (
      <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.detailsContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ImageBackground
            source={selectedPlace.images[0]}
            style={styles.placeImage}
            imageStyle={styles.placeImageStyle}
            resizeMode="cover"
          >
            <View style={styles.imageDarkOverlay}>
              <View style={styles.placeHeaderContent}>
                <Text style={styles.placeNameOverlay}>{selectedPlace.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color="white" />
                  <Text style={styles.placeLocationOverlay}>{selectedPlace.location}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.detailsCard}>
            <View style={styles.visitInfoRow}>
              <View style={styles.visitDateContainer}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.visitDateText}>Visited on {selectedPlace.visitDate}</Text>
              </View>

              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={20} color="#FFC107" />
                <Text style={styles.ratingText}>{selectedPlace.rating}</Text>
              </View>
            </View>

            <View style={styles.aiContentCard}>
              <View style={styles.aiLabelRow}>
                <Animated.View
                  style={[
                    styles.aiLabelContainer,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <Ionicons name="flash" size={16} color={Colors.primary} />
                  <Text style={styles.aiLabel}>AI-Powered Insights</Text>
                </Animated.View>
                <TouchableOpacity
                  style={styles.aiInfoButton}
                  onPress={() => setShowAiExplanation(!showAiExplanation)}
                >
                  <Ionicons
                    name={showAiExplanation ? "information-circle" : "information-circle-outline"}
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {showAiExplanation && (
                <Animated.View
                  style={[
                    styles.aiExplanationBox,
                    {
                      opacity: explanationAnim,
                      transform: [
                        {
                          translateY: explanationAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.aiExplanationText}>
                    This content is generated by Gemini AI based on historical data, visitor
                    information, and cultural context about {selectedPlace.name}.
                  </Text>
                </Animated.View>
              )}

              <Text style={styles.description}>{details.description}</Text>

              <View style={styles.aiThoughtsContainer}>
                <Text style={styles.aiThoughtsLabel}>Gemini's Analysis</Text>
                <Text style={styles.aiThoughtsText}>{details.aiThoughts}</Text>
              </View>

              <Text style={styles.sectionTitle}>Fast Facts</Text>
              {details.facts.map((fact, index) => (
                <View key={index} style={styles.factItem}>
                  <View style={styles.factBullet} />
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Year Built</Text>
                  <Text style={styles.infoValue}>{details.yearBuilt}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Architect</Text>
                  <Text style={styles.infoValue}>{details.architect}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Annual Visitors</Text>
                  <Text style={styles.infoValue}>{details.visitors}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderLandingScreen = () => {
    console.log(
      "Rendering landing screen. Loading:",
      loadingPlaces,
      "Places count:",
      visitedPlaces.length
    );

    if (loadingPlaces) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your visited places...</Text>
        </View>
      );
    }

    if (error && !useMockData) {
      console.log("Rendering error state:", error);
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserVisitedPlaces}>
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if ((noPlacesFound || visitedPlaces.length === 0) && !useMockData) {
      console.log("Rendering empty state");
      return renderEmptyState();
    }

    // We have places to show (either real or mock)
    const placesToShow = visitedPlaces.length > 0 ? visitedPlaces : mockPlaces;
    console.log("Showing places:", placesToShow.length);

    return (
      <ScrollView style={styles.landingContainer} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.contentContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.subtitleText}>
              Explore your travel journey and discover new insights
            </Text>
            {useMockData && (
              <Text style={styles.mockDataNotice}>
                Using demo data - visit places in the Explore tab to see your own data
              </Text>
            )}
          </View>

          <View style={styles.aiSummaryCard}>
            <LinearGradient
              colors={["#4F46E5", "#818CF8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiSummaryGradient}
            >
              <View style={styles.aiSummaryContent}>
                <View style={styles.aiSummaryHeader}>
                  <Text style={styles.aiSummaryTitle}>AI Travel Snapshot</Text>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View style={styles.aiChipContainer}>
                      <Ionicons name="scan" size={12} color="#FFFFFF" />
                      <Text style={styles.aiChipText}>Gemini</Text>
                    </View>
                  </Animated.View>
                </View>
                <Text style={styles.aiSummaryDescription}>
                  Our AI has analyzed your {placesToShow.length} visited locations and found
                  patterns in your travel preferences.
                </Text>
                <View style={styles.aiActionsRow}>
                  <TouchableOpacity style={styles.aiActionButton}>
                    <View style={styles.aiActionIconContainer}>
                      <Ionicons name="analytics" size={16} color="#4F46E5" />
                    </View>
                    <Text style={styles.aiActionText}>Full Analysis</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.aiActionButton}>
                    <View style={styles.aiActionIconContainer}>
                      <Ionicons name="refresh" size={16} color="#4F46E5" />
                    </View>
                    <Text style={styles.aiActionText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.featuresGrid}>
            <TouchableOpacity style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="language" size={24} color="#0284C7" />
              </View>
              <Text style={styles.featureTitle}>Language Assistant</Text>
              <Text style={styles.featureDescription}>
                AI-generated phrases from local languages of places you've visited
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: "#FFEDD5" }]}>
                <Ionicons name="image" size={24} color="#C2410C" />
              </View>
              <Text style={styles.featureTitle}>Photo Analysis</Text>
              <Text style={styles.featureDescription}>
                AI insights about landmarks in your travel photos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="compass" size={24} color="#15803D" />
              </View>
              <Text style={styles.featureTitle}>Trip Planner</Text>
              <Text style={styles.featureDescription}>
                AI-generated itineraries based on your travel preferences
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.featureCard}>
              <View style={[styles.featureIconContainer, { backgroundColor: "#F3E8FF" }]}>
                <Ionicons name="people" size={24} color="#7E22CE" />
              </View>
              <Text style={styles.featureTitle}>Cultural Context</Text>
              <Text style={styles.featureDescription}>
                AI insights on local customs and traditions
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.aiInsightsCard}>
            <View style={styles.aiRibbonContainer}>
              <LinearGradient
                colors={["#4F46E5", "#818CF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiRibbon}
              >
                <Text style={styles.aiRibbonText}>AI POWERED</Text>
              </LinearGradient>
            </View>

            <View style={styles.aiInsightsHeader}>
              <View style={styles.aiIconContainer}>
                <Ionicons name="brain" size={24} color="#4F46E5" />
              </View>
              <View style={styles.aiTitleContainer}>
                <Text style={styles.aiInsightsTitle}>Advanced Travel Analysis</Text>
                <View style={styles.geminiLabelContainer}>
                  <Ionicons
                    name="logo-google"
                    size={10}
                    color="#0369A1"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.geminiLabel}>Gemini AI</Text>
                </View>
              </View>
            </View>

            <Text style={styles.aiInsightsDescription}>
              Our multimodal AI has analyzed your travel history, photos, and preferences to
              generate these insights:
            </Text>

            {aiInsights.insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Ionicons name="sparkles" size={18} color="#4F46E5" style={styles.insightIcon} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}

            <View style={styles.aiSectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Travel Preferences</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.trendsContainer}>
              {aiInsights.locationTrends.map((trend, index) => (
                <View key={index} style={styles.trendItem}>
                  <View style={styles.trendLabelRow}>
                    <Text style={styles.trendLabel}>{trend.trend}</Text>
                    <Text style={styles.trendPercentage}>{trend.percentage}%</Text>
                  </View>
                  <View style={styles.trendBarBackground}>
                    <View style={[styles.trendBarFill, { width: `${trend.percentage}%` }]} />
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.aiExpandButton}>
              <Text style={styles.aiExpandText}>View Complete Analysis</Text>
              <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
            </TouchableOpacity>
          </View>

          <View style={styles.aiRecommendationsCard}>
            <View style={styles.aiRecommendationsHeader}>
              <Ionicons name="compass" size={22} color="#15803D" />
              <Text style={styles.aiRecommendationsTitle}>AI-Recommended Destinations</Text>
            </View>

            <Text style={styles.aiRecommendationsSubtitle}>
              Based on your travel preferences, you might enjoy:
            </Text>

            <View style={styles.recommendationsList}>
              {aiInsights.recommendedPlaces.map((place, index) => (
                <TouchableOpacity key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationIconContainer}>
                    <Ionicons name="location" size={18} color="#15803D" />
                  </View>
                  <Text style={styles.recommendationText}>{place}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.aiLanguageCard}>
            <View style={styles.aiLanguageHeader}>
              <Ionicons name="language" size={22} color="#0284C7" />
              <Text style={styles.aiLanguageTitle}>AI Language Assistant</Text>
            </View>

            <Text style={styles.aiLanguageSubtitle}>
              Useful phrases from regions you've visited:
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.phrasesScrollView}
              contentContainerStyle={styles.phrasesContentContainer}
            >
              {aiInsights.localPhrases.map((phrase, index) => (
                <View key={index} style={styles.phraseCard}>
                  <Text style={styles.phraseLanguage}>{phrase.language}</Text>
                  <Text style={styles.phraseText}>{phrase.phrase}</Text>
                  <Text style={styles.phraseTranslation}>{phrase.translation}</Text>
                  <TouchableOpacity style={styles.playPhraseButton}>
                    <Ionicons name="volume-high" size={16} color="#0284C7" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.visitedSection}>
            <Text style={styles.sectionHeading}>Recently Visited Places</Text>
            <Text style={styles.sectionSubheading}>
              Tap on any place to explore AI-powered insights
            </Text>

            <View style={styles.carouselContainer}>
              <PlacesCarousel
                places={placesToShow}
                onPlacePress={handlePlaceSelect}
                sectionType="visited"
                cardWidth={width * 0.85}
                cardHeight={180}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[globalStyles.container, styles.container]}>
        <Header
          title={selectedPlaceId ? "Learn" : "Discover & Learn"}
          subtitle={selectedPlaceId ? "AI-powered insights" : "Explore your visited places"}
          showBackButton={!!selectedPlaceId}
          onBackPress={handleBackPress}
          showIcon={true}
          iconName={selectedPlaceId ? "book" : "sparkles"}
          iconColor={Colors.primary}
          showHelp={true}
          onHelpPress={() => alert("AI-powered insights about places you've visited")}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Gemini AI is analyzing this place...</Text>
              <Text style={styles.loadingSubtext}>Generating personalized insights for you</Text>

              <View style={styles.pulsingContainer}>
                {[...Array(3)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.pulsingCircle,
                      {
                        opacity: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.8],
                        }),
                        transform: [
                          {
                            scale: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>

              <Text style={styles.geminiAttribution}>Powered by Gemini AI</Text>
            </View>
          </View>
        ) : selectedPlaceId ? (
          renderPlaceDetails()
        ) : (
          renderLandingScreen()
        )}
      </View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  landingContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  welcomeSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitleText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  mockDataNotice: {
    marginTop: 8,
    fontSize: 12,
    color: "#EF4444",
    fontStyle: "italic",
  },
  aiSummaryCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  aiSummaryGradient: {
    borderRadius: 20,
    padding: 0,
  },
  aiSummaryContent: {
    padding: 20,
  },
  aiSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aiSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  aiChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  aiSummaryDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.9,
  },
  aiActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
  },
  aiActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiActionIconContainer: {
    marginRight: 6,
  },
  aiActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  aiInsightsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  aiRibbonContainer: {
    position: "absolute",
    top: 12,
    right: -30,
    transform: [{ rotate: "45deg" }],
    zIndex: 10,
  },
  aiRibbon: {
    paddingHorizontal: 30,
    paddingVertical: 4,
  },
  aiRibbonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1,
  },
  aiInsightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  aiIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: "#C7D2FE",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  aiTitleContainer: {
    flex: 1,
  },
  aiInsightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4F46E5",
    marginBottom: 4,
  },
  geminiLabelContainer: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  geminiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
  },
  aiInsightsDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4F46E5",
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  aiSectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  trendsContainer: {
    marginBottom: 16,
  },
  trendItem: {
    marginBottom: 12,
  },
  trendLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  trendLabel: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  trendPercentage: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "600",
  },
  trendBarBackground: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  trendBarFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
  aiExpandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginTop: 4,
  },
  aiExpandText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 4,
  },
  aiRecommendationsCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiRecommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiRecommendationsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 8,
  },
  aiRecommendationsSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  recommendationsList: {
    gap: 10,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recommendationIconContainer: {
    marginRight: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: "#374151",
  },
  aiLanguageCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiLanguageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiLanguageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284C7",
    marginLeft: 8,
  },
  aiLanguageSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  phrasesScrollView: {
    marginBottom: 6,
  },
  phrasesContentContainer: {
    paddingRight: 16,
    paddingBottom: 4,
    gap: 12,
  },
  phraseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: "relative",
  },
  phraseLanguage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
    marginBottom: 6,
  },
  phraseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  phraseTranslation: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  playPhraseButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  visitedSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubheading: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  carouselContainer: {
    marginBottom: 20,
  },

  // Detail view styles
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    flex: 1,
  },
  placeImage: {
    height: 240,
    width: "100%",
  },
  placeImageStyle: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  imageDarkOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  placeHeaderContent: {
    marginBottom: 20,
  },
  placeNameOverlay: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  placeLocationOverlay: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  detailsCard: {
    padding: 16,
  },
  visitInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitDateText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B45309",
    marginLeft: 4,
  },
  aiContentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  aiLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  aiLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginLeft: 6,
  },
  aiInfoButton: {
    padding: 4,
  },
  aiExplanationBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  aiExplanationText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontStyle: "italic",
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 20,
  },
  aiThoughtsContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  aiThoughtsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 6,
  },
  aiThoughtsText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    marginTop: 8,
  },
  factItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  factBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
    marginTop: 6,
    marginRight: 12,
  },
  factText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    width: "50%",
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#4F46E5",
    textAlign: "center",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  pulsingContainer: {
    width: 120,
    height: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  pulsingCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4F46E5",
    margin: 4,
  },
  geminiAttribution: {
    marginTop: 16,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    overflow: "hidden",
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: 250,
    marginTop: 16,
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

export default LearnScreen;

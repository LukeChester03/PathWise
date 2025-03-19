// screens/LearnScreen.tsx
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
import AiTravelSnapshot from "../components/LearnScreen/TravelSnapshotSection/AiTravelSnapshot";
import LanguageAssistant from "../components/LearnScreen/LanguageSection/LanguageAssistant";
import LearnIntroOverlay from "../components/LearnScreen/LearnIntroOverlayComponent";
import CulturalContextCard from "../components/LearnScreen/CulturalContextCard";
import AdvancedTravelAnalysisCard from "../components/LearnScreen/TravelAnalysisSection/AdvancedTravelAnalysisCard";
import KnowledgeQuestCard from "../components/LearnScreen/KnowledgeQuestSection/KnowledgeQuestCard";
import { Quiz } from "../types/LearnScreen/KnowledgeQuestTypes";
import { initializeKnowledgeQuest } from "../services/LearnScreen/knowledgeQuestService";
import { initializeQuizBadges } from "../services/LearnScreen/knowledgeQuestBadgeService";

const { width } = Dimensions.get("window");

const LearnScreen = ({ navigation }) => {
  // State variables
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [noPlacesFound, setNoPlacesFound] = useState(false);
  const [error, setError] = useState(null);
  const [showLearnIntro, setShowLearnIntro] = useState(false);
  const [travelProfile, setTravelProfile] = useState(null);
  const [expandedFeatures, setExpandedFeatures] = useState({
    travelProfile: false,
    culturalInsights: false,
    travelAnalysis: false,
  });

  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef({
    travelSnapshot: new Animated.Value(0),
    languageAssistant: new Animated.Value(0),
    cultural: new Animated.Value(0),
    analysis: new Animated.Value(0),
    quest: new Animated.Value(0),
  }).current;

  // Fetch user's visited places from Firestore
  useEffect(() => {
    console.log("LearnScreen mounted - fetching places");
    fetchUserVisitedPlaces();

    // Initialize Knowledge Quest
    initializeKnowledgeQuest().catch((error) => {
      console.error("Error initializing Knowledge Quest:", error);
    });

    // Initialize quiz badges
    initializeQuizBadges().catch((error) => {
      console.error("Error initializing quiz badges:", error);
    });
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

    // Staggered animations for each card
    const animations = Object.keys(cardAnimations).map((key, index) => {
      return Animated.timing(cardAnimations[key], {
        toValue: 1,
        duration: 500,
        delay: 100 + index * 100, // Stagger effect
        useNativeDriver: true,
      });
    });

    Animated.stagger(50, animations).start();
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
        setNoPlacesFound(true);
        setVisitedPlaces([]);
        setLoadingPlaces(false);
        return;
      }

      try {
        // visitedPlaces is a subcollection under the user document
        const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
        const querySnapshot = await getDocs(userVisitedPlacesRef);

        console.log("Firestore query complete with", querySnapshot.size, "documents");

        if (querySnapshot.empty) {
          console.log("No visited places found in Firestore");
          setNoPlacesFound(true);
          setVisitedPlaces([]);
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
            console.log("No valid places found");
            setNoPlacesFound(true);
            setVisitedPlaces([]);
          } else {
            setVisitedPlaces(userPlacesData);
            setNoPlacesFound(false);
          }
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        setError("Failed to load your visited places");
        setVisitedPlaces([]);
      }

      setLoadingPlaces(false);
    } catch (error) {
      console.error("Error in fetchUserVisitedPlaces:", error);
      setError("Failed to load your visited places");
      setVisitedPlaces([]);
      setLoadingPlaces(false);
    }
  };

  const handleProfileUpdated = (profile) => {
    setTravelProfile(profile);
    console.log("Travel profile updated:", profile.type);
  };

  // Handle Knowledge Quest actions
  const handleStartQuiz = (quiz: Quiz) => {
    navigation.navigate("QuizSession", { quizId: quiz.id });
  };

  // Toggle feature expansion
  const toggleFeatureExpansion = (feature) => {
    setExpandedFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  const handleModal = () => {
    console.log("Opening Learn intro modal");
    setShowLearnIntro(true);
  };

  const renderFeatureCards = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.featuresGrid,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => {
            navigation.navigate("Phrasebook", {
              visitedPlaces,
            });
          }}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons name="language" size={24} color="#0284C7" />
          </View>
          <Text style={styles.featureTitle}>Language Assistant</Text>
          <Text style={styles.featureDescription}>
            Phrases from local languages of places you've visited
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => {
            navigation.navigate("CulturalContext", {
              visitedPlaces,
            });
          }}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: "#F3E8FF" }]}>
            <Ionicons name="people" size={24} color="#7E22CE" />
          </View>
          <Text style={styles.featureTitle}>Cultural Context</Text>
          <Text style={styles.featureDescription}>
            AI insights on local customs and traditions in places you visit
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLanguageAssistantCard = (cardAnimation) => {
    return <LanguageAssistant visitedPlaces={visitedPlaces} cardAnimation={cardAnimation} />;
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

    if (error) {
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
          </View>

          {/* Feature 1: AI Travel Snapshot */}
          <AiTravelSnapshot
            fadeAnim={cardAnimations.travelSnapshot}
            pulseAnim={pulseAnim}
            placesToShow={visitedPlaces}
            onProfileUpdated={handleProfileUpdated}
          />

          {/* Feature Grid */}
          {renderFeatureCards(cardAnimations.travelSnapshot)}

          {/* Feature 5 & 6: Advanced Travel Analysis + Travel Preferences */}
          <AdvancedTravelAnalysisCard
            cardAnimation={cardAnimations.analysis}
            visitedPlaces={visitedPlaces}
          />

          {/* Feature 2: Language Assistant */}
          {renderLanguageAssistantCard(cardAnimations.languageAssistant)}

          {/* Feature 4: Cultural Context */}
          <CulturalContextCard
            cardAnimation={cardAnimations.cultural}
            visitedPlaces={visitedPlaces}
            navigation={navigation}
            expandedFeatures={expandedFeatures}
            toggleFeatureExpansion={toggleFeatureExpansion}
          />

          {/* Feature 7: Knowledge Quest Game */}
          <KnowledgeQuestCard
            cardAnimation={cardAnimations.quest}
            navigation={navigation}
            onStartQuiz={handleStartQuiz}
          />
        </Animated.View>
      </ScrollView>
    );
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[globalStyles.container, styles.container]}>
        <Header
          title="Learn"
          subtitle="Explore your visited places"
          showIcon={true}
          iconName="sparkles"
          iconColor={Colors.primary}
          showHelp={true}
          onHelpPress={() => handleModal()}
        />

        {renderLandingScreen()}

        <LearnIntroOverlay
          visible={showLearnIntro}
          onClose={() => {
            setShowLearnIntro(false);
            // Allow modal to fully close before it can be reopened
            setTimeout(() => {
              console.log("Modal state reset complete");
            }, 100);
          }}
        />
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

  // Feature Grid
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

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
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
});

export default LearnScreen;

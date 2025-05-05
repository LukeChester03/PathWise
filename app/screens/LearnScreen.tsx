import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  Easing,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { globalStyles } from "../constants/globalStyles";
import { Colors } from "../constants/colours";
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
import { VisitedPlaceDetails } from "../types/MapTypes";

const { width } = Dimensions.get("window");

interface TravelProfile {
  type: string;
  [key: string]: any;
}

interface NavigationProps {
  navigate: (route: string, params?: any) => void;
}

const LearnScreen = ({ navigation }: { navigation: NavigationProps }) => {
  const [loadingPlaces, setLoadingPlaces] = useState<boolean>(true);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlaceDetails[]>([]);
  const [noPlacesFound, setNoPlacesFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showLearnIntro, setShowLearnIntro] = useState<boolean>(false);
  const [travelProfile, setTravelProfile] = useState<TravelProfile | null>(null);
  const [isDataReady, setIsDataReady] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  const sections = {
    welcome: useRef(new Animated.Value(0)).current,
    snapshot: useRef(new Animated.Value(0)).current,
    features: useRef(new Animated.Value(0)).current,
    analysis: useRef(new Animated.Value(0)).current,
    language: useRef(new Animated.Value(0)).current,
    cultural: useRef(new Animated.Value(0)).current,
    quest: useRef(new Animated.Value(0)).current,
  };

  const dummyAnim = useRef(new Animated.Value(1)).current;

  const startLoadingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(loadingAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const triggerEntryAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    Animated.stagger(120, [
      Animated.timing(sections.welcome, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.snapshot, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.features, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.analysis, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.language, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.cultural, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(sections.quest, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  };

  useEffect(() => {
    console.log("LearnScreen mounted - loading data");

    startLoadingAnimation();

    const initializeData = async () => {
      try {
        await fetchUserVisitedPlaces();

        setTimeout(() => {
          initializeKnowledgeQuest().catch((error) => {
            console.error("Error initializing Knowledge Quest:", error);
          });

          initializeQuizBadges().catch((error) => {
            console.error("Error initializing quiz badges:", error);
          });
        }, 1000);

        setTimeout(() => {
          setIsDataReady(true);
          triggerEntryAnimations();
        }, 300);
      } catch (error) {
        console.error("Error initializing data:", error);
        setIsDataReady(true);
        triggerEntryAnimations();
      }
    };

    initializeData();
  }, []);

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
  });

  const fetchUserVisitedPlaces = async () => {
    try {
      setLoadingPlaces(true);
      setNoPlacesFound(false);
      setError(null);
      console.log("Attempting to fetch visited places");

      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        setNoPlacesFound(true);
        setVisitedPlaces([]);
        setLoadingPlaces(false);
        return;
      }

      try {
        const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
        const querySnapshot = await getDocs(userVisitedPlacesRef);

        console.log("Firestore query complete with", querySnapshot.size, "documents");

        if (querySnapshot.empty) {
          console.log("No visited places found in Firestore");
          setNoPlacesFound(true);
          setVisitedPlaces([]);
        } else {
          const userPlacesData: VisitedPlaceDetails[] = querySnapshot.docs
            .filter((doc) => {
              const data = doc.data();
              return !data._isInitDocument;
            })
            .map((doc) => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                place_id: data.place_id || doc.id,
                name: data.name || "Unknown Place",
                location: data.vicinity || data.location || "",
                description: data.description || "",
                geometry: data.geometry || {
                  location: { lat: 0, lng: 0 },
                },
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
                visitedAt: data.visitedAt || new Date().toISOString(),
                visitDate: data.visitedAt
                  ? new Date(data.visitedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Recently",
                isVisited: true,
                website: data.website || null,
              } as VisitedPlaceDetails;
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

  const handleProfileUpdated = (profile: TravelProfile) => {
    setTravelProfile(profile);
    console.log("Travel profile updated:", profile.type);
  };

  const handleStartQuiz = (quiz: Quiz) => {
    navigation.navigate("QuizSession", { quizId: quiz.id });
  };

  const handleModal = () => {
    console.log("Opening Learn intro modal");
    setShowLearnIntro(true);
  };

  if (!isDataReady) {
    return (
      <ScreenWithNavBar>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingIndicator,
                {
                  opacity: loadingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                  transform: [
                    {
                      scale: loadingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1.1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primary + "99"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loadingGradient}
              />
            </Animated.View>
            <Text style={styles.loadingText}>Preparing your journey...</Text>
          </View>
        </SafeAreaView>
      </ScreenWithNavBar>
    );
  }

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Header
          title="Learn"
          subtitle="Your Travel Helper"
          showIcon={true}
          iconName="sparkles"
          iconColor={Colors.primary}
          showHelp={true}
          onHelpPress={handleModal}
        />
        <SafeAreaView style={styles.safeArea}>
          {error ? (
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
          ) : (
            <Animated.ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              <Animated.View
                style={[
                  styles.welcomeSection,
                  {
                    opacity: sections.welcome,
                    transform: [
                      {
                        translateY: sections.welcome.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.subtitleText}>
                  Explore your travel journey and discover new insights
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: sections.snapshot,
                    transform: [
                      {
                        translateY: sections.snapshot.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <AiTravelSnapshot
                  placesToShow={visitedPlaces}
                  onProfileUpdated={handleProfileUpdated}
                  fadeAnim={dummyAnim}
                  pulseAnim={dummyAnim}
                />
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: sections.features,
                    transform: [
                      {
                        translateY: sections.features.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* <View style={styles.featuresGrid}>
                  <TouchableOpacity
                    style={styles.featureCard}
                    onPress={() => {
                      navigation.navigate("Phrasebook", {
                        visitedPlaces,
                      });
                    }}
                    activeOpacity={0.7}
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
                    activeOpacity={0.7}
                  >
                    <View style={[styles.featureIconContainer, { backgroundColor: "#F3E8FF" }]}>
                      <Ionicons name="people" size={24} color="#7E22CE" />
                    </View>
                    <Text style={styles.featureTitle}>Cultural Context</Text>
                    <Text style={styles.featureDescription}>
                      AI insights on local customs and traditions in places you visit
                    </Text>
                  </TouchableOpacity>
                </View> */}
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: sections.analysis,
                    transform: [
                      {
                        translateY: sections.analysis.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <AdvancedTravelAnalysisCard
                  cardAnimation={dummyAnim}
                  visitedPlaces={visitedPlaces}
                />
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: sections.language,
                    transform: [
                      {
                        translateY: sections.language.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LanguageAssistant visitedPlaces={visitedPlaces} cardAnimation={dummyAnim} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: sections.cultural,
                    transform: [
                      {
                        translateY: sections.cultural.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <CulturalContextCard
                  cardAnimation={dummyAnim}
                  visitedPlaces={visitedPlaces}
                  navigation={navigation}
                />
              </Animated.View>

              <Animated.View
                style={[
                  styles.cardContainer,
                  {
                    opacity: sections.quest,
                    transform: [
                      {
                        translateY: sections.quest.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <KnowledgeQuestCard
                  cardAnimation={dummyAnim}
                  navigation={navigation}
                  onStartQuiz={handleStartQuiz}
                />
              </Animated.View>
            </Animated.ScrollView>
          )}

          <LearnIntroOverlay
            visible={showLearnIntro}
            onClose={() => {
              setShowLearnIntro(false);
              setTimeout(() => {
                console.log("Modal state reset complete");
              }, 100);
            }}
          />
        </SafeAreaView>
      </Animated.View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: 20,
    width: "100%",
  },
  welcomeSection: {
    marginBottom: 24,
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
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    overflow: "hidden",
  },
  loadingGradient: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
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

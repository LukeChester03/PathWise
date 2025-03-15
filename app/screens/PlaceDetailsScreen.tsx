import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Share,
  Platform,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

// Types
import { RootStackParamList } from "../navigation/types";
import { Place, VisitedPlaceDetails } from "../types/MapTypes";

// Handlers
import { getVisitedPlaceDetails } from "../handlers/Map/visitedPlacesHandlers";

// Original Components
import TruncatedText from "../components/PlaceDetails/TruncatedText";
import CollapsibleCard from "../components/PlaceDetails/CollapsibleCard";
import PlaceHeroHeader from "../components/PlaceDetails/PlaceHeroHeader";
import PlaceTitle from "../components/PlaceDetails/PlaceTitle";
import PlaceBadges from "../components/PlaceDetails/PlaceBadges";
import DiscoveryDetailsSection from "../components/PlaceDetails/DiscoveryDetails";
import AskAiSection from "../components/PlaceDetails/AskAISection";
import LocalTipsSection from "../components/PlaceDetails/LocalTipsSection";
import NavigateButton from "../components/PlaceDetails/NavigateButton";

// New Components
import FeatureGrid from "../components/PlaceDetails/FeatureGrid";
import OpeningHoursCard from "../components/PlaceDetails/OpeningHoursCard";
import HistoricalTimeline from "../components/PlaceDetails/HistoricalTimeline";
import ContactInfoCard from "../components/PlaceDetails/ContactInfoCard";
import DidYouKnowCards from "../components/PlaceDetails/DidYouKnowCards";
import PreVisitModal from "../components/PlaceDetails/PreVisitModal";

// Hooks
import { useAiContent } from "../hooks/AI/useAIContent";
import { useDynamicStyles } from "../hooks/Global/useDynamicStyles";

// Utils
import { formatVisitDate } from "../utils/placeUtils";
import AddressSection from "../components/PlaceDetails/AddressSection";
import { Colors } from "../constants/colours";
import NavigationService from "../services/Map/navigationService";

// Create the navigation and route types
type PlaceDetailsRouteProp = RouteProp<RootStackParamList, "PlaceDetails">;
type PlaceDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, "PlaceDetails">;

// Constants for description truncation
const MAX_DESCRIPTION_CHARS = 120;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// Main component
const PlaceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<PlaceDetailsNavigationProp>();
  const route = useRoute<PlaceDetailsRouteProp>();
  const { placeId, place } = route.params;

  // Dynamic styles based on screen size
  const dynamicStyles = useDynamicStyles();

  // Precalculate heights for more stable animations
  const heroHeight = useMemo(() => dynamicStyles.heroHeight, [dynamicStyles.heroHeight]);
  // Adjust overlap - how much the content card overlaps the image
  const contentOverlap = useMemo(() => 40, []);
  const translateThreshold = useMemo(
    () => heroHeight - contentOverlap,
    [heroHeight, contentOverlap]
  );

  // State variables
  const [loading, setLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<Place | VisitedPlaceDetails | null>(null);
  const [showFullAiContent, setShowFullAiContent] = useState(false);

  // NEW: State for handling non-visited places flow
  const [showPreVisitModal, setShowPreVisitModal] = useState(false);
  const [limitedViewMode, setLimitedViewMode] = useState(false);

  // Animation values - using refs to prevent re-renders
  const scrollY = useRef(new Animated.Value(0)).current;

  // Optimize by memoizing animation interpolations
  const animations = useMemo(() => {
    // Parallax effect for header image - smoother with adjusted ranges
    const headerTranslateY = scrollY.interpolate({
      inputRange: [-heroHeight, 0, translateThreshold],
      outputRange: [heroHeight / 2, 0, -heroHeight / 5],
      extrapolate: "clamp",
    });

    // Image scale effect when pulling down
    const imageScale = scrollY.interpolate({
      inputRange: [-100, 0],
      outputRange: [1.15, 1],
      extrapolate: "clamp",
    });

    // Header image opacity effect
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, translateThreshold, translateThreshold + 50],
      outputRange: [1, 1, 0.98],
      extrapolate: "clamp",
    });

    // Content container animations - starts with overlap
    const contentTranslateY = scrollY.interpolate({
      inputRange: [-1, 0, translateThreshold],
      outputRange: [heroHeight - contentOverlap + 1, heroHeight - contentOverlap, 0],
      extrapolate: "clamp",
    });

    // More gradual border radius transition
    const contentBorderRadius = scrollY.interpolate({
      inputRange: [0, translateThreshold * 0.8],
      outputRange: [24, 0],
      extrapolate: "clamp",
    });

    // Navigation controls opacity
    const navControlsOpacity = scrollY.interpolate({
      inputRange: [translateThreshold - 50, translateThreshold],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });

    return {
      headerTranslateY,
      imageScale,
      headerOpacity,
      contentTranslateY,
      contentBorderRadius,
      navControlsOpacity,
    };
  }, [scrollY, heroHeight, translateThreshold, contentOverlap]);

  // Custom hooks
  const { aiContent, aiContentLoading, aiContentError, sectionsVisible, generateAiContent } =
    useAiContent(placeDetails);

  // Effect for place details loading
  useEffect(() => {
    // Set initial place details from navigation params
    if (place) {
      setPlaceDetails(place);
    }

    // Fetch additional details if needed
    const fetchDetails = async () => {
      if (placeId) {
        setLoading(true);
        try {
          // Try to get the place from visited places database
          const visitedDetails = await getVisitedPlaceDetails(placeId);

          if (visitedDetails) {
            setPlaceDetails({
              ...place, // Merge with the original place data
              ...visitedDetails, // Override with visited details
              isVisited: true, // Explicitly set this flag for visited places
            } as VisitedPlaceDetails);
          } else if (!place) {
            // If we don't have place data and couldn't find it in visited places,
            // we could fetch it from an API here
            // For now, just set a placeholder
            setPlaceDetails({
              place_id: placeId,
              name: "Loading place...",
              geometry: {
                location: {
                  lat: 0,
                  lng: 0,
                },
              },
              website: null, // Add these required properties to satisfy the type
            } as Place);
          }
        } catch (error) {
          console.error("Error fetching place details:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDetails();
  }, [placeId, place]);

  // NEW: Check if place is visited and show pre-visit modal if necessary
  useEffect(() => {
    if (placeDetails && !loading) {
      const isVisited = "isVisited" in placeDetails && placeDetails.isVisited === true;

      if (!isVisited) {
        setShowPreVisitModal(true);
      }
    }
  }, [placeDetails, loading]);

  // Handle back button press
  const handleBackPress = () => {
    navigation.goBack();
  };

  // NEW: Handle start journey button on PreVisitModal
  const handleStartJourney = () => {
    try {
      // First provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (placeDetails) {
        console.log(`PlaceDetailsScreen: Starting journey for ${placeDetails.name}`);

        // Create a deep copy of the place to avoid reference issues
        const placeToShow = JSON.parse(JSON.stringify(placeDetails));

        // Use NavigationService with a slight delay
        setTimeout(() => {
          NavigationService.showDiscoverCard(navigation, placeToShow);
        }, 100);
      }
    } catch (error) {
      console.error("PlaceDetailsScreen: Error starting journey:", error);
    }
  };

  // NEW: Handle view details in limited mode
  const handleViewLimitedDetails = () => {
    setShowPreVisitModal(false);
    setLimitedViewMode(true);
  };

  // Handle share button press
  const handleShare = async () => {
    if (!placeDetails) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const shareMsg = `Check out ${placeDetails.name} I discovered!`;
      const shareUrl =
        placeDetails.url ||
        `https://maps.google.com/?q=${placeDetails.geometry.location.lat},${placeDetails.geometry.location.lng}`;

      await Share.share({
        message: Platform.OS === "ios" ? shareMsg : `${shareMsg} ${shareUrl}`,
        url: shareUrl, // iOS only
      });
    } catch (error) {
      console.error("Error sharing place:", error);
    }
  };

  // Handle navigation to the place
  const handleNavigateToPlace = () => {
    try {
      if (!placeDetails) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log(`PlaceDetailsScreen: Navigating to ${placeDetails.name}`);

      // Create a deep copy of the place
      const placeToShow = JSON.parse(JSON.stringify(placeDetails));

      // Use NavigationService with a slight delay
      setTimeout(() => {
        NavigationService.showDiscoverCard(navigation, placeToShow);
      }, 100);
    } catch (error) {
      console.error("PlaceDetailsScreen: Error navigating to place:", error);
    }
  };

  // Handle phone call
  const handleCallPress = () => {
    if (placeDetails?.formatted_phone_number) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${placeDetails.formatted_phone_number}`);
    }
  };

  // Handle website visit
  const handleWebsitePress = () => {
    if (placeDetails?.website) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(placeDetails.website);
    }
  };

  // Define feature grid actions
  const getFeatureActions = () => {
    if (!placeDetails) return [];

    const actions = [
      {
        title: "Navigate",
        icon: "navigate",
        onPress: handleNavigateToPlace,
        color: "#4CAF50", // Green
      },
      {
        title: "Share",
        icon: "share-social",
        onPress: handleShare,
        color: "#FF9800", // Orange
      },
    ];

    // Add phone action if available
    if (placeDetails.formatted_phone_number) {
      actions.push({
        title: "Call",
        icon: "call",
        onPress: handleCallPress,
        color: "#2196F3", // Blue
      });
    }

    // Add website action if available
    if (placeDetails.website) {
      actions.push({
        title: "Website",
        icon: "globe",
        onPress: handleWebsitePress,
        color: "#9C27B0", // Purple
      });
    }

    return actions;
  };

  // Check if the place has a visit date (for visited places)
  const hasVisitDate = placeDetails && "visitedAt" in placeDetails && placeDetails.visitedAt;
  const visitDate = hasVisitDate ? formatVisitDate(placeDetails as VisitedPlaceDetails) : null;

  // Has opening hours
  const hasOpeningHours =
    placeDetails &&
    "opening_hours" in placeDetails &&
    placeDetails.opening_hours?.weekday_text &&
    Array.isArray(placeDetails.opening_hours.weekday_text) &&
    placeDetails.opening_hours.weekday_text.length > 0;

  // Has contact info
  const hasContactInfo =
    placeDetails && (placeDetails.formatted_phone_number || placeDetails.website);

  // Has historical facts
  const hasHistoricalFacts =
    !aiContentError &&
    sectionsVisible &&
    aiContent?.historicalFacts &&
    aiContent.historicalFacts.length > 0;

  // Has "Did You Know" facts
  const hasDidYouKnow =
    !aiContentError && sectionsVisible && aiContent?.didYouKnow && aiContent.didYouKnow.length > 0;

  // Has local tips
  const hasLocalTips =
    !aiContentError &&
    !aiContent?.isGenerating &&
    aiContent?.localTips &&
    aiContent.localTips.length > 0 &&
    sectionsVisible;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading place details...</Text>
      </View>
    );
  }

  if (!placeDetails) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#0066CC" />
        <Text style={styles.errorText}>Could not load place details</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // NEW: If PreVisitModal should be shown, render it
  if (showPreVisitModal) {
    return (
      <PreVisitModal
        place={placeDetails}
        onClose={handleBackPress}
        onStartJourney={handleStartJourney}
        onViewDetails={handleViewLimitedDetails}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Status bar with translucent background */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero Header with Image and Navigation Controls */}
      <Animated.View
        style={[
          styles.heroHeaderWrapper,
          {
            height: heroHeight,
            opacity: animations.headerOpacity,
            transform: [
              { translateY: animations.headerTranslateY },
              { scale: animations.imageScale },
            ],
          },
        ]}
      >
        <PlaceHeroHeader
          placeDetails={placeDetails}
          scrollY={scrollY}
          dynamicStyles={dynamicStyles}
          onBackPress={handleBackPress}
          onShare={handleShare}
        />
      </Animated.View>

      {/* Main Content Container that slides over image when scrolling */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            minHeight: SCREEN_HEIGHT + contentOverlap,
            transform: [{ translateY: animations.contentTranslateY }],
            borderTopLeftRadius: animations.contentBorderRadius,
            borderTopRightRadius: animations.contentBorderRadius,
          },
        ]}
        shouldRasterizeIOS={true}
        renderToHardwareTextureAndroid={true}
      >
        {/* Main Scrollable Content */}
        <Animated.ScrollView
          style={styles.contentContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: dynamicStyles.spacing.contentPadding },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16} // Keep this at 16 for 60fps scrolling
          bounces={true}
          overScrollMode="always"
          // Optimize animation with useNativeDriver where possible
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
        >
          {/* Title and badges section */}
          <View style={styles.titleContainer}>
            <PlaceTitle
              placeDetails={placeDetails}
              titleOpacity={new Animated.Value(1)}
              animationsReady={true}
              fontSize={dynamicStyles.fontSize}
              iconSize={dynamicStyles.iconSize}
            />

            {/* Place Type and Discovery Status Badges */}
            <PlaceBadges
              placeDetails={placeDetails}
              fadeAnim={new Animated.Value(1)}
              translateY={new Animated.Value(0)}
              iconSize={dynamicStyles.iconSize}
            />
          </View>

          {/* Feature Grid for quick actions - New Component */}
          <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
            <FeatureGrid features={getFeatureActions()} />
          </View>

          {/* DIFFERENT CONTENT PRESENTATION BASED ON WHETHER THE PLACE IS VISITED */}
          {placeDetails.isVisited ? (
            // VISITED PLACES - NEW ORDER OF CONTENT
            <>
              {/* 1. Discovery Details (if place was visited) */}
              {visitDate && (
                <CollapsibleCard
                  title="Discovery Details"
                  icon="calendar"
                  index={1}
                  style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
                >
                  <DiscoveryDetailsSection
                    placeDetails={placeDetails as VisitedPlaceDetails}
                    fontSize={dynamicStyles.fontSize}
                  />
                </CollapsibleCard>
              )}

              {/* 2. Address Map Preview */}
              <CollapsibleCard
                title="Address"
                icon="location"
                index={2}
                style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
              >
                <AddressSection placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
              </CollapsibleCard>

              {/* 3. AI-Enhanced Description Card */}
              <CollapsibleCard
                title="Description"
                icon="document-text"
                index={3}
                style={[styles.cardShadow, { marginBottom: dynamicStyles.spacing.cardMargin }]}
                showAiBadge={true}
              >
                <View style={styles.aiContentContainer}>
                  {aiContentError ? (
                    <TouchableOpacity style={styles.aiErrorContainer} onPress={generateAiContent}>
                      <Ionicons
                        name="refresh"
                        size={dynamicStyles.iconSize.normal}
                        color="#0066CC"
                      />
                      <Text style={styles.aiErrorText}>{aiContentError}</Text>
                    </TouchableOpacity>
                  ) : aiContent?.isGenerating ? (
                    <View style={styles.aiGeneratingContainer}>
                      <ActivityIndicator color="#0066CC" size="small" />
                      <Text style={styles.aiGeneratingText}>AI is generating insights...</Text>
                    </View>
                  ) : (
                    <TruncatedText
                      text={aiContent?.description || ""}
                      maxChars={MAX_DESCRIPTION_CHARS}
                      style={[styles.aiDescriptionText, { fontSize: dynamicStyles.fontSize.body }]}
                      viewMoreLabel="Read More"
                    />
                  )}
                </View>
              </CollapsibleCard>

              {/* 4. Historical Facts Timeline */}
              {hasHistoricalFacts && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <HistoricalTimeline aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
                </View>
              )}

              {/* 5. Did You Know Cards */}
              {hasDidYouKnow && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <DidYouKnowCards
                    aiContent={aiContent}
                    fontSize={dynamicStyles.fontSize}
                    iconSize={dynamicStyles.iconSize}
                  />
                </View>
              )}

              {/* 6. Local Tips Section */}
              {hasLocalTips && (
                <CollapsibleCard
                  title="Local Tips"
                  icon="flash"
                  index={6}
                  style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
                >
                  <LocalTipsSection aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
                </CollapsibleCard>
              )}

              {/* Supporting information cards - Optional based on data availability */}
              {hasOpeningHours && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <OpeningHoursCard placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
                </View>
              )}

              {hasContactInfo && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <ContactInfoCard
                    placeDetails={placeDetails}
                    fontSize={dynamicStyles.fontSize}
                    iconSize={dynamicStyles.iconSize}
                  />
                </View>
              )}

              {/* 7. Ask AI Section */}
              <CollapsibleCard
                title="Ask About This Place"
                icon="chatbubble-ellipses"
                index={7}
                style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
              >
                <AskAiSection
                  placeDetails={placeDetails}
                  fontSize={dynamicStyles.fontSize}
                  iconSize={dynamicStyles.iconSize}
                  isSmallScreen={dynamicStyles.isSmallScreen}
                />
              </CollapsibleCard>

              {/* 8. Journey Completion Indicator */}
              <View style={styles.journeyCompletionContainer}>
                <View style={styles.journeyDivider} />
                <View style={styles.journeyBadgeContainer}>
                  <Ionicons name="checkmark-circle" size={32} color={Colors.primary} />
                  <Text style={styles.journeyCompletionText}>Journey Completed</Text>
                  <Text style={styles.journeySubtext}>
                    You've discovered everything about this place!
                  </Text>
                </View>
              </View>
            </>
          ) : (
            // NON-VISITED PLACES OR LIMITED VIEW MODE - ORIGINAL ORDERING WITH RESTRICTIONS
            <>
              {/* AI-Enhanced Description Card */}
              <CollapsibleCard
                title="Description"
                icon="document-text"
                index={0}
                style={[styles.cardShadow, { marginBottom: dynamicStyles.spacing.cardMargin }]}
                showAiBadge={true}
              >
                <View style={styles.aiContentContainer}>
                  {aiContentError ? (
                    <TouchableOpacity style={styles.aiErrorContainer} onPress={generateAiContent}>
                      <Ionicons
                        name="refresh"
                        size={dynamicStyles.iconSize.normal}
                        color="#0066CC"
                      />
                      <Text style={styles.aiErrorText}>{aiContentError}</Text>
                    </TouchableOpacity>
                  ) : aiContent?.isGenerating ? (
                    <View style={styles.aiGeneratingContainer}>
                      <ActivityIndicator color="#0066CC" size="small" />
                      <Text style={styles.aiGeneratingText}>AI is generating insights...</Text>
                    </View>
                  ) : (
                    <TruncatedText
                      text={aiContent?.description || ""}
                      maxChars={MAX_DESCRIPTION_CHARS}
                      style={[styles.aiDescriptionText, { fontSize: dynamicStyles.fontSize.body }]}
                      viewMoreLabel="Read More"
                    />
                  )}
                </View>
              </CollapsibleCard>

              {/* Address Map Preview */}
              <CollapsibleCard
                title="Address"
                icon="location"
                index={2}
                style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
              >
                <AddressSection placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
              </CollapsibleCard>

              {/* Local Tips Section - Always show in limited view mode if available */}
              {hasLocalTips && (
                <CollapsibleCard
                  title="Local Tips"
                  icon="flash"
                  index={3}
                  style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
                >
                  <LocalTipsSection aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
                </CollapsibleCard>
              )}

              {/* Contact Information Card */}
              {hasContactInfo && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <ContactInfoCard
                    placeDetails={placeDetails}
                    fontSize={dynamicStyles.fontSize}
                    iconSize={dynamicStyles.iconSize}
                  />
                </View>
              )}

              {/* Opening Hours Card */}
              {hasOpeningHours && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <OpeningHoursCard placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
                </View>
              )}

              {/* Limited view mode message - shown for non-visited places */}
              <View style={styles.limitedViewContainer}>
                <Ionicons name="information-circle-outline" size={24} color="#888" />
                <Text style={styles.limitedViewText}>
                  You're viewing limited information. Visit this place to unlock all features and
                  earn XP.
                </Text>
                <TouchableOpacity style={styles.startJourneyButton} onPress={handleStartJourney}>
                  <Text style={styles.startJourneyButtonText}>Start Journey</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
};

// Card shadow preset for consistent styling
const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: {
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  heroHeaderWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    overflow: "hidden", // Prevent image from leaking out during scale
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    zIndex: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  backButtonFallback: {
    backgroundColor: "#0066CC",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    ...cardShadow,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9f9fb",
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 80, // Increased bottom padding
  },
  titleContainer: {
    marginBottom: 20,
  },
  aiContentContainer: {
    minHeight: 50,
    justifyContent: "center",
  },
  aiDescriptionText: {
    lineHeight: 21,
    color: "#444",
  },
  aiGeneratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  aiGeneratingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#777",
  },
  aiErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  aiErrorText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  cardShadow: {
    ...cardShadow,
  },
  bottomPadding: {
    height: 100, // Significantly increased from 30 to 100
  },
  // Styles for limited view mode
  limitedViewContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
    ...cardShadow,
  },
  limitedViewText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 8,
    lineHeight: 20,
  },
  startJourneyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    ...cardShadow,
  },
  startJourneyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // New styles for journey completion
  journeyCompletionContainer: {
    alignItems: "center",
    marginVertical: 20,
    paddingBottom: 30,
  },
  journeyDivider: {
    height: 1,
    backgroundColor: "#ddd",
    width: "80%",
    marginBottom: 20,
  },
  journeyBadgeContainer: {
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    ...cardShadow,
  },
  journeyCompletionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#444",
    marginTop: 10,
  },
  journeySubtext: {
    fontSize: 14,
    color: "#777",
    marginTop: 6,
    textAlign: "center",
  },
});

export default PlaceDetailsScreen;

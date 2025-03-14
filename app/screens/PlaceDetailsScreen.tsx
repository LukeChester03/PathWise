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
import AddressMapPreview from "../components/PlaceDetails/AddressMapPreview";
import OpeningHoursCard from "../components/PlaceDetails/OpeningHoursCard";
import HistoricalTimeline from "../components/PlaceDetails/HistoricalTimeline";
import ContactInfoCard from "../components/PlaceDetails/ContactInfoCard";
import DidYouKnowCards from "../components/PlaceDetails/DidYouKnowCards";

// Hooks
import { useAiContent } from "../hooks/AI/useAIContent";
import { useDynamicStyles } from "../hooks/Global/useDynamicStyles";

// Utils
import { formatVisitDate } from "../utils/placeUtils";

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

  // Handle back button press
  const handleBackPress = () => {
    navigation.goBack();
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
    if (!placeDetails) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate back to the map screen with the place to navigate to
    navigation.navigate(
      "Discover" as any,
      {
        navigateToPlace: placeDetails,
      } as any
    );
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

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

      {/* Fixed navigation header - only back button */}
      <Animated.View
        style={[
          styles.fixedNavHeader,
          {
            opacity: animations.navControlsOpacity,
            height: Platform.OS === "ios" ? 90 : 70,
            paddingTop: Platform.OS === "ios" ? 40 : 20,
          },
        ]}
      ></Animated.View>

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
                  <Ionicons name="refresh" size={dynamicStyles.iconSize.normal} color="#0066CC" />
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

          {/* Address Map Preview - New Component */}
          <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
            <AddressMapPreview placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
          </View>

          {/* Visit Info (if place was visited) */}
          {visitDate && (
            <CollapsibleCard
              title="Discovery Details"
              icon="calendar"
              index={2}
              style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
            >
              <DiscoveryDetailsSection
                placeDetails={placeDetails as VisitedPlaceDetails}
                fontSize={dynamicStyles.fontSize}
              />
            </CollapsibleCard>
          )}

          {/* Historical Facts Timeline - New Component */}
          {hasHistoricalFacts && (
            <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
              <HistoricalTimeline aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
            </View>
          )}

          {/* Did You Know Cards - New Component */}
          {hasDidYouKnow && (
            <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
              <DidYouKnowCards
                aiContent={aiContent}
                fontSize={dynamicStyles.fontSize}
                iconSize={dynamicStyles.iconSize}
              />
            </View>
          )}

          {/* Contact Information Card - New Component */}
          {hasContactInfo && (
            <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
              <ContactInfoCard
                placeDetails={placeDetails}
                fontSize={dynamicStyles.fontSize}
                iconSize={dynamicStyles.iconSize}
              />
            </View>
          )}

          {/* Opening Hours Card - New Component */}
          {hasOpeningHours && (
            <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
              <OpeningHoursCard placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
            </View>
          )}

          {/* Ask AI Section - Keep as CollapsibleCard since it's interactive */}
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

          {/* Local Tips Section - Keep as CollapsibleCard since it works well with the list */}
          {hasLocalTips && (
            <CollapsibleCard
              title="Local Tips"
              icon="flash"
              index={8}
              style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
            >
              <LocalTipsSection aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
            </CollapsibleCard>
          )}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </Animated.ScrollView>
      </Animated.View>
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
    paddingBottom: 32,
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
  fixedNavHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 3,
  },
  fixedNavContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  primaryBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#0066CC",
    ...cardShadow,
  },
});

export default PlaceDetailsScreen;

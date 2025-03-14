// screens/PlaceDetailsScreen.tsx
import React, { useState, useEffect } from "react";
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

// Components
import TruncatedText from "../components/PlaceDetails/TruncatedText";
import CollapsibleCard from "../components/PlaceDetails/CollapsibleCard";
import PlaceHeroHeader from "../components/PlaceDetails/PlaceHeroHeader";
import PlaceTitle from "../components/PlaceDetails/PlaceTitle";
import PlaceBadges from "../components/PlaceDetails/PlaceBadges";
import AddressSection from "../components/PlaceDetails/AddressSection";
import DiscoveryDetailsSection from "../components/PlaceDetails/DiscoveryDetails";
import HistoricalFactsSection from "../components/PlaceDetails/HistoricalFactsSection";
import DidYouKnowSection from "../components/PlaceDetails/DidYouKnowSection";
import ContactInfoSection from "../components/PlaceDetails/ContactInfoSection";
import OpeningHoursSection from "../components/PlaceDetails/OpeningHoursSection";
import AskAiSection from "../components/PlaceDetails/AskAISection";
import LocalTipsSection from "../components/PlaceDetails/LocalTipsSection";
import NavigateButton from "../components/PlaceDetails/NavigateButton";

// Hooks
import { useAiContent } from "../hooks/AI/useAIContent";
import { usePlaceAnimations } from "../hooks/Global/usePlaceAnimations";
import { useDynamicStyles } from "../hooks/Global/useDynamicStyles";

// Utils
import { formatVisitDate } from "../utils/placeUtils";

// Create the navigation and route types
type PlaceDetailsRouteProp = RouteProp<RootStackParamList, "PlaceDetails">;
type PlaceDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, "PlaceDetails">;

// Define a type for the editorial summary to fix the overview error
interface EditorialSummary {
  overview?: string;
  language?: string;
}

// Extend the Place type to include editorial_summary with the correct type
interface ExtendedPlace extends Place {
  editorial_summary?: EditorialSummary;
}

// And do the same for VisitedPlaceDetails
interface ExtendedVisitedPlaceDetails extends VisitedPlaceDetails {
  editorial_summary?: EditorialSummary;
}

// Define section IDs for collapsible sections
const SECTIONS = {
  DESCRIPTION: "description",
  ADDRESS: "address",
  DISCOVERY: "discovery",
  HISTORICAL: "historical",
  DID_YOU_KNOW: "didYouKnow",
  CONTACT: "contact",
  HOURS: "hours",
  ASK_AI: "askAi",
  LOCAL_TIPS: "localTips",
};

// Constants for description truncation
const MAX_DESCRIPTION_CHARS = 120;

// Main component
const PlaceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<PlaceDetailsNavigationProp>();
  const route = useRoute<PlaceDetailsRouteProp>();
  const { placeId, place } = route.params;

  // Dynamic styles based on screen size
  const dynamicStyles = useDynamicStyles();

  // State variables
  const [loading, setLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<
    ExtendedPlace | ExtendedVisitedPlaceDetails | null
  >(null);
  const [showFullAiContent, setShowFullAiContent] = useState(false);

  // Custom hooks
  const { aiContent, aiContentLoading, aiContentError, sectionsVisible, generateAiContent } =
    useAiContent(placeDetails);

  const {
    scrollY,
    fadeAnim,
    translateY,
    imageScale,
    headerOpacity,
    titleOpacity,
    animationsReady,
  } = usePlaceAnimations(placeDetails, loading);

  // Effect for place details loading
  useEffect(() => {
    // Set initial place details from navigation params
    if (place) {
      setPlaceDetails(place as ExtendedPlace | ExtendedVisitedPlaceDetails);
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
            } as ExtendedVisitedPlaceDetails);
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
            } as ExtendedPlace);
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
    if (placeDetails) {
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
    }
  };

  // Handle navigation to the place
  const handleNavigateToPlace = () => {
    if (placeDetails) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Navigate back to the map screen with the place to navigate to
      navigation.navigate(
        "Discover" as any,
        {
          navigateToPlace: placeDetails,
        } as any
      );
    }
  };

  const visitDate = placeDetails
    ? "visitedAt" in placeDetails
      ? formatVisitDate(placeDetails as VisitedPlaceDetails)
      : null
    : null;

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
      <PlaceHeroHeader
        placeDetails={placeDetails}
        scrollY={scrollY}
        headerOpacity={headerOpacity}
        imageScale={imageScale}
        animationsReady={animationsReady}
        dynamicStyles={dynamicStyles}
        onBackPress={handleBackPress}
        onShare={handleShare}
      />

      {/* Main Scrollable Content */}
      <Animated.ScrollView
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            marginTop: dynamicStyles.contentMarginTop,
          },
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: dynamicStyles.spacing.contentPadding },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {/* Place Title and Rating */}
        <PlaceTitle
          placeDetails={placeDetails}
          titleOpacity={titleOpacity}
          animationsReady={animationsReady}
          fontSize={dynamicStyles.fontSize}
          iconSize={dynamicStyles.iconSize}
        />

        {/* Place Type and Discovery Status Badges */}
        <PlaceBadges
          placeDetails={placeDetails}
          fadeAnim={fadeAnim}
          translateY={translateY}
          iconSize={dynamicStyles.iconSize}
        />

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

        {/* Address */}
        <CollapsibleCard
          title="Address"
          icon="location"
          index={1}
          style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
        >
          <AddressSection placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
        </CollapsibleCard>

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

        {/* AI-Generated Historical Facts */}
        {!aiContentError && sectionsVisible && (
          <CollapsibleCard
            title="Historical Facts"
            icon="time"
            index={3}
            showAiBadge={true}
            style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
          >
            <HistoricalFactsSection aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
          </CollapsibleCard>
        )}

        {/* Did You Know Section */}
        {!aiContentError && sectionsVisible && (
          <CollapsibleCard
            title="Did You Know?"
            icon="bulb"
            index={4}
            showAiBadge={true}
            style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
          >
            <DidYouKnowSection
              aiContent={aiContent}
              fontSize={dynamicStyles.fontSize}
              iconSize={dynamicStyles.iconSize}
            />
          </CollapsibleCard>
        )}

        {/* Contact Information */}
        {("formatted_phone_number" in placeDetails && placeDetails.formatted_phone_number) ||
        ("website" in placeDetails && placeDetails.website) ? (
          <CollapsibleCard
            title="Contact"
            icon="call"
            index={5}
            style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
          >
            <ContactInfoSection
              placeDetails={placeDetails}
              fontSize={dynamicStyles.fontSize}
              iconSize={dynamicStyles.iconSize}
            />
          </CollapsibleCard>
        ) : null}

        {/* Opening Hours */}
        {"opening_hours" in placeDetails && placeDetails.opening_hours?.weekday_text && (
          <CollapsibleCard
            title="Opening Hours"
            icon="time-outline"
            index={6}
            style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
          >
            <OpeningHoursSection placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
          </CollapsibleCard>
        )}

        {/* Ask AI Section */}
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

        {/* Local Tips Section */}
        {!aiContentError &&
          !aiContent?.isGenerating &&
          aiContent?.localTips.length > 0 &&
          sectionsVisible && (
            <CollapsibleCard
              title="Local Tips"
              icon="flash"
              index={8}
              showAiBadge={true}
              style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
            >
              <LocalTipsSection aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
            </CollapsibleCard>
          )}

        {/* Navigation Button */}
        <NavigateButton
          fadeAnim={fadeAnim}
          translateY={translateY}
          iconSize={dynamicStyles.iconSize}
          onPress={handleNavigateToPlace}
        />

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
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
    backgroundColor: "#fff",
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    zIndex: 3,
    ...cardShadow,
  },
  scrollContent: {
    paddingBottom: 30,
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
    height: 30,
  },
});

export default PlaceDetailsScreen;

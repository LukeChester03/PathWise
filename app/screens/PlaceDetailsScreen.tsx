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
import { RootStackParamList } from "../navigation/types";
import { Place, VisitedPlaceDetails } from "../types/MapTypes";
import { getVisitedPlaceDetails } from "../handlers/Map/visitedPlacesHandlers";
import TruncatedText from "../components/PlaceDetails/TruncatedText";
import CollapsibleCard from "../components/PlaceDetails/CollapsibleCard";
import PlaceHeroHeader from "../components/PlaceDetails/PlaceHeroHeader";
import PlaceTitle from "../components/PlaceDetails/PlaceTitle";
import PlaceBadges from "../components/PlaceDetails/PlaceBadges";
import DiscoveryDetailsSection from "../components/PlaceDetails/DiscoveryDetails";
import AskAiSection from "../components/PlaceDetails/AskAISection";
import LocalTipsSection from "../components/PlaceDetails/LocalTipsSection";
import NavigateButton from "../components/PlaceDetails/NavigateButton";
import FeatureGrid from "../components/PlaceDetails/FeatureGrid";
import OpeningHoursCard from "../components/PlaceDetails/OpeningHoursCard";
import HistoricalTimeline from "../components/PlaceDetails/HistoricalTimeline";
import ContactInfoCard from "../components/PlaceDetails/ContactInfoCard";
import DidYouKnowCards from "../components/PlaceDetails/DidYouKnowCards";
import PreVisitModal from "../components/PlaceDetails/PreVisitModal";
import { useAiContent } from "../hooks/AI/useAIContent";
import { useDynamicStyles } from "../hooks/Global/useDynamicStyles";
import { formatVisitDate } from "../utils/placeUtils";
import AddressSection from "../components/PlaceDetails/AddressSection";
import { Colors } from "../constants/colours";
import NavigationService from "../services/Map/navigationService";
import MapLoading from "../components/Map/MapLoading";

type PlaceDetailsRouteProp = RouteProp<RootStackParamList, "PlaceDetails">;
type PlaceDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, "PlaceDetails">;
const MAX_DESCRIPTION_CHARS = 120;
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const PlaceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<PlaceDetailsNavigationProp>();
  const route = useRoute<PlaceDetailsRouteProp>();
  const { placeId, place } = route.params;
  const dynamicStyles = useDynamicStyles();
  const heroHeight = useMemo(() => dynamicStyles.heroHeight, [dynamicStyles.heroHeight]);
  const contentOverlap = useMemo(() => 40, []);
  const translateThreshold = useMemo(
    () => heroHeight - contentOverlap,
    [heroHeight, contentOverlap]
  );

  const [loading, setLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<Place | VisitedPlaceDetails | null>(null);
  const [showFullAiContent, setShowFullAiContent] = useState(false);
  const [showPreVisitModal, setShowPreVisitModal] = useState(false);
  const [limitedViewMode, setLimitedViewMode] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const animations = useMemo(() => {
    const headerTranslateY = scrollY.interpolate({
      inputRange: [-heroHeight, 0, translateThreshold],
      outputRange: [heroHeight / 2, 0, -heroHeight / 5],
      extrapolate: "clamp",
    });
    const imageScale = scrollY.interpolate({
      inputRange: [-100, 0],
      outputRange: [1.15, 1],
      extrapolate: "clamp",
    });

    const headerOpacity = scrollY.interpolate({
      inputRange: [0, translateThreshold, translateThreshold + 50],
      outputRange: [1, 1, 0.98],
      extrapolate: "clamp",
    });

    const contentTranslateY = scrollY.interpolate({
      inputRange: [-1, 0, translateThreshold],
      outputRange: [heroHeight - contentOverlap + 1, heroHeight - contentOverlap, 0],
      extrapolate: "clamp",
    });

    const contentBorderRadius = scrollY.interpolate({
      inputRange: [0, translateThreshold * 0.8],
      outputRange: [24, 0],
      extrapolate: "clamp",
    });

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

  const { aiContent, aiContentLoading, aiContentError, sectionsVisible, generateAiContent } =
    useAiContent(placeDetails);

  useEffect(() => {
    if (place) {
      setPlaceDetails(place);
    }

    const fetchDetails = async () => {
      if (placeId) {
        setLoading(true);
        try {
          const visitedDetails = await getVisitedPlaceDetails(placeId);

          if (visitedDetails) {
            setPlaceDetails({
              ...place,
              ...visitedDetails,
              isVisited: true,
            } as VisitedPlaceDetails);
          } else if (!place) {
            setPlaceDetails({
              place_id: placeId,
              name: "Loading place...",
              geometry: {
                location: {
                  lat: 0,
                  lng: 0,
                },
              },
              website: null,
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
  useEffect(() => {
    if (placeDetails && !loading) {
      const isVisited = "isVisited" in placeDetails && placeDetails.isVisited === true;

      if (!isVisited) {
        setShowPreVisitModal(true);
      }
    }
  }, [placeDetails, loading]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleStartJourney = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (placeDetails) {
        console.log(`PlaceDetailsScreen: Starting journey for ${placeDetails.name}`);

        const placeToShow = JSON.parse(JSON.stringify(placeDetails));
        setShowPreVisitModal(false);
        setTimeout(() => {
          NavigationService.showDiscoverCard(navigation, placeToShow);
        }, 100);
      }
    } catch (error) {
      console.error("PlaceDetailsScreen: Error starting journey:", error);
    }
  };

  const handleViewLimitedDetails = () => {
    setShowPreVisitModal(false);
    setLimitedViewMode(true);
  };

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
        url: shareUrl,
      });
    } catch (error) {
      console.error("Error sharing place:", error);
    }
  };

  const handleNavigateToPlace = () => {
    try {
      if (!placeDetails) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log(`PlaceDetailsScreen: Navigating to ${placeDetails.name}`);
      const placeToShow = JSON.parse(JSON.stringify(placeDetails));
      setTimeout(() => {
        NavigationService.showDiscoverCard(navigation, placeToShow);
      }, 100);
    } catch (error) {
      console.error("PlaceDetailsScreen: Error navigating to place:", error);
    }
  };

  const handleCallPress = () => {
    if (placeDetails?.formatted_phone_number) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(`tel:${placeDetails.formatted_phone_number}`);
    }
  };

  const handleWebsitePress = () => {
    if (placeDetails?.website) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Linking.openURL(placeDetails.website);
    }
  };

  const getFeatureActions = () => {
    if (!placeDetails) return [];

    const actions = [
      {
        title: "Navigate",
        icon: "navigate",
        onPress: handleNavigateToPlace,
        color: "#4CAF50",
      },
      {
        title: "Share",
        icon: "share-social",
        onPress: handleShare,
        color: "#FF9800",
      },
    ];

    if (placeDetails.formatted_phone_number) {
      actions.push({
        title: "Call",
        icon: "call",
        onPress: handleCallPress,
        color: "#2196F3",
      });
    }

    if (placeDetails.website) {
      actions.push({
        title: "Website",
        icon: "globe",
        onPress: handleWebsitePress,
        color: "#9C27B0",
      });
    }

    return actions;
  };

  const hasVisitDate = placeDetails && "visitedAt" in placeDetails && placeDetails.visitedAt;
  const visitDate = hasVisitDate ? formatVisitDate(placeDetails as VisitedPlaceDetails) : null;

  const hasOpeningHours =
    placeDetails &&
    "opening_hours" in placeDetails &&
    placeDetails.opening_hours?.weekday_text &&
    Array.isArray(placeDetails.opening_hours.weekday_text) &&
    placeDetails.opening_hours.weekday_text.length > 0;

  const hasContactInfo =
    placeDetails && (placeDetails.formatted_phone_number || placeDetails.website);

  const hasHistoricalFacts =
    !aiContentError &&
    sectionsVisible &&
    aiContent?.historicalFacts &&
    aiContent.historicalFacts.length > 0;

  const hasDidYouKnow =
    !aiContentError && sectionsVisible && aiContent?.didYouKnow && aiContent.didYouKnow.length > 0;

  const hasLocalTips =
    !aiContentError &&
    !aiContent?.isGenerating &&
    aiContent?.localTips &&
    aiContent.localTips.length > 0 &&
    sectionsVisible;

  if (loading) {
    return <MapLoading />;
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
        <Animated.ScrollView
          style={styles.contentContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: dynamicStyles.spacing.contentPadding },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces={true}
          overScrollMode="always"
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
        >
          <View style={styles.titleContainer}>
            <PlaceTitle
              placeDetails={placeDetails}
              titleOpacity={new Animated.Value(1)}
              animationsReady={true}
              fontSize={dynamicStyles.fontSize}
              iconSize={dynamicStyles.iconSize}
            />

            <PlaceBadges
              placeDetails={placeDetails}
              fadeAnim={new Animated.Value(1)}
              translateY={new Animated.Value(0)}
              iconSize={dynamicStyles.iconSize}
            />
          </View>
          <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
            <FeatureGrid features={getFeatureActions()} />
          </View>

          {placeDetails.isVisited ? (
            <>
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

              <CollapsibleCard
                title="Address"
                icon="location"
                index={2}
                style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
              >
                <AddressSection placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
              </CollapsibleCard>
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
              {hasHistoricalFacts && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <HistoricalTimeline aiContent={aiContent} fontSize={dynamicStyles.fontSize} />
                </View>
              )}
              {hasDidYouKnow && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <DidYouKnowCards
                    aiContent={aiContent}
                    fontSize={dynamicStyles.fontSize}
                    iconSize={dynamicStyles.iconSize}
                  />
                </View>
              )}
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
              {hasOpeningHours && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <OpeningHoursCard placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
                </View>
              )}
              {/* 
              {hasContactInfo && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <ContactInfoCard
                    placeDetails={placeDetails}
                    fontSize={dynamicStyles.fontSize}
                    iconSize={dynamicStyles.iconSize}
                  />
                </View>
              )} */}

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
            <>
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
              <CollapsibleCard
                title="Address"
                icon="location"
                index={2}
                style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
              >
                <AddressSection placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
              </CollapsibleCard>

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

              {/* {hasContactInfo && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <ContactInfoCard
                    placeDetails={placeDetails}
                    fontSize={dynamicStyles.fontSize}
                    iconSize={dynamicStyles.iconSize}
                  />
                </View>
              )} */}

              {hasOpeningHours && (
                <View style={{ marginBottom: dynamicStyles.spacing.cardMargin }}>
                  <OpeningHoursCard placeDetails={placeDetails} fontSize={dynamicStyles.fontSize} />
                </View>
              )}

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

          <View style={styles.bottomPadding} />
        </Animated.ScrollView>
      </Animated.View>
    </View>
  );
};

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
    overflow: "hidden",
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
    paddingBottom: 80,
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
    height: 100,
  },
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

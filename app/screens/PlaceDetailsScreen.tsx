// screens/PlaceDetailsScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Share,
  Platform,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
  TextInput,
  LayoutAnimation,
  UIManager,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Colors, NeutralColors } from "../constants/colours";
import { Place, VisitedPlaceDetails } from "../types/MapTypes";
import { RootStackParamList } from "../navigation/types";
import { getVisitedPlaceDetails } from "../handlers/Map/visitedPlacesHandlers";
import { GOOGLE_MAPS_APIKEY } from "../constants/Map/mapConstants";
import {
  AiGeneratedContent,
  AiInsight,
  fetchAllAiContentWithContext,
  askAboutPlace,
} from "../services/Gemini/placeAiService";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// Animation timing constants
const FADE_IN_DURATION = 400;
const STAGGER_DELAY = 80;
const HERO_ANIMATION_DURATION = 600;

// Constants for description truncation
const MAX_DESCRIPTION_CHARS = 120;
const MAX_INSIGHT_CHARS = 80;

// Custom spring animation preset
const springConfig = {
  tension: 50,
  friction: 7,
  useNativeDriver: true,
};

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

// Truncate text with view more option
const TruncatedText = ({ text, maxChars, style, viewMoreLabel = "View More" }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const isTruncated = text.length > maxChars;
  const displayText = !expanded && isTruncated ? text.substring(0, maxChars) + "..." : text;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  return (
    <View>
      <Text style={style}>{displayText}</Text>
      {isTruncated && (
        <TouchableOpacity onPress={toggleExpanded} style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>{expanded ? "Show Less" : viewMoreLabel}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Collapsible Card Component
const CollapsibleCard = ({
  title,
  children,
  icon,
  index = 0,
  style = {},
  titleStyle = {},
  isExpandable = true,
  initiallyExpanded = true,
  showAiBadge = false,
  animationDelay = 0,
  onToggle = () => {},
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(expanded ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      delay: STAGGER_DELAY * index + animationDelay,
      ...springConfig,
    }).start();
  }, [index, animationDelay]);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start();
  }, [expanded]);

  const toggleExpanded = () => {
    if (!isExpandable) return;

    LayoutAnimation.configureNext({
      ...LayoutAnimation.Presets.easeInEaseOut,
      duration: 250,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
    onToggle(!expanded);
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View
      style={[
        styles.collapsibleCard,
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Pressable
        onPress={toggleExpanded}
        style={[styles.cardHeader, !expanded && styles.cardHeaderClosed]}
      >
        <View style={styles.cardTitleContainer}>
          {icon && (
            <View style={styles.cardIconContainer}>
              <Ionicons name={icon} size={18} color={Colors.primary} />
            </View>
          )}
          <Text style={[styles.cardTitle, titleStyle]}>{title}</Text>
          {showAiBadge && (
            <View style={styles.aiPill}>
              <Ionicons name="sparkles" size={10} color="#fff" />
              <Text style={styles.aiPillText}>AI</Text>
            </View>
          )}
        </View>

        {isExpandable && (
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={18} color={Colors.primary} />
          </Animated.View>
        )}
      </Pressable>

      {expanded && <View style={styles.cardContent}>{children}</View>}
    </Animated.View>
  );
};

// Main component
const PlaceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<PlaceDetailsNavigationProp>();
  const route = useRoute<PlaceDetailsRouteProp>();
  const { placeId, place } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenWidth < 375; // Check for smaller devices like iPhone SE

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  // State variables
  const [loading, setLoading] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<
    ExtendedPlace | ExtendedVisitedPlaceDetails | null
  >(null);
  const [aiContent, setAiContent] = useState<AiGeneratedContent | null>(null);
  const [aiContentLoading, setAiContentLoading] = useState(false);
  const [aiContentError, setAiContentError] = useState<string | null>(null);
  const [showFullAiContent, setShowFullAiContent] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [sectionsVisible, setSectionsVisible] = useState(false);

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

  // Effect for AI content generation
  useEffect(() => {
    if (placeDetails && !aiContent && !aiContentLoading) {
      generateAiContent();
    }
  }, [placeDetails]);

  const generateAiContent = async () => {
    if (!placeDetails) return;

    setAiContentLoading(true);
    setAiContentError(null);

    try {
      // Mark that AI is generating content
      setAiContent({
        description: "",
        historicalFacts: [],
        culturalInsights: [],
        didYouKnow: [],
        localTips: [],
        isGenerating: true,
      });

      // Use the enhanced version with location context
      const content = await fetchAllAiContentWithContext(placeDetails);
      setAiContent(content);

      // Show sections after AI content is loaded
      setTimeout(() => {
        setSectionsVisible(true);
      }, 300);
    } catch (error) {
      console.error("Error generating AI content:", error);
      setAiContentError("Failed to generate AI content. Tap to retry.");
    } finally {
      setAiContentLoading(false);
    }
  };

  // Effect for animations
  useEffect(() => {
    if (placeDetails && !loading) {
      // Delay to ensure everything is loaded
      setTimeout(() => {
        setAnimationsReady(true);

        // Run entry animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: FADE_IN_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: FADE_IN_DURATION,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: FADE_IN_DURATION,
            delay: HERO_ANIMATION_DURATION / 2,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.sequence([
            Animated.timing(imageScale, {
              toValue: 1.03,
              duration: HERO_ANIMATION_DURATION,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(imageScale, {
              toValue: 1,
              duration: HERO_ANIMATION_DURATION * 0.5,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.cubic),
            }),
          ]),
        ]).start();
      }, 200);
    }
  }, [placeDetails, loading]);

  // Convert scrollY to header animations
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 60],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 150, 250],
    outputRange: [1, 0.8, 0.6],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.3, 0],
    extrapolate: "clamp",
  });

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [0, 70, 100],
    outputRange: [0, 0.7, 1],
    extrapolate: "clamp",
  });

  // Function to handle asking a question to AI
  const handleAskAiQuestion = async () => {
    if (!aiQuestion.trim() || !placeDetails) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGeneratingAnswer(true);
    setAiAnswer("");

    try {
      const answer = await askAboutPlace(placeDetails, aiQuestion);
      setAiAnswer(answer);
    } catch (error) {
      console.error("Error asking AI question:", error);
      setAiAnswer(
        "I'm sorry, I couldn't process your question at the moment. Please try again later."
      );
    } finally {
      setIsGeneratingAnswer(false);
      // Clear the question for next input
      setAiQuestion("");
    }
  };

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

  // Get photo URL
  const getPhotoUrl = () => {
    if (!placeDetails) return "";

    if (
      placeDetails.photos &&
      placeDetails.photos.length > 0 &&
      placeDetails.photos[0]?.photo_reference
    ) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${placeDetails.photos[0].photo_reference}&key=${GOOGLE_MAPS_APIKEY}`;
    }
    return `https://via.placeholder.com/800x400/f0f0f0/666666?text=${encodeURIComponent(
      placeDetails.name?.substring(0, 15) || "Place"
    )}`;
  };

  // Format the address for display
  const getAddress = () => {
    if (!placeDetails) return "No address available";
    return placeDetails.formatted_address || placeDetails.vicinity || "No address available";
  };

  // Format the visit date in a readable way
  const formatVisitDate = () => {
    if (!placeDetails) return null;

    if ("visitedAt" in placeDetails && placeDetails.visitedAt) {
      const date = new Date(placeDetails.visitedAt);
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return null;
  };

  // Get category/type of place
  const getPlaceType = () => {
    if (
      !placeDetails ||
      !placeDetails.types ||
      !Array.isArray(placeDetails.types) ||
      placeDetails.types.length === 0
    ) {
      return null;
    }

    const TYPE_MAPPING: { [key: string]: { label: string; icon: string } } = {
      restaurant: { label: "Restaurant", icon: "restaurant" },
      cafe: { label: "Café", icon: "cafe" },
      bar: { label: "Bar", icon: "beer" },
      food: { label: "Food", icon: "fast-food" },
      store: { label: "Store", icon: "basket" },
      museum: { label: "Museum", icon: "business" },
      art_gallery: { label: "Gallery", icon: "color-palette" },
      park: { label: "Park", icon: "leaf" },
      tourist_attraction: { label: "Attraction", icon: "camera" },
      hotel: { label: "Hotel", icon: "bed" },
      movie_theater: { label: "Cinema", icon: "film" },
      night_club: { label: "Nightclub", icon: "wine" },
      zoo: { label: "Zoo", icon: "paw" },
    };

    for (const type of placeDetails.types) {
      if (TYPE_MAPPING[type]) {
        return TYPE_MAPPING[type];
      }
    }

    // If no direct match found, use the first type as a fallback
    return {
      label: placeDetails.types[0].replace(/_/g, " "),
      icon: "location",
    };
  };

  const placeType = getPlaceType();
  const visitDate = formatVisitDate();

  // Calculate dynamic styles based on screen size
  const dynamicStyles = {
    heroHeight: screenHeight < 700 ? 220 : 260,
    contentMarginTop: screenHeight < 700 ? 180 : 220,
    fontSize: {
      title: isSmallScreen ? 22 : 24,
      body: isSmallScreen ? 14 : 15,
      small: isSmallScreen ? 12 : 13,
      smaller: isSmallScreen ? 11 : 12,
    },
    iconSize: {
      header: isSmallScreen ? 20 : 22,
      normal: isSmallScreen ? 16 : 18,
      small: isSmallScreen ? 14 : 16,
      smaller: isSmallScreen ? 12 : 14,
    },
    spacing: {
      cardMargin: isSmallScreen ? 10 : 12,
      cardPadding: isSmallScreen ? 12 : 14,
      contentPadding: isSmallScreen ? 14 : 16,
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading place details...</Text>
      </View>
    );
  }

  if (!placeDetails) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.primary} />
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

      {/* Animated Hero Image with Scale and Parallax */}
      <Animated.View
        style={[
          styles.heroContainer,
          {
            height: dynamicStyles.heroHeight,
            transform: [{ scale: imageScale }, { translateY: imageTranslateY }],
            opacity: imageOpacity,
          },
        ]}
      >
        <Animated.Image
          source={{ uri: getPhotoUrl() }}
          style={[styles.heroImage, { opacity: animationsReady ? 1 : 0 }]}
          onLoadEnd={() => {
            // Ensure image is loaded before animations
            if (!animationsReady) {
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          }}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]}
          style={styles.headerGradient}
        />
      </Animated.View>

      {/* Floating header with back button, title and share button */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
            paddingHorizontal: dynamicStyles.spacing.contentPadding,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            { width: isSmallScreen ? 32 : 36, height: isSmallScreen ? 32 : 36 },
          ]}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={dynamicStyles.iconSize.header} color="#fff" />
        </TouchableOpacity>

        <Animated.Text
          style={[styles.headerTitle, { opacity: headerTitleOpacity }]}
          numberOfLines={1}
        >
          {placeDetails.name}
        </Animated.Text>

        <TouchableOpacity
          style={[
            styles.shareButton,
            { width: isSmallScreen ? 32 : 36, height: isSmallScreen ? 32 : 36 },
          ]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={dynamicStyles.iconSize.header} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

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
        {/* Animated Title Section */}
        <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
          <Text style={[styles.placeName, { fontSize: dynamicStyles.fontSize.title }]}>
            {placeDetails.name}
          </Text>

          {placeDetails.rating !== undefined && (
            <Animated.View
              style={[
                styles.ratingContainer,
                {
                  transform: [{ translateY: animationsReady ? 0 : 20 }],
                  opacity: animationsReady ? 1 : 0,
                },
              ]}
            >
              <Ionicons name="star" size={dynamicStyles.iconSize.small} color="#FFD700" />
              <Text style={styles.ratingText}>{placeDetails.rating.toFixed(1)}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Badges Row */}
        <Animated.View
          style={[
            styles.badgesContainer,
            {
              transform: [{ translateY: translateY }],
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Place Type Badge */}
          {placeType && (
            <View style={styles.typeBadge}>
              <Ionicons
                name={placeType.icon}
                size={dynamicStyles.iconSize.smaller}
                color={Colors.primary}
              />
              <Text style={styles.typeText}>{placeType.label}</Text>
            </View>
          )}

          {/* Discovery Status Badge */}
          {"isVisited" in placeDetails && placeDetails.isVisited && (
            <View style={styles.visitedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={dynamicStyles.iconSize.smaller}
                color={Colors.primary}
              />
              <Text style={styles.visitedText}>Discovered</Text>
            </View>
          )}
        </Animated.View>

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
                  color={Colors.primary}
                />
                <Text style={styles.aiErrorText}>{aiContentError}</Text>
              </TouchableOpacity>
            ) : aiContent?.isGenerating ? (
              <View style={styles.aiGeneratingContainer}>
                <ActivityIndicator color={Colors.primary} size="small" />
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
          <View style={styles.addressContainer}>
            <Text style={[styles.addressText, { fontSize: dynamicStyles.fontSize.body }]}>
              {getAddress()}
            </Text>
          </View>
        </CollapsibleCard>

        {/* Visit Info (if place was visited) */}
        {visitDate && (
          <CollapsibleCard
            title="Discovery Details"
            icon="calendar"
            index={2}
            style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
          >
            <View style={styles.visitContainer}>
              <Text style={[styles.visitText, { fontSize: dynamicStyles.fontSize.body }]}>
                Discovered on {visitDate}
              </Text>
            </View>
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
            {aiContent?.isGenerating ? (
              <View style={styles.aiGeneratingContainer}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.aiGeneratingText}>Discovering historical information...</Text>
              </View>
            ) : (
              aiContent?.historicalFacts.map((fact, index) => (
                <View key={index} style={styles.factItem}>
                  <View style={styles.factBullet}>
                    <Text style={styles.factBulletText}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.factText, { fontSize: dynamicStyles.fontSize.body }]}>
                    {fact}
                  </Text>
                </View>
              ))
            )}
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
            {aiContent?.isGenerating ? (
              <View style={styles.aiGeneratingContainer}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.aiGeneratingText}>Finding interesting facts...</Text>
              </View>
            ) : (
              <View style={styles.didYouKnowContainer}>
                {aiContent?.didYouKnow
                  .slice(0, showFullAiContent ? undefined : 2)
                  .map((fact, index) => (
                    <View key={index} style={styles.didYouKnowItem}>
                      <Ionicons
                        name="information-circle"
                        size={dynamicStyles.iconSize.normal}
                        color={Colors.primary}
                        style={styles.didYouKnowIcon}
                      />
                      <TruncatedText
                        text={fact}
                        maxChars={MAX_INSIGHT_CHARS}
                        style={[styles.didYouKnowText, { fontSize: dynamicStyles.fontSize.body }]}
                      />
                    </View>
                  ))}

                {!showFullAiContent && aiContent?.didYouKnow.length > 2 && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowFullAiContent(true);
                    }}
                  >
                    <Text style={styles.seeMoreText}>Show more facts</Text>
                    <Ionicons name="chevron-down" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
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
            {"formatted_phone_number" in placeDetails && placeDetails.formatted_phone_number && (
              <View style={styles.contactContainer}>
                <Ionicons
                  name="call"
                  size={dynamicStyles.iconSize.small}
                  color={Colors.primary}
                  style={styles.contactIcon}
                />
                <Text style={[styles.contactText, { fontSize: dynamicStyles.fontSize.body }]}>
                  {placeDetails.formatted_phone_number}
                </Text>
              </View>
            )}

            {"website" in placeDetails && placeDetails.website && (
              <View style={styles.contactContainer}>
                <Ionicons
                  name="globe"
                  size={dynamicStyles.iconSize.small}
                  color={Colors.primary}
                  style={styles.contactIcon}
                />
                <Text
                  style={[styles.contactText, { fontSize: dynamicStyles.fontSize.body }]}
                  numberOfLines={1}
                >
                  {placeDetails.website}
                </Text>
              </View>
            )}
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
            {placeDetails.opening_hours.weekday_text.map((day, index) => (
              <Text
                key={index}
                style={[styles.hoursText, { fontSize: dynamicStyles.fontSize.body }]}
              >
                {day}
              </Text>
            ))}
          </CollapsibleCard>
        )}

        {/* Ask AI Section */}
        <CollapsibleCard
          title="Ask About This Place"
          icon="chatbubble-ellipses"
          index={7}
          style={{ marginBottom: dynamicStyles.spacing.cardMargin }}
        >
          <View style={styles.askAiInputContainer}>
            <TextInput
              style={[styles.askAiInput, { fontSize: dynamicStyles.fontSize.body }]}
              placeholder="e.g., What's the best time to visit?"
              placeholderTextColor="#999"
              value={aiQuestion}
              onChangeText={setAiQuestion}
              onSubmitEditing={handleAskAiQuestion}
            />
            <TouchableOpacity
              style={[
                styles.askAiButton,
                !aiQuestion.trim() ? styles.askAiButtonDisabled : {},
                { width: isSmallScreen ? 34 : 38, height: isSmallScreen ? 34 : 38 },
              ]}
              onPress={handleAskAiQuestion}
              disabled={!aiQuestion.trim() || isGeneratingAnswer}
              activeOpacity={0.8}
            >
              {isGeneratingAnswer ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={dynamicStyles.iconSize.small} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {aiAnswer && (
            <View style={styles.aiAnswerContainer}>
              <View style={styles.aiAnswerIconContainer}>
                <Ionicons name="sparkles" size={dynamicStyles.iconSize.smaller} color="#fff" />
              </View>
              <View style={styles.aiAnswerContent}>
                <TruncatedText
                  text={aiAnswer}
                  maxChars={120}
                  style={[styles.aiAnswerText, { fontSize: dynamicStyles.fontSize.body }]}
                />
              </View>
            </View>
          )}
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
              <View style={styles.localTipsContainer}>
                {aiContent.localTips.map((tip, index) => (
                  <View key={index} style={styles.localTipItem}>
                    <View style={styles.tipNumberContainer}>
                      <Text style={styles.tipNumberText}>{index + 1}</Text>
                    </View>
                    <TruncatedText
                      text={tip}
                      maxChars={MAX_INSIGHT_CHARS}
                      style={[styles.localTipText, { fontSize: dynamicStyles.fontSize.body }]}
                    />
                  </View>
                ))}
              </View>
            </CollapsibleCard>
          )}

        {/* Navigation Button */}
        <Animated.View
          style={[
            {
              opacity: fadeAnim,
              transform: [{ translateY }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigateToPlace}
            activeOpacity={0.9}
          >
            <Ionicons
              name="navigate"
              size={dynamicStyles.iconSize.normal}
              color="#fff"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Navigate Here</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    backgroundColor: Colors.primary,
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
  heroContainer: {
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    zIndex: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    ...cardShadow,
  },
  shareButton: {
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    ...cardShadow,
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
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  placeName: {
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 4,
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 5,
  },
  visitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  visitedText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginLeft: 5,
  },
  // Collapsible Card Styles
  collapsibleCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
  },
  cardHeaderClosed: {
    borderBottomWidth: 0,
  },
  cardContent: {
    padding: 14,
    paddingTop: 0,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIconContainer: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  cardShadow: {
    ...cardShadow,
  },
  // AI Content Styles
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
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  aiPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 2,
  },
  // Info Section Styles
  addressContainer: {
    paddingVertical: 6,
  },
  addressText: {
    color: "#444",
    lineHeight: 20,
  },
  visitContainer: {
    paddingVertical: 6,
  },
  visitText: {
    color: "#444",
  },
  factItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  factBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 1,
  },
  factBulletText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  factText: {
    color: "#444",
    flex: 1,
    lineHeight: 20,
  },
  didYouKnowContainer: {
    marginTop: 6,
  },
  didYouKnowItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#f1f7ff",
    padding: 12,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  didYouKnowIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  didYouKnowText: {
    color: "#444",
    flex: 1,
    lineHeight: 20,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 4,
  },
  viewMoreText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginRight: 4,
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    marginTop: 4,
  },
  seeMoreText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginRight: 4,
  },
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  contactText: {
    color: "#444",
    flex: 1,
  },
  contactIcon: {
    marginRight: 8,
  },
  hoursText: {
    color: "#444",
    marginBottom: 6,
  },
  // Ask AI Section Styles
  askAiInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  askAiInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#333",
    marginRight: 8,
  },
  askAiButton: {
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...cardShadow,
  },
  askAiButtonDisabled: {
    backgroundColor: "#ccc",
  },
  aiAnswerContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f7ff",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  aiAnswerIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  aiAnswerContent: {
    flex: 1,
  },
  aiAnswerText: {
    color: "#444",
    lineHeight: 20,
  },
  // Local Tips Styles
  localTipsContainer: {
    marginTop: 6,
  },
  localTipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tipNumberContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 1,
  },
  tipNumberText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  localTipText: {
    flex: 1,
    color: "#444",
    lineHeight: 20,
  },
  // Navigation Button Styles
  navigateButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    ...cardShadow,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  bottomPadding: {
    height: 30,
  },
});

export default PlaceDetailsScreen;

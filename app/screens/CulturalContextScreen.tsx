// screens/CulturalContextScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Animated,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { globalStyles } from "../constants/globalStyles";
import { Colors, NeutralColors } from "../constants/colours";
import Header from "../components/Global/Header";
import {
  getCulturalInsights,
  getSuggestedRegions,
  getAllCachedInsights,
  getCulturalInsightsForVisitedPlaces,
  checkRequestLimit,
} from "../services/LearnScreen/aiCulturalService";
import {
  EnhancedCulturalInsight,
  Custom,
  Recommendation,
} from "../types/LearnScreen/CulturalContextTypes";
import { VisitedPlaceDetails } from "../types/MapTypes";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#7E22CE", // Deep purple
  primaryDark: "#6B21A8", // Darker purple
  primaryLight: "#F5F3FF", // Light purple background
  primaryMedium: "#E9D5FF", // Medium purple
  accent: "#9333EA", // Accent purple
  accent2: "#F472B6", // Pink accent
  accent3: "#60A5FA", // Blue accent
  accent4: "#34D399", // Green accent
  background: "#FFFFFF",
  surface: "#F9FAFB",
  cardBackground: "#FFFFFF",
  text: "#1F2937",
  textSecondary: "#4B5563",
  textLight: "#6B7280",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  border: "#E5E7EB",
  divider: "#F3F4F6",
};

type CulturalContextScreenProps = {
  route: {
    params: {
      visitedPlaces: VisitedPlaceDetails[];
      region?: string;
    };
  };
  navigation: any;
};

const CulturalContextScreen = ({ route, navigation }: CulturalContextScreenProps) => {
  const { visitedPlaces, region } = route.params;
  const insets = useSafeAreaInsets();
  const scrollY = new Animated.Value(0);
  const flatListRef = useRef<FlatList>(null);

  // State for UI components
  const [activeView, setActiveView] = useState<"visited" | "explore">("visited");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(region || null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("overview");

  // Data states
  const [visitedInsights, setVisitedInsights] = useState<EnhancedCulturalInsight[]>([]);
  const [suggestedRegions, setSuggestedRegions] = useState<string[]>([]);
  const [filteredRegions, setFilteredRegions] = useState<string[]>([]);
  const [currentInsight, setCurrentInsight] = useState<EnhancedCulturalInsight | null>(null);
  const [requestLimitInfo, setRequestLimitInfo] = useState<{
    canRequest: boolean;
    requestsRemaining: number;
    nextAvailableTime?: string;
  }>({ canRequest: true, requestsRemaining: 5 });

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingInsight, setLoadingInsight] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Sections for journey navigation - removed the places section
  const sections = [
    { id: "overview", title: "Overview", icon: "globe-outline" },
    { id: "customs", title: "Customs", icon: "book-outline" },
    { id: "etiquette", title: "Etiquette", icon: "hand-left-outline" },
    { id: "dining", title: "Dining", icon: "restaurant-outline" },
    { id: "tips", title: "Tips", icon: "bulb-outline" },
  ];

  // Animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Initial data loading
  useEffect(() => {
    loadInitialData();
    checkUserRequestLimits();
  }, []);

  // Filter regions based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRegions(suggestedRegions);
    } else {
      const filtered = suggestedRegions.filter((region) =>
        region.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRegions(filtered);
    }
  }, [searchQuery, suggestedRegions]);

  // Check user request limits
  const checkUserRequestLimits = async () => {
    try {
      const limits = await checkRequestLimit();
      setRequestLimitInfo(limits);
    } catch (error) {
      console.error("Error checking request limits:", error);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    await checkUserRequestLimits();
    setRefreshing(false);
  }, []);

  // Main data loading function - UPDATED
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load insights for visited places
      const insightsFromVisited = await loadVisitedPlacesInsights();

      // Load suggested regions
      await loadSuggestedRegions();

      // Load all cached insights
      const cachedInsights = await getAllCachedInsights();

      // Set initial region selection - UPDATED
      if (region) {
        // If region specified in params, use that
        setSelectedRegion(region);
        await loadInsightForRegion(region);
      } else if (activeView === "visited" && insightsFromVisited.length > 0) {
        // For "visited" tab, only set data if there are visited places
        setSelectedRegion(insightsFromVisited[0].region);
        setCurrentInsight(insightsFromVisited[0]);
      } else if (activeView === "explore" && cachedInsights.length > 0) {
        // For "explore" tab, use cached insights
        setSelectedRegion(cachedInsights[0].region);
        setCurrentInsight(cachedInsights[0]);
      } else {
        // Clear current insight if no applicable data
        setSelectedRegion(null);
        setCurrentInsight(null);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading initial data:", err);
      setError("We couldn't load cultural information. Please try again.");
      setLoading(false);
    }
  };

  // Load cultural insights for visited places
  const loadVisitedPlacesInsights = async (): Promise<EnhancedCulturalInsight[]> => {
    try {
      if (!visitedPlaces || visitedPlaces.length === 0) {
        return [];
      }

      const insights = await getCulturalInsightsForVisitedPlaces(visitedPlaces);
      setVisitedInsights(insights);

      return insights;
    } catch (err) {
      console.error("Error loading visited places insights:", err);
      return [];
    }
  };

  // Load suggested regions
  const loadSuggestedRegions = async () => {
    try {
      const regions = await getSuggestedRegions(visitedPlaces);
      setSuggestedRegions(regions);
      setFilteredRegions(regions);
    } catch (err) {
      console.error("Error loading suggested regions:", err);
      setSuggestedRegions([]);
      setFilteredRegions([]);
    }
  };

  // Load cultural insight for a specific region
  const loadInsightForRegion = async (region: string) => {
    try {
      // Check if already in visited insights
      const existingVisitedInsight = visitedInsights.find(
        (insight) => insight.region.toLowerCase() === region.toLowerCase()
      );

      if (existingVisitedInsight) {
        setCurrentInsight(existingVisitedInsight);
        return;
      }

      // Otherwise fetch new data
      setLoadingInsight(true);
      setError(null);

      // Generate insights for this region
      const insight = await getCulturalInsights(region);
      setCurrentInsight(insight);
      setLoadingInsight(false);

      // Reset active section to overview
      setActiveSection("overview");

      // Scroll to top
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (err: any) {
      console.error(`Error loading insight for ${region}:`, err);

      // Check if error is due to request limit
      if (err.message && err.message.includes("Daily request limit reached")) {
        setError("You've reached your daily limit for AI-generated insights. Try again tomorrow.");
      } else {
        setError(`We couldn't load information for ${region}. Please try again.`);
      }

      setLoadingInsight(false);
    }
  };

  // Handler for region selection
  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    loadInsightForRegion(region);
  };

  // Handler for section navigation
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  // Show help modal
  const handleHelpPress = () => {
    // Show help modal or guide about cultural context
    console.log("Show help about Cultural Context");
  };

  // Render search bar
  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={THEME.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a region..."
          placeholderTextColor={THEME.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={THEME.textLight} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render region selector
  const renderRegionSelector = () => {
    const regions =
      activeView === "visited" ? visitedInsights.map((insight) => insight.region) : filteredRegions;

    if (regions.length === 0) {
      return <></>;
    }

    return (
      <View style={styles.regionSelectorContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={regions}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.regionChipsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              key={item}
              style={[styles.regionChip, selectedRegion === item && styles.selectedRegionChip]}
              onPress={() => handleRegionSelect(item)}
            >
              <Text
                style={[
                  styles.regionChipText,
                  selectedRegion === item && styles.selectedRegionChipText,
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  // Render section navigation
  const renderSectionNavigation = () => {
    return (
      <View style={styles.sectionNavContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sectionNavContent}
        >
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.sectionNavItem,
                activeSection === section.id && styles.sectionNavItemActive,
              ]}
              onPress={() => handleSectionChange(section.id)}
            >
              <Ionicons
                name={section.icon}
                size={18}
                color={activeSection === section.id ? THEME.primary : THEME.textLight}
              />
              <Text
                style={[
                  styles.sectionNavText,
                  activeSection === section.id && styles.sectionNavTextActive,
                ]}
              >
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render custom card
  const renderCustomCard = (custom: Custom, index: number) => {
    return (
      <View key={`custom-${index}`} style={styles.customCard}>
        <View style={styles.customHeader}>
          <View style={styles.customDot} />
          <Text style={styles.customTitle}>{custom.title}</Text>
        </View>
        <Text style={styles.customDescription}>{custom.description}</Text>
      </View>
    );
  };

  // Render tip card
  const renderTipCard = (tip: string, index: number) => {
    return (
      <View key={`tip-${index}`} style={styles.tipCard}>
        <View style={styles.tipIconContainer}>
          <Ionicons name="bulb-outline" size={20} color={THEME.accent4} />
        </View>
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    );
  };

  // Render content based on active section
  const renderSectionContent = () => {
    if (!currentInsight) return null;

    switch (activeSection) {
      case "overview":
        return (
          <View style={styles.overviewContainer}>
            <Text style={styles.overviewText}>
              Explore the rich cultural tapestry of {currentInsight.region}, where traditions,
              customs, and local etiquette create a unique experience for travelers.
            </Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: "#E0F2FE" }]}>
                  <Ionicons name="book-outline" size={18} color="#0284C7" />
                </View>
                <Text style={styles.statValue}>{currentInsight.customs.length}</Text>
                <Text style={styles.statLabel}>Customs</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="bulb-outline" size={18} color="#16A34A" />
                </View>
                <Text style={styles.statValue}>{currentInsight.localTips?.length || 0}</Text>
                <Text style={styles.statLabel}>Local Tips</Text>
              </View>
            </View>

            <View style={styles.overviewCards}>
              <View style={styles.overviewCard}>
                <View style={styles.overviewCardHeader}>
                  <Ionicons name="hand-left-outline" size={22} color={THEME.primary} />
                  <Text style={styles.overviewCardTitle}>Etiquette Snapshot</Text>
                </View>
                <Text style={styles.overviewCardText}>{currentInsight.etiquette}</Text>
              </View>

              <View style={styles.overviewCard}>
                <View style={styles.overviewCardHeader}>
                  <Ionicons name="restaurant-outline" size={22} color={THEME.primary} />
                  <Text style={styles.overviewCardTitle}>Dining Overview</Text>
                </View>
                <Text style={styles.overviewCardText}>{currentInsight.diningTips}</Text>
              </View>

              {currentInsight.customs.length > 0 && (
                <View style={styles.featuredCustomCard}>
                  <Text style={styles.featuredCustomTitle}>Featured Custom</Text>
                  <Text style={styles.featuredCustomName}>{currentInsight.customs[0].title}</Text>
                  <Text style={styles.featuredCustomDescription}>
                    {currentInsight.customs[0].description}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.exploreSectionsButton}
              onPress={() => handleSectionChange("customs")}
            >
              <Text style={styles.exploreSectionsText}>Explore All Sections</Text>
              <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
            </TouchableOpacity>
          </View>
        );

      case "customs":
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="book-outline" size={24} color={THEME.primary} />
              <Text style={styles.sectionTitle}>Local Customs & Traditions</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Understanding these customs will enrich your experience in {currentInsight.region}
              and help you connect with the local culture.
            </Text>
            <View style={styles.customsContainer}>
              {currentInsight.customs.map((custom, index) => renderCustomCard(custom, index))}
            </View>
          </View>
        );

      case "etiquette":
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="hand-left-outline" size={24} color={THEME.primary} />
              <Text style={styles.sectionTitle}>Local Etiquette</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Following these etiquette guidelines will help you navigate social situations
              appropriately in {currentInsight.region}.
            </Text>
            <View style={styles.etiquetteCard}>
              <Text style={styles.etiquetteText}>{currentInsight.etiquette}</Text>
            </View>
          </View>
        );

      case "dining":
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="restaurant-outline" size={24} color={THEME.primary} />
              <Text style={styles.sectionTitle}>Dining Etiquette & Tips</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Food is an important part of culture. Here's how to navigate dining situations in{" "}
              {currentInsight.region}.
            </Text>
            <View style={styles.diningCard}>
              <Text style={styles.diningText}>{currentInsight.diningTips}</Text>
            </View>
          </View>
        );

      case "tips":
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={24} color={THEME.primary} />
              <Text style={styles.sectionTitle}>Local Tips</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Insider advice to make your visit to {currentInsight.region} more enjoyable and
              authentic.
            </Text>

            <View style={styles.tipsContainer}>
              {currentInsight.localTips && currentInsight.localTips.length > 0 ? (
                currentInsight.localTips.map((tip, index) => renderTipCard(tip, index))
              ) : (
                <Text style={styles.noDataText}>No local tips available.</Text>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Render footer with attribution
  const renderFooter = () => {
    return (
      <View style={styles.footer}>
        <View style={styles.aiAttributionContainer}>
          <Ionicons name="flash" size={14} color={THEME.textLight} />
          <Text style={styles.aiAttributionText}>Cultural insights generated by AI</Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => console.log("Share cultural insights")}
        >
          <Ionicons name="share-outline" size={18} color={THEME.primary} />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render view toggle buttons
  const renderViewToggle = () => (
    <View style={styles.viewToggleContainer}>
      <TouchableOpacity
        style={[styles.viewToggleButton, activeView === "visited" && styles.activeViewToggleButton]}
        onPress={() => setActiveView("visited")}
      >
        <Ionicons
          name="bookmark"
          size={16}
          color={activeView === "visited" ? THEME.primary : THEME.textLight}
        />
        <Text
          style={[styles.viewToggleText, activeView === "visited" && styles.activeViewToggleText]}
        >
          Your Places
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.viewToggleButton, activeView === "explore" && styles.activeViewToggleButton]}
        onPress={() => setActiveView("explore")}
      >
        <Ionicons
          name="compass"
          size={16}
          color={activeView === "explore" ? THEME.primary : THEME.textLight}
        />
        <Text
          style={[styles.viewToggleText, activeView === "explore" && styles.activeViewToggleText]}
        >
          Explore
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render request limit indicator
  const renderRequestLimitIndicator = () => (
    <View style={styles.requestLimitContainer}>
      <Ionicons
        name={requestLimitInfo.canRequest ? "flash" : "hourglass"}
        size={14}
        color={requestLimitInfo.canRequest ? THEME.success : THEME.warning}
      />
      <Text style={styles.requestLimitText}>
        {requestLimitInfo.canRequest
          ? `${requestLimitInfo.requestsRemaining} left`
          : `Limit reached`}
      </Text>
    </View>
  );

  // Loading state
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={styles.loadingText}>Loading cultural insights...</Text>
    </View>
  );

  // Error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={56} color={THEME.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Header
          title="Culture"
          subtitle="Discover local customs and traditions"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          showIcon={false}
          iconName="globe-outline"
          iconColor={Colors.primary}
          showHelp={true}
          onHelpPress={handleHelpPress}
        />
        {renderLoading()}
      </View>
    );
  }

  if (error && !loadingInsight) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Header
          title="Culture"
          subtitle="Discover local customs and traditions"
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
          showIcon={false}
          iconName="globe-outline"
          iconColor={Colors.primary}
          showHelp={true}
          onHelpPress={handleHelpPress}
        />
        {renderError()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <Header
        title="Culture"
        subtitle={
          currentInsight
            ? `Exploring ${currentInsight.region}`
            : "Discover local customs and traditions"
        }
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        showIcon={false}
        iconName="globe-outline"
        iconColor={Colors.primary}
        showHelp={true}
        onHelpPress={handleHelpPress}
      />

      {renderSearchBar()}

      <View style={styles.topControls}>
        {renderViewToggle()}
        {renderRequestLimitIndicator()}
      </View>

      {renderRegionSelector()}

      {/* UPDATED CONDITIONAL CONTENT RENDERING */}
      {loadingInsight ? (
        renderLoading()
      ) : (activeView === "visited" && visitedInsights.length === 0) ||
        (activeView === "explore" && filteredRegions.length === 0) ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons
            name={activeView === "visited" ? "bookmark-outline" : "compass-outline"}
            size={64}
            color={THEME.primaryMedium}
          />
          <Text style={styles.emptyStateTitle}>
            {activeView === "visited" ? "No Visited Places" : "No Regions to Explore"}
          </Text>
          <Text style={styles.emptyStateText}>
            {activeView === "visited"
              ? "You haven't visited any places yet. Start exploring to get cultural insights!"
              : "No regions found. Try a different search term."}
          </Text>
          {activeView === "visited" && (
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate("Discover")}
            >
              <Text style={styles.exploreButtonText}>Discover Places</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : currentInsight ? (
        <>
          {renderSectionNavigation()}
          <ScrollView
            style={styles.contentScrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[THEME.primary]}
              />
            }
          >
            {renderSectionContent()}
            {renderFooter()}
          </ScrollView>
        </>
      ) : (
        <View style={styles.noInsightContainer}>
          <Ionicons name="globe-outline" size={64} color={THEME.primaryMedium} />
          <Text style={styles.noInsightTitle}>Select a Region</Text>
          <Text style={styles.noInsightText}>
            Choose a region above to discover cultural insights
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  exploreButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },
  exploreButtonText: {
    color: THEME.background,
    fontSize: 16,
    fontWeight: "600",
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: THEME.text,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
  },
  viewToggleContainer: {
    flexDirection: "row",
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  viewToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activeViewToggleButton: {
    backgroundColor: THEME.primaryLight,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.textLight,
    marginLeft: 4,
  },
  activeViewToggleText: {
    color: THEME.primary,
  },
  requestLimitContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.surface,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  requestLimitText: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginLeft: 4,
  },
  regionSelectorContainer: {
    marginBottom: 16,
  },
  regionChipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  regionChip: {
    backgroundColor: THEME.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  selectedRegionChip: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  regionChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: THEME.text,
  },
  selectedRegionChipText: {
    color: THEME.background,
  },
  sectionNavContainer: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.background,
  },
  sectionNavContent: {
    paddingHorizontal: 16,
  },
  sectionNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  sectionNavItemActive: {
    borderBottomColor: THEME.primary,
  },
  sectionNavText: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.textLight,
    marginLeft: 6,
  },
  sectionNavTextActive: {
    color: THEME.primary,
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Overview section styles
  overviewContainer: {
    padding: 16,
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: THEME.text,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textLight,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: THEME.border,
    alignSelf: "center",
  },
  overviewCards: {
    gap: 16,
  },
  overviewCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
  },
  overviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  overviewCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.text,
    marginLeft: 8,
  },
  overviewCardText: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
  },
  featuredCustomCard: {
    backgroundColor: THEME.primaryLight,
    borderRadius: 12,
    padding: 16,
  },
  featuredCustomTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.primary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featuredCustomName: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.primary,
    marginBottom: 8,
  },
  featuredCustomDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
  },
  exploreSectionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: THEME.primaryLight,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreSectionsText: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.primary,
    marginRight: 8,
  },

  // Section common styles
  sectionContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.text,
    marginLeft: 10,
  },
  sectionDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
    marginBottom: 24,
  },

  // Customs section styles
  customsContainer: {
    gap: 16,
  },
  customCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: THEME.primary,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  customDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
    marginRight: 8,
  },
  customTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.text,
  },
  customDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: THEME.textSecondary,
  },

  // Etiquette section styles
  etiquetteCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
  },
  etiquetteText: {
    fontSize: 15,
    lineHeight: 24,
    color: THEME.textSecondary,
  },

  // Dining section styles
  diningCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
  },
  diningText: {
    fontSize: 15,
    lineHeight: 24,
    color: THEME.textSecondary,
  },

  // Tips section styles
  tipsContainer: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.textSecondary,
    flex: 1,
  },

  // Footer styles
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    marginTop: 16,
  },
  aiAttributionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiAttributionText: {
    fontSize: 12,
    color: THEME.textLight,
    marginLeft: 6,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.primary,
    marginLeft: 4,
  },

  // Error & empty states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: THEME.primary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.text,
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryButtonText: {
    color: THEME.background,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 22,
  },
  noInsightContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  noInsightTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noInsightText: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: "center",
  },
  noDataText: {
    fontSize: 14,
    color: THEME.textLight,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default CulturalContextScreen;

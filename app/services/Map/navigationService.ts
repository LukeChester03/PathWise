// navigationService.ts - to be placed in services/Map/ directory
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

/**
 * A global service for handling navigation to the map and showing discover cards
 */
class NavigationService {
  private static instance: NavigationService;

  private constructor() {}

  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Navigate to the map and show discover card for a place
   * @param navigation The navigation object (from useNavigation hook)
   * @param place The place to show in the explore card
   * @param withHaptics Whether to provide haptic feedback
   */
  showDiscoverCard(
    navigation: NavigationProp<any>,
    place: Place | VisitedPlaceDetails,
    withHaptics: boolean = true
  ) {
    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      console.log(`NavigationService: Navigating to map with place: ${place.name}`);

      // Important: Create a deep copy of the place to ensure no reference issues
      const placeToShow = JSON.parse(JSON.stringify(place));

      // Navigate to the Discover screen with the place to show
      // Use both parameter names for compatibility
      navigation.navigate(
        "Discover" as any,
        {
          showPlaceCard: true,
          placeToShow: placeToShow,
          timestamp: new Date().getTime(), // Add timestamp to force param refresh
        } as any
      );
    } catch (error) {
      console.error("NavigationService: Error navigating to map", error);
    }
  }

  /**
   * Navigate to place details screen
   * @param navigation The navigation object
   * @param place The place to show details for
   * @param withHaptics Whether to provide haptic feedback
   */
  navigateToPlaceDetails(
    navigation: NavigationProp<any>,
    place: Place | VisitedPlaceDetails,
    withHaptics: boolean = true
  ) {
    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      console.log(`NavigationService: Navigating to place details: ${place.name}`);

      // Create a deep copy of the place
      const placeToShow = JSON.parse(JSON.stringify(place));

      navigation.navigate("PlaceDetails", {
        placeId: place.place_id,
        place: placeToShow,
      });
    } catch (error) {
      console.error("NavigationService: Error navigating to place details", error);
    }
  }

  /**
   * Get place to show from route params
   * @param route The route object from useRoute hook
   * @returns The place to show in the explore card, or null if not found
   */
  getShowPlaceCardFromRoute(route: RouteProp<any, any>): Place | null {
    try {
      // Check for place in both parameter formats for compatibility
      if (route.params) {
        // Original format
        if (route.params.showPlaceCard && typeof route.params.showPlaceCard === "object") {
          console.log(
            `NavigationService: Found place in route (original format): ${route.params.showPlaceCard.name}`
          );
          return route.params.showPlaceCard as Place;
        }

        // New format
        if (route.params.showPlaceCard === true && route.params.placeToShow) {
          console.log(
            `NavigationService: Found place in route (new format): ${route.params.placeToShow.name}`
          );
          return route.params.placeToShow as Place;
        }
      }
      return null;
    } catch (error) {
      console.error("NavigationService: Error extracting place from route", error);
      return null;
    }
  }
}

// Export a singleton instance
export default NavigationService.getInstance();

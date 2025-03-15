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

    console.log(`Navigating to map with place: ${place.name}`);

    // Navigate to the Discover screen with the place to show
    navigation.navigate(
      "Discover" as any,
      {
        showPlaceCard: place,
      } as any
    );
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

    console.log(`Navigating to place details: ${place.name}`);

    navigation.navigate("PlaceDetails", {
      placeId: place.place_id,
      place: place,
    });
  }

  /**
   * Get place to show from route params
   * @param route The route object from useRoute hook
   * @returns The place to show in the explore card, or null if not found
   */
  getShowPlaceCardFromRoute(route: RouteProp<any, any>): Place | null {
    if (route.params && route.params.showPlaceCard) {
      return route.params.showPlaceCard as Place;
    }
    return null;
  }
}

// Export a singleton instance
export default NavigationService.getInstance();

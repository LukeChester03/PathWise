import { Place, VisitedPlaceDetails } from "../../types/MapTypes";
import { NavigationProp, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

class NavigationService {
  private static instance: NavigationService;

  private constructor() {}

  public static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

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
      const placeToShow = JSON.parse(JSON.stringify(place));
      navigation.navigate(
        "Discover" as any,
        {
          showPlaceCard: true,
          placeToShow: placeToShow,
          timestamp: new Date().getTime(),
        } as any
      );
    } catch (error) {
      console.error("NavigationService: Error navigating to map", error);
    }
  }

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
      const placeToShow = JSON.parse(JSON.stringify(place));

      navigation.navigate("PlaceDetails", {
        placeId: place.place_id,
        place: placeToShow,
      });
    } catch (error) {
      console.error("NavigationService: Error navigating to place details", error);
    }
  }

  getShowPlaceCardFromRoute(route: RouteProp<any, any>): Place | null {
    try {
      if (route.params) {
        if (route.params.showPlaceCard && typeof route.params.showPlaceCard === "object") {
          console.log(
            `NavigationService: Found place in route (original format): ${route.params.showPlaceCard.name}`
          );
          return route.params.showPlaceCard as Place;
        }
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

export default NavigationService.getInstance();

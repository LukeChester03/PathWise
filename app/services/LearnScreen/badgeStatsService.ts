import { fetchUserStats } from "../statsService";
import { getAllUserBadges, updateBadgeRequirements, completeBadge } from "./badgeService";
import { TravelBadge } from "../../types/LearnScreen/TravelProfileTypes";
import { auth } from "../../config/firebaseConfig";

export const syncBadgesWithStats = async (): Promise<{
  updatedBadges: TravelBadge[];
  completedBadgeIds: string[];
}> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot sync badges: No authenticated user");
      return { updatedBadges: [], completedBadgeIds: [] };
    }
    const statItems = await fetchUserStats();
    if (!statItems || statItems.length === 0) {
      console.warn("Cannot sync badges: No user stats available");
      return { updatedBadges: [], completedBadgeIds: [] };
    }

    const statsMap = new Map(
      statItems.map((stat) => {
        let value = stat.value;
        if (typeof value === "string" && !isNaN(Number(value.split(" ")[0]))) {
          value = Number(value.split(" ")[0]);
        }
        return [stat.label.toLowerCase().replace(/ /g, ""), value];
      })
    );

    const badges = await getAllUserBadges();
    const updatedBadges: TravelBadge[] = [];
    const completedBadgeIds: string[] = [];
    for (const badge of badges) {
      if (badge.completed) continue;

      let requirementsUpdated = false;
      let allRequirementsMet = true;
      const updatedRequirements = badge.requirements.map((req) => {
        let current = req.current;

        switch (req.type) {
          case "visitCount":
            const placesValue = statsMap.get("placesdiscovered");
            if (placesValue !== undefined && typeof placesValue === "number") {
              current = placesValue;
            }
            break;

          case "categoryVisit":
            break;

          case "streak":
            const streakValue = statsMap.get("daystreak");
            if (streakValue !== undefined && typeof streakValue === "number") {
              current = streakValue;
            }
            break;

          case "distance":
            const distanceValue = statsMap.get("distancetraveled");
            if (distanceValue !== undefined && typeof distanceValue === "number") {
              current = distanceValue;
            }
            break;

          case "countries":
            const countriesValue = statsMap.get("countriesvisited");
            if (countriesValue !== undefined && typeof countriesValue === "number") {
              current = countriesValue;
            }
            break;

          case "continents":
            const continentsValue = statsMap.get("continentsvisited");
            if (continentsValue !== undefined && typeof continentsValue === "number") {
              current = continentsValue;
            }
            break;

          case "explorationscore":
            const scoreValue = statsMap.get("explorerscore");
            if (scoreValue !== undefined && typeof scoreValue === "number") {
              current = scoreValue;
            }
            break;
        }

        if (current < req.value) {
          allRequirementsMet = false;
        }

        if (current !== req.current) {
          requirementsUpdated = true;
        }

        return {
          ...req,
          current,
        };
      });

      if (requirementsUpdated || allRequirementsMet) {
        if (allRequirementsMet) {
          await completeBadge(badge.id);
          completedBadgeIds.push(badge.id);
          updatedBadges.push({
            ...badge,
            completed: true,
            dateEarned: new Date(),
            requirements: updatedRequirements,
          });
        } else if (requirementsUpdated) {
          await updateBadgeRequirements(badge.id, updatedRequirements);
          updatedBadges.push({
            ...badge,
            requirements: updatedRequirements,
          });
        }
      }
    }

    console.log(
      `Synced badges with stats: ${updatedBadges.length} badges updated, ${completedBadgeIds.length} badges completed`
    );
    return { updatedBadges, completedBadgeIds };
  } catch (error) {
    console.error("Error syncing badges with stats:", error);
    return { updatedBadges: [], completedBadgeIds: [] };
  }
};

/**
 * function to refresh badges in the profile
 */
export const refreshBadgesInProfile = async (
  currentBadges: TravelBadge[]
): Promise<TravelBadge[]> => {
  try {
    const { updatedBadges } = await syncBadgesWithStats();

    if (updatedBadges.length === 0) {
      return currentBadges;
    }

    const updatedBadgesMap = new Map(updatedBadges.map((badge) => [badge.id, badge]));

    const refreshedBadges = currentBadges.map((badge) => {
      const updatedBadge = updatedBadgesMap.get(badge.id);
      return updatedBadge || badge;
    });

    return refreshedBadges;
  } catch (error) {
    console.error("Error refreshing badges in profile:", error);
    return currentBadges;
  }
};

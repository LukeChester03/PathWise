// services/LearnScreen/badgeStatsService.ts
import { fetchUserStats } from "../statsService";
import { getAllUserBadges, updateBadgeRequirements, completeBadge } from "./badgeService";
import { TravelBadge } from "../../types/LearnScreen/TravelProfileTypes";
import { auth } from "../../config/firebaseConfig";

/**
 * Synchronizes badge progress with current user statistics.
 *
 */
export const syncBadgesWithStats = async (): Promise<{
  updatedBadges: TravelBadge[];
  completedBadgeIds: string[];
}> => {
  try {
    // Ensure user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot sync badges: No authenticated user");
      return { updatedBadges: [], completedBadgeIds: [] };
    }

    // Get current user stats
    const statItems = await fetchUserStats();
    if (!statItems || statItems.length === 0) {
      console.warn("Cannot sync badges: No user stats available");
      return { updatedBadges: [], completedBadgeIds: [] };
    }

    const statsMap = new Map(
      statItems.map((stat) => {
        // Convert string values to numbers
        let value = stat.value;
        if (typeof value === "string" && !isNaN(Number(value.split(" ")[0]))) {
          value = Number(value.split(" ")[0]);
        }
        return [stat.label.toLowerCase().replace(/ /g, ""), value];
      })
    );

    // get users current badges
    const badges = await getAllUserBadges();
    const updatedBadges: TravelBadge[] = [];
    const completedBadgeIds: string[] = [];

    // process each badge
    for (const badge of badges) {
      // Skip already completed badges
      if (badge.completed) continue;

      let requirementsUpdated = false;
      let allRequirementsMet = true;

      // update each requirement
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

        // Check if requirement is met
        if (current < req.value) {
          allRequirementsMet = false;
        }

        // Check if value has changed
        if (current !== req.current) {
          requirementsUpdated = true;
        }

        return {
          ...req,
          current,
        };
      });

      // If requirements updated or met process badge updates
      if (requirementsUpdated || allRequirementsMet) {
        if (allRequirementsMet) {
          // Complete the badge
          await completeBadge(badge.id);
          completedBadgeIds.push(badge.id);

          // Add to updated badges with completed status
          updatedBadges.push({
            ...badge,
            completed: true,
            dateEarned: new Date(),
            requirements: updatedRequirements,
          });
        } else if (requirementsUpdated) {
          // update requirements
          await updateBadgeRequirements(badge.id, updatedRequirements);

          // Add to updated badges
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
 * Helper function to refresh badges in the profile
 *
 */
export const refreshBadgesInProfile = async (
  currentBadges: TravelBadge[]
): Promise<TravelBadge[]> => {
  try {
    const { updatedBadges } = await syncBadgesWithStats();

    if (updatedBadges.length === 0) {
      return currentBadges;
    }

    // Create a map of updated badges by ID
    const updatedBadgesMap = new Map(updatedBadges.map((badge) => [badge.id, badge]));

    // Update the current badges with the changes
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

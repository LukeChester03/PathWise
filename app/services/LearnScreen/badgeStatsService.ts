// services/LearnScreen/badgeStatsService.ts
import { fetchUserStats } from "../statsService";
import { getAllUserBadges, updateBadgeRequirements, completeBadge } from "./badgeService";
import { TravelBadge } from "../../types/LearnScreen/TravelProfileTypes";
import { auth } from "../../config/firebaseConfig";

/**
 * Synchronizes badge progress with current user statistics.
 * This is the main function that should be called to update badges based on stats.
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

    // Create a map for easier access to stat values
    const statsMap = new Map(
      statItems.map((stat) => {
        // Convert string values to numbers when possible for comparison
        let value = stat.value;
        if (typeof value === "string" && !isNaN(Number(value.split(" ")[0]))) {
          value = Number(value.split(" ")[0]);
        }
        return [stat.label.toLowerCase().replace(/ /g, ""), value];
      })
    );

    // Get user's current badges
    const badges = await getAllUserBadges();
    const updatedBadges: TravelBadge[] = [];
    const completedBadgeIds: string[] = [];

    // Process each badge
    for (const badge of badges) {
      // Skip already completed badges
      if (badge.completed) continue;

      let requirementsUpdated = false;
      let allRequirementsMet = true;

      // Update each requirement
      const updatedRequirements = badge.requirements.map((req) => {
        let current = req.current;

        // Update current progress based on user stats
        switch (req.type) {
          case "visitCount":
            // Maps to "Places Discovered" in statsMap
            const placesValue = statsMap.get("placesdiscovered");
            if (placesValue !== undefined && typeof placesValue === "number") {
              current = placesValue;
            }
            break;

          case "categoryVisit":
            // For category visits, we need more granular data that might not be in the statItems
            // We'll keep the current value for now, but note the limitation
            break;

          case "streak":
            // Maps to "Day Streak" in statsMap
            const streakValue = statsMap.get("daystreak");
            if (streakValue !== undefined && typeof streakValue === "number") {
              current = streakValue;
            }
            break;

          case "distance":
            // Maps to "Distance Traveled" in statsMap
            const distanceValue = statsMap.get("distancetraveled");
            if (distanceValue !== undefined && typeof distanceValue === "number") {
              current = distanceValue;
            }
            break;

          case "countries":
            // Maps to "Countries Visited" in statsMap
            const countriesValue = statsMap.get("countriesvisited");
            if (countriesValue !== undefined && typeof countriesValue === "number") {
              current = countriesValue;
            }
            break;

          case "continents":
            // Maps to "Continents Visited" in statsMap
            const continentsValue = statsMap.get("continentsvisited");
            if (continentsValue !== undefined && typeof continentsValue === "number") {
              current = continentsValue;
            }
            break;

          case "explorationscore":
            // Maps to "Explorer Score" in statsMap
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

      // If requirements updated or met, process badge updates
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
          // Just update requirements
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
 * This can be called from the profile screen to ensure badges are up-to-date
 */
export const refreshBadgesInProfile = async (
  currentBadges: TravelBadge[]
): Promise<TravelBadge[]> => {
  try {
    const { updatedBadges } = await syncBadgesWithStats();

    if (updatedBadges.length === 0) {
      return currentBadges; // No changes
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
    return currentBadges; // Return original badges in case of error
  }
};

// services/statsService.ts
import { doc, getDoc, updateDoc, setDoc, collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { StatItem, UserStatsData } from "../types/StatTypes";

// For date handling
const DAY_IN_MS = 86400000; // 24 hours in milliseconds

/**
 * Fetches the user's stats from Firestore
 */
export const fetchUserStats = async (): Promise<StatItem[]> => {
  try {
    // Get the current user
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No user logged in");
      return [];
    }

    // Reference to the user's stats document
    const statsDocRef = doc(db, "userStats", currentUser.uid);

    // Fetch the document
    const statsDoc = await getDoc(statsDocRef);

    if (statsDoc.exists()) {
      const statsData = statsDoc.data() as UserStatsData;

      // Transform database data into the required format
      return [
        {
          id: 1,
          icon: "map-outline",
          value: statsData.placesDiscovered || 0,
          label: "Places Discovered",
          gradientColors: ["#4A90E2", "#5DA9FF"],
        },
        {
          id: 2,
          icon: "earth-outline",
          value: statsData.countriesVisited || 0,
          label: "Countries Visited",
          gradientColors: ["#FF7043", "#FF8A65"],
        },
        {
          id: 3,
          icon: "flame-outline",
          value: statsData.dayStreak || 0,
          label: "Day Streak",
          gradientColors: ["#d03f74", "#ff1493"],
        },
        {
          id: 4,
          icon: "star-outline",
          value: statsData.achievementsEarned || 0,
          label: "Achievements Earned",
          gradientColors: ["#50C878", "#63E08C"],
        },
      ];
    }

    // If no document exists, create a new one with default values
    await createDefaultUserStatsDocument(currentUser.uid);

    // Return default stats
    return [
      {
        id: 1,
        icon: "map-outline",
        value: 0,
        label: "Places Discovered",
        gradientColors: ["#4A90E2", "#5DA9FF"],
      },
      {
        id: 2,
        icon: "earth-outline",
        value: 0,
        label: "Countries Visited",
        gradientColors: ["#FF7043", "#FF8A65"],
      },
      {
        id: 3,
        icon: "flame-outline",
        value: 0,
        label: "Day Streak",
        gradientColors: ["#d03f74", "#ff1493"],
      },
      {
        id: 4,
        icon: "star-outline",
        value: 0,
        label: "Achievements Earned",
        gradientColors: ["#50C878", "#63E08C"],
      },
    ];
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return [];
  }
};

/**
 * Creates a default stats document for a new user
 */
const createDefaultUserStatsDocument = async (userId: string) => {
  try {
    const statsDocRef = doc(db, "userStats", userId);

    const defaultStatsData: UserStatsData = {
      placesDiscovered: 0,
      countriesVisited: 0,
      dayStreak: 0,
      achievementsEarned: 0,
      lastUpdated: new Date(),
      lastLogin: new Date(),
      visitedCountries: [], // Array to track unique countries
      processedPlaceIds: [], // Array to track processed place IDs
    };

    await setDoc(statsDocRef, defaultStatsData, { merge: true });
    console.log("Created default stats document for user:", userId);
  } catch (error) {
    console.error("Error creating default stats document:", error);
  }
};

/**
 * Updates specific user stats fields
 */
export const updateUserStats = async (statsUpdate: Partial<UserStatsData>): Promise<void> => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No user logged in");
    }

    const statsDocRef = doc(db, "userStats", currentUser.uid);

    // Merge the update with existing data and add a timestamp
    await updateDoc(statsDocRef, {
      ...statsUpdate,
      lastUpdated: new Date(),
    });

    console.log("Updated user stats:", statsUpdate);
  } catch (error) {
    console.error("Error updating user stats:", error);
    throw error;
  }
};

/**
 * Increments a specific stat by a given amount
 */
export const incrementStat = async (
  statKey: keyof Pick<
    UserStatsData,
    "placesDiscovered" | "countriesVisited" | "dayStreak" | "achievementsEarned"
  >,
  incrementBy: number = 1
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No user logged in");
    }

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      await createDefaultUserStatsDocument(currentUser.uid);
    }

    const statsData = statsDoc.exists() ? (statsDoc.data() as UserStatsData) : null;
    const currentValue = statsData ? statsData[statKey] || 0 : 0;

    // Calculate new value, ensuring it's never negative
    const newValue = Math.max(0, currentValue + incrementBy);

    // Update the specific stat
    await updateDoc(statsDocRef, {
      [statKey]: newValue,
      lastUpdated: new Date(),
    });

    console.log(`Incremented ${statKey} from ${currentValue} to ${newValue}`);
  } catch (error) {
    console.error(`Error incrementing ${statKey}:`, error);
    throw error;
  }
};

/**
 * Updates the day streak when a user opens the app
 * Returns the updated streak value
 */
export const updateDayStreak = async (): Promise<number> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return 0;

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      await createDefaultUserStatsDocument(currentUser.uid);
      return 0;
    }

    const statsData = statsDoc.data() as UserStatsData;
    const now = new Date();
    const lastLogin = statsData.lastLogin
      ? statsData.lastLogin instanceof Date
        ? statsData.lastLogin
        : statsData.lastLogin.toDate()
      : new Date(0);

    // Calculate time difference in milliseconds
    const timeDifference = now.getTime() - lastLogin.getTime();

    let newStreak = statsData.dayStreak || 0;

    if (timeDifference > DAY_IN_MS * 2) {
      // If more than 2 days since last login, reset streak
      newStreak = 1;
      console.log("Streak reset: More than 2 days since last login");
    } else if (timeDifference > DAY_IN_MS) {
      // If between 1-2 days, increment streak
      newStreak += 1;
      console.log("Streak incremented: New day login");
    } else {
      // Same day login, no streak change
      console.log("Same day login, streak unchanged");
    }

    // Update last login and streak
    await updateDoc(statsDocRef, {
      lastLogin: now,
      dayStreak: newStreak,
      lastUpdated: now,
    });

    return newStreak;
  } catch (error) {
    console.error("Error updating day streak:", error);
    return 0;
  }
};

/**
 * Process a newly visited place and update relevant stats
 */
export const processVisitedPlace = async (placeData: {
  placeId: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Reference to user stats
    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      await createDefaultUserStatsDocument(currentUser.uid);
    }

    const statsData = statsDoc.exists() ? (statsDoc.data() as UserStatsData) : null;

    // Get current values
    const visitedCountries = statsData?.visitedCountries || [];
    const countriesVisited = statsData?.countriesVisited || 0;
    const processedPlaceIds = statsData?.processedPlaceIds || [];

    // Check if this place has already been processed
    if (processedPlaceIds.includes(placeData.placeId)) {
      console.log(`Place ${placeData.name} already counted in stats`);
      return;
    }

    // Check if this is a new country
    const isNewCountry = !visitedCountries.includes(placeData.country);

    let updates: Partial<UserStatsData> = {
      // Add place to processed IDs list
      processedPlaceIds: [...processedPlaceIds, placeData.placeId],
      // Increment places discovered
      placesDiscovered: (statsData?.placesDiscovered || 0) + 1,
      lastUpdated: new Date(),
    };

    // If new country, update countries visited
    if (isNewCountry) {
      updates.visitedCountries = [...visitedCountries, placeData.country];
      updates.countriesVisited = countriesVisited + 1;
      console.log(`New country visited: ${placeData.country}`);
    }

    // Update stats
    await updateDoc(statsDocRef, updates);
    console.log(`Place visit processed: ${placeData.name}`);
  } catch (error) {
    console.error("Error processing visited place:", error);
  }
};

/**
 * Set up a listener for visited places to keep stats in sync
 */
export const setupVisitedPlacesListener = (onStatsChange: () => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in for visited places listener");
    return () => {}; // Empty unsubscribe function
  }

  // Reference to the user's visited places collection
  const visitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");

  // Set up real-time listener
  const unsubscribe = onSnapshot(visitedPlacesRef, async (snapshot) => {
    console.log("Visited places updated, processing changes");

    // Get newly added documents
    const changes = snapshot.docChanges();

    // Track if any changes were made
    let statsChanged = false;

    for (const change of changes) {
      if (change.type === "added") {
        const placeData = change.doc.data();

        // Check if this place has already been processed in stats
        const statsDocRef = doc(db, "userStats", currentUser.uid);
        const statsDoc = await getDoc(statsDocRef);

        if (statsDoc.exists()) {
          const statsData = statsDoc.data() as UserStatsData;
          const processedPlaceIds = statsData.processedPlaceIds || [];

          // Skip if already processed
          if (processedPlaceIds.includes(placeData.placeId || placeData.place_id)) {
            console.log(`Place ${placeData.name} already counted in stats, skipping`);
            continue;
          }
        }

        // Process the new place
        await processVisitedPlace({
          placeId: placeData.placeId || placeData.place_id,
          name: placeData.name,
          country: placeData.country || "Unknown",
          latitude: placeData.location?.latitude || 0,
          longitude: placeData.location?.longitude || 0,
        });

        statsChanged = true;
      }
    }

    // Only trigger callback if stats actually changed
    if (statsChanged) {
      onStatsChange();
    }
  });

  return unsubscribe;
};

/**
 * Update streak on app start and setup listeners
 */
export const initStatsSystem = async (onStatsChange: () => void) => {
  // Update streak
  await updateDayStreak();

  // Return the unsubscribe function
  return setupVisitedPlacesListener(onStatsChange);
};

/**
 * Update achievement count and return if a new achievement was unlocked
 */
export const unlockAchievement = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    // Increment achievements count
    await incrementStat("achievementsEarned", 1);

    return true;
  } catch (error) {
    console.error("Error unlocking achievement:", error);
    return false;
  }
};

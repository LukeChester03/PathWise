// services/statsService.ts
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { StatItem, UserStatsData, StatIcon } from "../types/StatTypes";

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

// Create a default stats document if it doesn't exist
const createDefaultUserStatsDocument = async (userId: string) => {
  try {
    const statsDocRef = doc(db, "userStats", userId);

    const defaultStatsData: UserStatsData = {
      placesDiscovered: 0,
      countriesVisited: 0,
      dayStreak: 0,
      achievementsEarned: 0,
      lastUpdated: new Date(),
    };

    await setDoc(statsDocRef, defaultStatsData, { merge: true });
  } catch (error) {
    console.error("Error creating default stats document:", error);
  }
};

// Method to update user stats
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
  } catch (error) {
    console.error("Error updating user stats:", error);
    throw error;
  }
};

// Method to increment a specific stat
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

    // Use updateDoc to increment the specific stat
    await updateDoc(statsDocRef, {
      [statKey]: Math.max(0, (statsDocRef[statKey] || 0) + incrementBy),
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error(`Error incrementing ${statKey}:`, error);
    throw error;
  }
};

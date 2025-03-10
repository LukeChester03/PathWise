// services/xpService.ts
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { UserStatsData, EXPLORATION_LEVELS } from "../../types/StatTypes";

// XP Values for different activities
export const XP_VALUES = {
  // Base activities
  VISIT_PLACE: 10,
  VISIT_NEW_COUNTRY: 50,
  DAILY_STREAK: 5, // Per day
  WEEKEND_VISIT: 5, // Extra bonus for weekend visits

  // Milestone bonuses
  MILESTONE_5_PLACES: 50,
  MILESTONE_10_PLACES: 100,
  MILESTONE_25_PLACES: 250,
  MILESTONE_50_PLACES: 500,
  MILESTONE_100_PLACES: 1000,

  MILESTONE_3_COUNTRIES: 100,
  MILESTONE_5_COUNTRIES: 200,
  MILESTONE_10_COUNTRIES: 500,

  MILESTONE_WEEK_STREAK: 50,
  MILESTONE_MONTH_STREAK: 200,

  MILESTONE_FIRST_CONTINENT: 50,
  MILESTONE_THIRD_CONTINENT: 150,

  // Category bonuses
  DIVERSE_CATEGORY: 15, // For each new category visited

  // Distance bonuses
  DISTANCE_KM: 1, // Per kilometer
  MILESTONE_100_KM: 100,
  MILESTONE_1000_KM: 500,
};

/**
 * Award XP for a specific activity
 * @param xpAmount Amount of XP to award
 * @param activity Description of the activity (for logging)
 */
export const awardXP = async (xpAmount: number, activity: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No user logged in, can't award XP");
      return false;
    }

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      console.error("User stats document doesn't exist");
      return false;
    }

    const statsData = statsDoc.data() as UserStatsData;

    // Current exploration score (XP)
    const currentXP = statsData.explorationScore || 0;

    // Calculate new XP total
    const newXP = currentXP + xpAmount;

    // Current level
    const currentLevel = statsData.explorationLevel || 1;

    // Calculate new level based on XP
    const newLevel = calculateLevelFromXP(newXP);

    // Prepare the update object
    const updateData: Partial<UserStatsData> = {
      explorationScore: newXP,
      lastUpdated: new Date(),
    };

    // If level changed, update that too
    if (newLevel > currentLevel) {
      updateData.explorationLevel = newLevel;
      console.log(`Level up! ${currentLevel} → ${newLevel}`);
    }

    // Update the database
    await updateDoc(statsDocRef, updateData);

    console.log(`Awarded ${xpAmount} XP for: ${activity}. New total: ${newXP}`);
    return true;
  } catch (error) {
    console.error("Error awarding XP:", error);
    return false;
  }
};

/**
 * Award XP for visiting a place
 * @param isNewCountry Whether this is a first visit to this country
 * @param isWeekend Whether the visit occurred on a weekend
 */
export const awardVisitXP = async (
  isNewCountry: boolean = false,
  isWeekend: boolean = false
): Promise<void> => {
  // Base XP for visiting a place
  let xpAmount = XP_VALUES.VISIT_PLACE;
  let activityDesc = "Visited a place";

  // Additional XP for new country
  if (isNewCountry) {
    xpAmount += XP_VALUES.VISIT_NEW_COUNTRY;
    activityDesc += " in a new country";
  }

  // Weekend bonus
  if (isWeekend) {
    xpAmount += XP_VALUES.WEEKEND_VISIT;
    activityDesc += " on a weekend";
  }

  await awardXP(xpAmount, activityDesc);
};

/**
 * Award XP for maintaining a streak
 * @param streakDays Number of days in the streak
 */
export const awardStreakXP = async (streakDays: number): Promise<void> => {
  // Daily streak XP
  const xpAmount = XP_VALUES.DAILY_STREAK;
  await awardXP(xpAmount, `Day ${streakDays} streak maintained`);

  // Check for milestone bonuses
  if (streakDays === 7) {
    await awardXP(XP_VALUES.MILESTONE_WEEK_STREAK, "One week streak milestone");
  } else if (streakDays === 30) {
    await awardXP(XP_VALUES.MILESTONE_MONTH_STREAK, "One month streak milestone");
  }
};

/**
 * Award XP for reaching a places discovered milestone
 * @param totalPlaces Total number of places discovered
 */
export const checkPlacesMilestone = async (totalPlaces: number): Promise<void> => {
  if (totalPlaces === 5) {
    await awardXP(XP_VALUES.MILESTONE_5_PLACES, "5 places milestone");
  } else if (totalPlaces === 10) {
    await awardXP(XP_VALUES.MILESTONE_10_PLACES, "10 places milestone");
  } else if (totalPlaces === 25) {
    await awardXP(XP_VALUES.MILESTONE_25_PLACES, "25 places milestone");
  } else if (totalPlaces === 50) {
    await awardXP(XP_VALUES.MILESTONE_50_PLACES, "50 places milestone");
  } else if (totalPlaces === 100) {
    await awardXP(XP_VALUES.MILESTONE_100_PLACES, "100 places milestone");
  }
};

/**
 * Award XP for reaching a countries visited milestone
 * @param totalCountries Total number of countries visited
 */
export const checkCountriesMilestone = async (totalCountries: number): Promise<void> => {
  if (totalCountries === 3) {
    await awardXP(XP_VALUES.MILESTONE_3_COUNTRIES, "3 countries milestone");
  } else if (totalCountries === 5) {
    await awardXP(XP_VALUES.MILESTONE_5_COUNTRIES, "5 countries milestone");
  } else if (totalCountries === 10) {
    await awardXP(XP_VALUES.MILESTONE_10_COUNTRIES, "10 countries milestone");
  }
};

/**
 * Award XP for continents visited milestone
 * @param totalContinents Total number of continents visited
 */
export const checkContinentsMilestone = async (totalContinents: number): Promise<void> => {
  if (totalContinents === 1) {
    await awardXP(XP_VALUES.MILESTONE_FIRST_CONTINENT, "First continent milestone");
  } else if (totalContinents === 3) {
    await awardXP(XP_VALUES.MILESTONE_THIRD_CONTINENT, "Three continents milestone");
  }
};

/**
 * Award XP for distance traveled
 * @param distanceKm Distance traveled in kilometers
 * @param isMilestone Whether this is a distance milestone
 */
export const awardDistanceXP = async (distanceKm: number, totalDistance: number): Promise<void> => {
  // Base XP for distance (1 XP per km)
  const xpAmount = Math.round(distanceKm * XP_VALUES.DISTANCE_KM);
  await awardXP(xpAmount, `Traveled ${distanceKm.toFixed(1)} km`);

  // Check for distance milestones
  if (totalDistance >= 100 && totalDistance - distanceKm < 100) {
    await awardXP(XP_VALUES.MILESTONE_100_KM, "100km total traveled milestone");
  } else if (totalDistance >= 1000 && totalDistance - distanceKm < 1000) {
    await awardXP(XP_VALUES.MILESTONE_1000_KM, "1000km total traveled milestone");
  }
};

/**
 * Award XP for discovering a new category of place
 */
export const awardNewCategoryXP = async (category: string): Promise<void> => {
  await awardXP(XP_VALUES.DIVERSE_CATEGORY, `Discovered new category: ${category}`);
};

/**
 * Calculate level based on XP
 * @param xp Current XP
 * @returns Calculated level
 */
export const calculateLevelFromXP = (xp: number): number => {
  let level = 1;

  for (const levelData of EXPLORATION_LEVELS) {
    if (xp >= levelData.requiredScore) {
      level = levelData.level;
    } else {
      break;
    }
  }

  return level;
};

/**
 * Get XP required for the next level
 * @param currentLevel Current level
 * @returns XP required for next level
 */
export const getXPForNextLevel = (currentLevel: number): number => {
  const currentLevelData = EXPLORATION_LEVELS.find((level) => level.level === currentLevel);
  const nextLevelData = EXPLORATION_LEVELS.find((level) => level.level === currentLevel + 1);

  if (!currentLevelData || !nextLevelData) {
    return 0; // Max level or invalid level
  }

  return nextLevelData.requiredScore - currentLevelData.requiredScore;
};

/**
 * Calculate XP progress towards next level as a percentage
 * @param currentXP Current XP
 * @param currentLevel Current level
 * @returns Progress percentage (0-100)
 */
export const calculateLevelProgress = (currentXP: number, currentLevel: number): number => {
  const currentLevelData = EXPLORATION_LEVELS.find((level) => level.level === currentLevel);
  const nextLevelData = EXPLORATION_LEVELS.find((level) => level.level === currentLevel + 1);

  if (!currentLevelData || !nextLevelData) {
    return 100; // Max level or invalid level
  }

  const xpForCurrentLevel = currentLevelData.requiredScore;
  const xpForNextLevel = nextLevelData.requiredScore;
  const xpRange = xpForNextLevel - xpForCurrentLevel;

  const progress = ((currentXP - xpForCurrentLevel) / xpRange) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0-100
};

/**
 * Get level title based on level number
 * @param level Level number
 * @returns Level title
 */
export const getLevelTitle = (level: number): string => {
  const levelData = EXPLORATION_LEVELS.find((l) => l.level === level);
  return levelData ? levelData.title : "Unknown";
};

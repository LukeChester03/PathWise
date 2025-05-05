import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { StatItem, UserStatsData, EXPLORATION_LEVELS, STAT_COLORS } from "../types/StatTypes";
import {
  awardVisitXP,
  awardStreakXP,
  checkPlacesMilestone,
  checkCountriesMilestone,
  checkContinentsMilestone,
  awardDistanceXP,
  awardNewCategoryXP,
  calculateLevelFromXP,
  getLevelTitle,
} from "./Levelling/xpService";

const DAY_IN_MS = 86400000;
const WEEK_IN_MS = DAY_IN_MS * 7;
const KM_MULTIPLIER = 1.2;

const CONTINENT_MAPPING = {
  Africa: [
    "Algeria",
    "Angola",
    "Egypt",
    "Kenya",
    "Morocco",
    "Nigeria",
    "South Africa",
    "Tanzania",
    "Tunisia",
  ],
  Asia: [
    "China",
    "India",
    "Indonesia",
    "Japan",
    "Malaysia",
    "Philippines",
    "Singapore",
    "South Korea",
    "Thailand",
    "Vietnam",
  ],
  Europe: [
    "France",
    "Germany",
    "Italy",
    "Netherlands",
    "Poland",
    "Spain",
    "Sweden",
    "Switzerland",
    "United Kingdom",
  ],
  "North America": ["Canada", "Costa Rica", "Cuba", "Jamaica", "Mexico", "United States"],
  "South America": ["Argentina", "Brazil", "Chile", "Colombia", "Peru", "Venezuela"],
  Oceania: ["Australia", "Fiji", "New Zealand", "Papua New Guinea"],
  Antarctica: ["Antarctica"],
};

const createDefaultUserStatsDocument = async (userId: string) => {
  try {
    const statsDocRef = doc(db, "userStats", userId);
    const now = new Date();

    const defaultStatsData: UserStatsData = {
      placesDiscovered: 0,
      countriesVisited: 0,
      dayStreak: 0,
      achievementsEarned: 0,
      distanceTraveled: 0,
      topCity: "",
      topCityCount: 0,
      explorationScore: 0,
      localExpertArea: "",
      localExpertCount: 0,
      avgVisitsPerWeek: 0,
      photosTaken: 0,
      favoriteCategory: "",
      favoriteCategoryCount: 0,
      peakExplorationHour: 12,
      explorationLevel: 1,
      totalTime: 0,
      weekendExplorerScore: 0,
      longestJourney: 0,
      continentsVisited: 0,
      firstVisitTime: now,
      lastUpdated: now,
      lastLogin: now,
      visitedCountries: [],
      processedPlaceIds: [],
      visitedCities: {},
      visitedCategories: {},
      weekdayVisits: [0, 0, 0, 0, 0, 0, 0],
      hourVisits: Array(24).fill(0),
      explorationMilestones: {},
    };

    await setDoc(statsDocRef, defaultStatsData, { merge: true });
    console.log("Created default stats document for user:", userId);
  } catch (error) {
    console.error("Error creating default stats document:", error);
  }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * KM_MULTIPLIER;
}

function getContinent(country: string): string | null {
  for (const [continent, countries] of Object.entries(CONTINENT_MAPPING)) {
    if (countries.includes(country)) {
      return continent;
    }
  }
  return null;
}

function countContinents(countries: string[]): number {
  const continents = new Set<string>();
  countries.forEach((country) => {
    const continent = getContinent(country);
    if (continent) continents.add(continent);
  });
  return continents.size;
}

function calculateExplorationScore(statsData: UserStatsData): number {
  if (statsData.explorationScore) {
    return statsData.explorationScore;
  }
  let score = 0;

  score += statsData.placesDiscovered * 10;
  score += statsData.countriesVisited * 50;
  score += Math.min(statsData.distanceTraveled, 1000);
  score += statsData.dayStreak * 5;
  score += statsData.achievementsEarned * 25;
  const uniqueCategories = Object.keys(statsData.visitedCategories || {}).length;
  const uniqueCities = Object.keys(statsData.visitedCities || {}).length;
  score += uniqueCategories * 15;
  score += uniqueCities * 20;
  score += (statsData.continentsVisited || 0) * 100;
  return Math.floor(score);
}

export const fetchUserStats = async (): Promise<StatItem[]> => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No user logged in");
      return [];
    }

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (statsDoc.exists()) {
      const statsData = statsDoc.data() as UserStatsData;

      if (!statsData.explorationLevel || !statsData.explorationScore) {
        const score = calculateExplorationScore(statsData);
        const level = calculateLevelFromXP(score);
        await updateDoc(statsDocRef, {
          explorationScore: score,
          explorationLevel: level,
        });

        statsData.explorationScore = score;
        statsData.explorationLevel = level;
      }
      const distance = statsData.distanceTraveled
        ? statsData.distanceTraveled > 1
          ? `${Math.round(statsData.distanceTraveled)} km`
          : `${(statsData.distanceTraveled * 1000).toFixed(0)} m`
        : "0 km";

      const topCity = statsData.topCity || "None yet";
      const avgVisits = statsData.avgVisitsPerWeek ? statsData.avgVisitsPerWeek.toFixed(1) : "0";

      const explorationLevel = statsData.explorationLevel || 1;
      const levelTitle = getLevelTitle(explorationLevel);

      return [
        {
          id: 1,
          icon: "map-outline",
          value: statsData.placesDiscovered || 0,
          label: "Places Discovered",
          gradientColors: STAT_COLORS.blue,
        },
        {
          id: 2,
          icon: "earth-outline",
          value: statsData.countriesVisited || 0,
          label: "Countries Visited",
          gradientColors: STAT_COLORS.orange,
        },
        {
          id: 3,
          icon: "flame-outline",
          value: statsData.dayStreak || 0,
          label: "Day Streak",
          gradientColors: STAT_COLORS.pink,
        },
        {
          id: 4,
          icon: "trophy-outline",
          value: `Level ${explorationLevel}`,
          label: levelTitle,
          gradientColors: STAT_COLORS.cyan,
        },
        {
          id: 5,
          icon: "walk-outline",
          value: distance,
          label: "Distance Traveled",
          gradientColors: STAT_COLORS.green,
        },
        {
          id: 6,
          icon: "location-outline",
          value: topCity,
          label: "Top City",
          gradientColors: STAT_COLORS.purple,
        },
        {
          id: 7,
          icon: "analytics-outline",
          value: statsData.explorationScore || 0,
          label: "Explorer Score",
          gradientColors: STAT_COLORS.yellow,
        },
        {
          id: 8,
          icon: "time-outline",
          value: avgVisits,
          label: "Visits per Week",
          gradientColors: STAT_COLORS.indigo,
        },
        {
          id: 9,
          icon: "airplane-outline",
          value: statsData.continentsVisited || 0,
          label: "Continents Visited",
          gradientColors: STAT_COLORS.teal,
        },
        {
          id: 10,
          icon: "star-outline",
          value: statsData.achievementsEarned || 0,
          label: "Achievements",
          gradientColors: STAT_COLORS.red,
        },
      ];
    }

    await createDefaultUserStatsDocument(currentUser.uid);

    return [
      {
        id: 1,
        icon: "map-outline",
        value: 0,
        label: "Places Discovered",
        gradientColors: STAT_COLORS.blue,
      },
      {
        id: 2,
        icon: "earth-outline",
        value: 0,
        label: "Countries Visited",
        gradientColors: STAT_COLORS.orange,
      },
      {
        id: 3,
        icon: "flame-outline",
        value: 0,
        label: "Day Streak",
        gradientColors: STAT_COLORS.pink,
      },
      {
        id: 4,
        icon: "trophy-outline",
        value: "Level 1",
        label: "Beginner Explorer",
        gradientColors: STAT_COLORS.cyan,
      },
      {
        id: 5,
        icon: "walk-outline",
        value: "0 km",
        label: "Distance Traveled",
        gradientColors: STAT_COLORS.green,
      },
      {
        id: 6,
        icon: "location-outline",
        value: "None yet",
        label: "Top City",
        gradientColors: STAT_COLORS.purple,
      },
      {
        id: 7,
        icon: "analytics-outline",
        value: 0,
        label: "Explorer Score",
        gradientColors: STAT_COLORS.yellow,
      },
      {
        id: 8,
        icon: "time-outline",
        value: "0",
        label: "Visits per Week",
        gradientColors: STAT_COLORS.indigo,
      },
      {
        id: 9,
        icon: "airplane-outline",
        value: 0,
        label: "Continents Visited",
        gradientColors: STAT_COLORS.teal,
      },
      {
        id: 10,
        icon: "star-outline",
        value: 0,
        label: "Achievements",
        gradientColors: STAT_COLORS.red,
      },
    ];
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return [];
  }
};

export const updateUserStats = async (statsUpdate: Partial<UserStatsData>): Promise<void> => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No user logged in");
    }

    const statsDocRef = doc(db, "userStats", currentUser.uid);

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

export const incrementStat = async (
  statKey: keyof UserStatsData,
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

    const currentValue =
      statsData && typeof statsData[statKey] === "number" ? (statsData[statKey] as number) : 0;

    const newValue = Math.max(0, currentValue + incrementBy);

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

    const timeDifference = now.getTime() - lastLogin.getTime();

    let newStreak = statsData.dayStreak || 0;
    let streakUpdated = false;

    if (timeDifference > DAY_IN_MS * 2) {
      newStreak = 1;
      console.log("Streak reset: More than 2 days since last login");
      streakUpdated = true;
    } else if (timeDifference > DAY_IN_MS) {
      newStreak += 1;
      console.log("Streak incremented: New day login");
      streakUpdated = true;
      await awardStreakXP(newStreak);
    } else {
      console.log("Same day login, streak unchanged");
    }

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

export const processVisitedPlace = async (placeData: {
  placeId: string;
  name: string;
  country: string;
  city?: string;
  category?: string;
  latitude: number;
  longitude: number;
  visitedAt?: Date;
  stayDuration?: number;
  photosTaken?: number;
}): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      await createDefaultUserStatsDocument(currentUser.uid);
    }

    const statsData = statsDoc.exists() ? (statsDoc.data() as UserStatsData) : null;
    if (!statsData) return;
    const visitedCountries = statsData.visitedCountries || [];
    const processedPlaceIds = statsData.processedPlaceIds || [];
    const visitedCities = statsData.visitedCities || {};
    const visitedCategories = statsData.visitedCategories || {};
    const weekdayVisits = statsData.weekdayVisits || Array(7).fill(0);
    const hourVisits = statsData.hourVisits || Array(24).fill(0);

    if (processedPlaceIds.includes(placeData.placeId)) {
      console.log(`Place ${placeData.name} already counted in stats`);
      return;
    }

    const isNewCountry = !visitedCountries.includes(placeData.country);

    const category = placeData.category || "Other";
    const isNewCategory = !Object.keys(visitedCategories).includes(category);

    const city = placeData.city || "Unknown";
    visitedCities[city] = (visitedCities[city] || 0) + 1;

    visitedCategories[category] = (visitedCategories[category] || 0) + 1;

    let topCity = statsData.topCity || "";
    let topCityCount = statsData.topCityCount || 0;
    let favoriteCategory = statsData.favoriteCategory || "";
    let favoriteCategoryCount = statsData.favoriteCategoryCount || 0;

    Object.entries(visitedCities).forEach(([cityName, count]) => {
      if (typeof count === "number" && count > topCityCount) {
        topCity = cityName;
        topCityCount = count;
      }
    });

    Object.entries(visitedCategories).forEach(([categoryName, count]) => {
      if (typeof count === "number" && count > favoriteCategoryCount) {
        favoriteCategory = categoryName;
        favoriteCategoryCount = count;
      }
    });

    const continents = countContinents(
      visitedCountries.concat(isNewCountry ? [placeData.country] : [])
    );

    let newDistance = 0;
    if (processedPlaceIds.length > 0) {
      const visitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
      const q = query(visitedPlacesRef, orderBy("visitedAt", "desc"), limit(1));
      const lastVisitSnapshot = await getDocs(q);

      if (!lastVisitSnapshot.empty) {
        const lastPlace = lastVisitSnapshot.docs[0].data();
        if (lastPlace.location && lastPlace.location.latitude) {
          newDistance = calculateDistance(
            lastPlace.location.latitude,
            lastPlace.location.longitude,
            placeData.latitude,
            placeData.longitude
          );
        }
      }
    }

    const visitTime = placeData.visitedAt || new Date();
    const visitDate = visitTime instanceof Date ? visitTime : visitTime.toDate();
    const dayOfWeek = visitDate.getDay();
    const hourOfDay = visitDate.getHours();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (weekdayVisits[dayOfWeek] !== undefined) {
      weekdayVisits[dayOfWeek]++;
    }

    if (hourVisits[hourOfDay] !== undefined) {
      hourVisits[hourOfDay]++;
    }

    let peakHour = 0;
    let peakHourCount = 0;
    hourVisits.forEach((count, hour) => {
      if (typeof count === "number" && count > peakHourCount) {
        peakHourCount = count;
        peakHour = hour;
      }
    });

    const weekendVisits =
      (weekdayVisits[0] !== undefined ? weekdayVisits[0] : 0) +
      (weekdayVisits[6] !== undefined ? weekdayVisits[6] : 0);
    const totalVisits = weekdayVisits.reduce(
      (sum, count) => sum + (typeof count === "number" ? count : 0),
      0
    );
    const weekendExplorerScore = totalVisits > 0 ? (weekendVisits / totalVisits) * 100 : 0;

    const firstVisitTime = statsData.firstVisitTime
      ? statsData.firstVisitTime instanceof Date
        ? statsData.firstVisitTime
        : statsData.firstVisitTime.toDate()
      : new Date();

    const timeSinceFirstVisit = visitDate.getTime() - firstVisitTime.getTime();
    const weeksActive = Math.max(1, timeSinceFirstVisit / WEEK_IN_MS);
    const avgVisitsPerWeek = (processedPlaceIds.length + 1) / weeksActive;

    const totalTime = (statsData.totalTime || 0) + (placeData.stayDuration || 0);

    const longestJourney = Math.max(statsData.longestJourney || 0, newDistance);

    let updates: Partial<UserStatsData> = {
      processedPlaceIds: [...processedPlaceIds, placeData.placeId],
      placesDiscovered: (statsData.placesDiscovered || 0) + 1,
      distanceTraveled: (statsData.distanceTraveled || 0) + newDistance,
      visitedCities,
      topCity,
      topCityCount,
      visitedCategories,
      favoriteCategory,
      favoriteCategoryCount,
      weekdayVisits,
      hourVisits,
      peakExplorationHour: peakHour,
      weekendExplorerScore,
      firstVisitTime: statsData.firstVisitTime || visitDate,
      avgVisitsPerWeek,
      totalTime,
      longestJourney,
      photosTaken: (statsData.photosTaken || 0) + (placeData.photosTaken || 0),
      lastUpdated: new Date(),
    };

    if (isNewCountry) {
      updates.visitedCountries = [...visitedCountries, placeData.country];
      updates.countriesVisited = (statsData.countriesVisited || 0) + 1;
      updates.continentsVisited = continents;
      console.log(`New country visited: ${placeData.country}`);
    }

    await awardVisitXP(isNewCountry, isWeekend);

    if (isNewCategory) {
      await awardNewCategoryXP(category);
    }

    if (newDistance > 0) {
      await awardDistanceXP(newDistance, (statsData.distanceTraveled || 0) + newDistance);
    }

    await checkPlacesMilestone(updates.placesDiscovered);

    if (isNewCountry) {
      await checkCountriesMilestone(updates.countriesVisited);

      if (continents > (statsData.continentsVisited || 0)) {
        await checkContinentsMilestone(continents);
      }
    }

    await updateDoc(statsDocRef, updates);
    console.log(`Place visit processed: ${placeData.name} (${newDistance.toFixed(1)}km added)`);
  } catch (error) {
    console.error("Error processing visited place:", error);
  }
};

export const setupVisitedPlacesListener = (onStatsChange: () => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("No user logged in for visited places listener");
    return () => {};
  }

  const visitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");

  const unsubscribe = onSnapshot(visitedPlacesRef, async (snapshot) => {
    console.log("Visited places updated, processing changes");

    const changes = snapshot.docChanges();

    let statsChanged = false;

    for (const change of changes) {
      if (change.type === "added") {
        const placeData = change.doc.data();

        const statsDocRef = doc(db, "userStats", currentUser.uid);
        const statsDoc = await getDoc(statsDocRef);

        if (statsDoc.exists()) {
          const statsData = statsDoc.data() as UserStatsData;
          const processedPlaceIds = statsData.processedPlaceIds || [];

          const placeId = placeData.placeId || placeData.place_id;
          if (placeId && processedPlaceIds.includes(placeId)) {
            console.log(`Place ${placeData.name} already counted in stats, skipping`);
            continue;
          }
        }

        let city = "Unknown";
        if (placeData.address_components) {
          const cityComponent = placeData.address_components.find(
            (component: any) =>
              component.types.includes("locality") ||
              component.types.includes("administrative_area_level_1")
          );
          if (cityComponent) {
            city = cityComponent.long_name;
          }
        } else if (placeData.vicinity) {
          const parts = placeData.vicinity.split(",");
          if (parts.length > 1) {
            city = parts[parts.length - 1].trim();
          }
        }

        let category = "Other";
        if (placeData.types && placeData.types.length > 0) {
          const typeMapping: { [key: string]: string } = {
            restaurant: "Restaurant",
            cafe: "Café",
            bar: "Bar",
            lodging: "Accommodation",
            museum: "Cultural",
            park: "Nature",
            tourist_attraction: "Sightseeing",
            shopping_mall: "Shopping",
            amusement_park: "Entertainment",
          };

          for (const type of placeData.types) {
            if (typeMapping[type]) {
              category = typeMapping[type];
              break;
            }
          }
        }

        await processVisitedPlace({
          placeId: placeData.placeId || placeData.place_id,
          name: placeData.name,
          country: placeData.country || "Unknown",
          city: city,
          category: category,
          latitude: placeData.location?.latitude || placeData.geometry?.location?.lat || 0,
          longitude: placeData.location?.longitude || placeData.geometry?.location?.lng || 0,
          visitedAt: placeData.visitedAt ? new Date(placeData.visitedAt) : new Date(),
          stayDuration: placeData.stayDuration || 30, // Default to 30 minutes if not specified
          photosTaken: placeData.photosTaken || (placeData.photos ? placeData.photos.length : 0),
        });

        statsChanged = true;
      }
    }

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
  await updateDayStreak();
  return setupVisitedPlacesListener(onStatsChange);
};

export const unlockAchievement = async (
  achievementId: string,
  achievementName: string
): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      await createDefaultUserStatsDocument(currentUser.uid);
    }

    const statsData = statsDoc.data() as UserStatsData;
    const achievements = statsData.explorationMilestones || {};

    if (achievements[achievementId]) {
      return false;
    }
    achievements[achievementId] = true;

    await updateDoc(statsDocRef, {
      achievementsEarned: (statsData.achievementsEarned || 0) + 1,
      explorationMilestones: achievements,
      lastUpdated: new Date(),
    });

    await awardVisitXP(false, false);

    console.log(`Achievement unlocked: ${achievementName}`);
    return true;
  } catch (error) {
    console.error("Error unlocking achievement:", error);
    return false;
  }
};

export const checkAndAwardMilestones = async (): Promise<string[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) return [];

    const statsData = statsDoc.data() as UserStatsData;
    const milestones = statsData.explorationMilestones || {};

    const awardedMilestones: string[] = [];

    const milestonesToCheck = [
      { id: "first_place", name: "First Steps", condition: statsData.placesDiscovered >= 1 },
      { id: "ten_places", name: "Frequent Explorer", condition: statsData.placesDiscovered >= 10 },
      {
        id: "fifty_places",
        name: "Seasoned Traveler",
        condition: statsData.placesDiscovered >= 50,
      },
      {
        id: "hundred_places",
        name: "Century Explorer",
        condition: statsData.placesDiscovered >= 100,
      },
      { id: "first_country", name: "Home Sweet Home", condition: statsData.countriesVisited >= 1 },
      { id: "three_countries", name: "Border Crosser", condition: statsData.countriesVisited >= 3 },
      { id: "ten_countries", name: "Globetrotter", condition: statsData.countriesVisited >= 10 },
      { id: "week_streak", name: "Consistency is Key", condition: statsData.dayStreak >= 7 },
      { id: "month_streak", name: "Dedicated Explorer", condition: statsData.dayStreak >= 30 },
      {
        id: "first_hundred_km",
        name: "First Hundred",
        condition: statsData.distanceTraveled >= 100,
      },
      {
        id: "thousand_km",
        name: "Distance Champion",
        condition: statsData.distanceTraveled >= 1000,
      },
      { id: "level_5", name: "Rising Star", condition: statsData.explorationLevel >= 5 },
      { id: "level_10", name: "Explorer Legend", condition: statsData.explorationLevel >= 10 },
      {
        id: "three_continents",
        name: "Continental Traveler",
        condition: statsData.continentsVisited >= 3,
      },
      { id: "city_expert", name: "City Expert", condition: statsData.topCityCount >= 10 },
    ];
    for (const milestone of milestonesToCheck) {
      if (milestone.condition && !milestones[milestone.id]) {
        const awarded = await unlockAchievement(milestone.id, milestone.name);
        if (awarded) {
          awardedMilestones.push(milestone.name);
        }
      }
    }

    return awardedMilestones;
  } catch (error) {
    console.error("Error checking milestones:", error);
    return [];
  }
};

export const fetchUserLevelInfo = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const statsDocRef = doc(db, "userStats", currentUser.uid);
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      await createDefaultUserStatsDocument(currentUser.uid);
      return {
        level: 1,
        xp: 0,
        title: "Beginner Explorer",
        nextLevelXP: 100,
        progress: 0,
        xpNeeded: 100,
        xpProgress: 0,
      };
    }

    const statsData = statsDoc.data() as UserStatsData;

    const currentLevel = statsData.explorationLevel || 1;
    const currentXP = statsData.explorationScore || 0;

    const currentLevelData = EXPLORATION_LEVELS.find((level) => level.level === currentLevel);
    const nextLevelData = EXPLORATION_LEVELS.find((level) => level.level === currentLevel + 1);

    if (!currentLevelData || !nextLevelData) {
      return {
        level: currentLevel,
        xp: currentXP,
        title: getLevelTitle(currentLevel),
        nextLevelXP: 0,
        progress: 100,
        xpNeeded: 0,
        xpProgress: 0,
      };
    }

    const nextLevelXP = nextLevelData.requiredScore;
    const currentLevelXP = currentLevelData.requiredScore;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const xpProgress = currentXP - currentLevelXP;
    const progress = Math.min(Math.round((xpProgress / xpNeeded) * 100), 100);

    return {
      level: currentLevel,
      xp: currentXP,
      title: currentLevelData.title,
      nextLevelXP: nextLevelXP,
      progress: progress,
      xpForCurrentLevel: currentLevelXP,
      xpForNextLevel: nextLevelXP,
      xpNeeded: xpNeeded,
      xpProgress: xpProgress,
    };
  } catch (error) {
    console.error("Error fetching user level info:", error);
    return null;
  }
};

// services/LearnScreen/travelProfileService.ts
import { generateContent } from "../Gemini/geminiService";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  query,
  where,
  updateDoc,
  arrayUnion,
  increment,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { Place, VisitedPlaceDetails } from "../../types/MapTypes";
import {
  TravelProfile,
  TravelBadge,
  TravelPreference,
  BadgeTask,
  TravelerTrait,
} from "../../types/LearnScreen/TravelProfileTypes";
import { getAllUserBadges, updateBadgeRequirements, completeBadge } from "./badgeService";
import { AccentColors, Colors, NeutralColors } from "@/app/constants/colours";

// services/LearnScreen/travelProfileService.ts
// ... imports remain the same

// Constants for profile refresh
const PROFILE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Define the AI response type for proper type checking
interface GeminiTravelProfileResponse {
  type?: string;
  level?: string;
  description?: string;
  badges?: {
    name: string;
    description: string;
  }[];
  // Add traveler traits to the response type
  travelerTraits?: {
    id: string;
    title: string;
    description: string;
    icon: string;
  }[];
  // Add travel milestones
  travelMilestones?: {
    title: string;
    value: string | number;
    icon: string;
    description?: string;
  }[];
  visitFrequency?: {
    weekdays?: {
      most: string;
      percentage: number;
      insight: string;
    };
    timeOfDay?: {
      most: string;
      percentage: number;
      insight: string;
    };
    season?: {
      most: string;
      percentage: number;
      insight: string;
    };
  };
  visitation?: {
    averageDuration?: string;
    averageDistance?: string;
    mostVisitedCity?: string;
  };
  patterns?: string[];
  preferences?: {
    categories?: {
      category: string;
      percentage: number;
    }[];
    architecturalStyles?: {
      name: string;
      percentage: number;
    }[];
    activities?: {
      name: string;
      percentage: number;
    }[];
  };
  recentInsights?: string[];
  firstVisitDate?: string;
  bestDayToExplore?: string;
  explorationScore?: number;
}
// Interface for Firestore document data
interface VisitedPlaceDocument {
  _isInitDocument?: boolean;
  place_id?: string;
  name?: string;
  vicinity?: string;
  location?: string;
  visitedAt?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  website?: string | null;
  types?: string[];
  placeType?: string;
  category?: string;
  tags?: string[];
  [key: string]: any; // For any other fields in the document
}

// Interface for profile document in Firebase (without badges, which are stored separately)
interface ProfileDocument {
  type: string;
  level: string;
  description: string;
  streak: number;
  visitFrequency: {
    weekdays: {
      most: string;
      percentage: number;
      insight: string;
    };
    timeOfDay: {
      most: string;
      percentage: number;
      insight: string;
    };
    season: {
      most: string;
      percentage: number;
      insight: string;
    };
  };
  visitation: {
    averageDuration: string;
    averageDistance: string;
    mostVisitedCity: string;
  };
  patterns: string[];
  preferences: {
    categories: TravelPreference[];
    architecturalStyles: {
      name: string;
      percentage: number;
    }[];
    activities: {
      name: string;
      percentage: number;
    }[];
  };
  recentInsights: string[];
  lastGeneratedAt: number;
  placeCount: number;
  travelerTraits?: TravelerTrait[]; // Include traveler traits in the document
  travelMilestones?: any[]; // Include travel milestones
  explorationScore?: number; // Include exploration score
  firstVisitDate?: string; // Include first visit date (must be optional to allow backward compatibility)
}

// Function to generate default traveler traits if none are found
const generateDefaultTraits = (): TravelerTrait[] => {
  const traitColors = [
    Colors.primary,
    Colors.secondary,
    AccentColors.accent1,
    AccentColors.accent2,
    AccentColors.accent3,
  ];

  return [
    {
      id: "explorer",
      title: "Explorer",
      description: "You enjoy discovering new places and expanding your travel horizons.",
      icon: "compass",
      color: traitColors[0],
    },
    {
      id: "cultural-explorer",
      title: "Cultural Explorer",
      description: "You seek to understand the local culture and traditions in places you visit.",
      icon: "color-palette",
      color: traitColors[1],
    },
    {
      id: "planner",
      title: "Thoughtful Planner",
      description: "You like to research and plan your visits with attention to detail.",
      icon: "calendar",
      color: traitColors[2],
    },
  ];
};

// Default profile for fallback scenarios
const DEFAULT_TRAVEL_PROFILE: TravelProfile = {
  type: "Explorer",
  level: "Beginner",
  description: "You're starting your journey as a traveler, exploring a variety of destinations.",
  streak: 0,
  visitFrequency: {
    weekdays: {
      most: "Weekend",
      percentage: 60,
      insight: "You prefer weekend explorations",
    },
    timeOfDay: {
      most: "Afternoon",
      percentage: 50,
      insight: "You tend to visit places in the afternoon",
    },
    season: {
      most: "Summer",
      percentage: 40,
      insight: "Your travel picks up during summer months",
    },
  },
  visitation: {
    averageDuration: "1.5 hours",
    averageDistance: "5 km",
    mostVisitedCity: "Unknown",
  },
  patterns: [
    "You're beginning to establish travel patterns",
    "You explore diverse types of locations",
    "You're building your travel experience",
  ],
  preferences: {
    categories: [
      { category: "Urban Exploration", percentage: 50, icon: "map" },
      { category: "Cultural Venues", percentage: 40, icon: "color-palette" },
      { category: "Natural Settings", percentage: 30, icon: "leaf" },
    ],
    architecturalStyles: [
      { name: "Modern", percentage: 40 },
      { name: "Classical", percentage: 30 },
    ],
    activities: [
      { name: "Sightseeing", percentage: 60 },
      { name: "Photography", percentage: 40 },
    ],
  },
  recentInsights: [
    "You're starting to develop preferences in your travel choices",
    "Your exploration style is still evolving",
  ],
  travelerTraits: generateDefaultTraits(), // Add default traits
  isGenerating: false,
};

/**
 * Fetch user's visited places from Firestore
 */
export const fetchUserVisitedPlaces = async (): Promise<VisitedPlaceDetails[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
    const querySnapshot = await getDocs(userVisitedPlacesRef);

    if (querySnapshot.empty) {
      return [];
    }

    const userPlacesData = querySnapshot.docs
      .filter((doc) => {
        const data = doc.data() as VisitedPlaceDocument;
        return !data._isInitDocument;
      })
      .map((doc) => {
        const data = doc.data() as VisitedPlaceDocument;

        // Create a valid Place object by ensuring all required fields are present
        const place: VisitedPlaceDetails = {
          place_id: data.place_id || doc.id,
          name: data.name || "Unknown Place",
          geometry: data.geometry || {
            location: {
              lat: 0,
              lng: 0,
            },
          },
          website: data.website || null,
          visitedAt: data.visitedAt || new Date().toISOString(),

          // Additional properties from the document
          ...(data.vicinity && { vicinity: data.vicinity }),
          ...(data.types && { types: data.types }),

          // Include any other fields that might be in the document
          ...Object.entries(data)
            .filter(
              ([key]) =>
                ![
                  "_isInitDocument",
                  "place_id",
                  "name",
                  "geometry",
                  "website",
                  "visitedAt",
                  "vicinity",
                  "types",
                ].includes(key)
            )
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
        };

        return place;
      });

    return userPlacesData;
  } catch (error) {
    console.error("Error fetching user's visited places:", error);
    throw error;
  }
};

/**
 * Save travel profile to Firebase - core profile and badges separately
 */
const saveProfileToFirebase = async (profile: TravelProfile, placeCount: number): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot save profile: No authenticated user");
      return;
    }

    // Create a batch for atomic operations
    const batch = writeBatch(db);

    // Save core profile data (excluding badges)
    const profileDocRef = doc(db, "users", currentUser.uid, "travelProfiles", "current");

    // Prepare the profile document with additional metadata
    const profileDocument: ProfileDocument = {
      type: profile.type,
      level: profile.level,
      description: profile.description,
      streak: profile.streak,
      visitFrequency: profile.visitFrequency,
      visitation: profile.visitation,
      patterns: profile.patterns,
      preferences: profile.preferences,
      recentInsights: profile.recentInsights,
      lastGeneratedAt: Date.now(),
      placeCount: placeCount,
      travelerTraits: profile.travelerTraits, // Save traveler traits to Firebase
      travelMilestones: profile.travelMilestones, // Save travel milestones
      explorationScore: profile.explorationScore, // Save exploration score
      firstVisitDate: profile.firstVisitDate, // Explicitly save firstVisitDate to Firebase
    };

    // Log to ensure we're saving the firstVisitDate
    if (profile.firstVisitDate) {
      console.log(`Saving firstVisitDate to Firebase: ${profile.firstVisitDate}`);
    } else {
      console.warn("No firstVisitDate found in profile to save to Firebase");
    }

    batch.set(profileDocRef, profileDocument);

    // Commit all changes
    await batch.commit();
    console.log("Travel profile saved to Firebase successfully");
  } catch (error) {
    console.error("Error saving profile to Firebase:", error);
  }
};

/**
 * Retrieve travel profile from Firebase if it exists and is valid
 */
const getProfileFromFirebase = async (): Promise<{
  profile: TravelProfile | null;
  needsRefresh: boolean;
}> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot retrieve profile: No authenticated user");
      return { profile: null, needsRefresh: true };
    }

    // 1. Get the core profile document
    const profileDocRef = doc(db, "users", currentUser.uid, "travelProfiles", "current");
    const profileDoc = await getDoc(profileDocRef);

    if (!profileDoc.exists()) {
      console.log("No profile found in Firebase");
      return { profile: null, needsRefresh: true };
    }

    const profileData = profileDoc.data() as ProfileDocument;
    const now = Date.now();
    const age = now - profileData.lastGeneratedAt;

    // 2. Get badges
    const badges = await getAllUserBadges();

    // Combine profile and badges
    const fullProfile: TravelProfile = {
      ...profileData,
      isGenerating: false,
    };

    // Check if traveler traits exist, if not, generate them
    if (!fullProfile.travelerTraits || fullProfile.travelerTraits.length === 0) {
      console.log("No traveler traits found in Firebase profile, generating defaults");
      fullProfile.travelerTraits = generateDefaultTraits();

      // Save the updated profile with traits back to Firebase
      await updateDoc(profileDocRef, {
        travelerTraits: fullProfile.travelerTraits,
      });

      console.log("Default traveler traits saved to Firebase");
    } else {
      console.log(`Found ${fullProfile.travelerTraits.length} traveler traits in profile`);
    }

    // Check if the profile is older than 24 hours
    if (age > PROFILE_REFRESH_INTERVAL) {
      console.log(
        "Firebase profile expired, needs refresh (age:",
        Math.round(age / 3600000),
        "hours)"
      );
      return { profile: fullProfile, needsRefresh: true };
    }

    console.log(
      "Using existing travel profile from Firebase (age:",
      Math.round(age / 3600000),
      "hours)"
    );
    return { profile: fullProfile, needsRefresh: false };
  } catch (error) {
    console.error("Error retrieving profile from Firebase:", error);
    return { profile: null, needsRefresh: true };
  }
};

/**
 * Generate a travel profile based on user's visited places
 */
/**
 * Generate a travel profile based on user's visited places
 */
export const generateTravelProfile = async (
  visitedPlaces: VisitedPlaceDetails[]
): Promise<TravelProfile> => {
  try {
    if (visitedPlaces.length === 0) {
      return {
        ...DEFAULT_TRAVEL_PROFILE,
        type: "New Traveler",
        description:
          "You haven't visited any places yet. Start exploring to build your travel profile!",
      };
    }

    // Sort visited places to find the earliest visit date
    const sortedVisitedPlaces = [...visitedPlaces].sort((a, b) => {
      return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
    });

    // Calculate first visit date (will be used if AI doesn't provide one)
    const calculatedFirstVisitDate = sortedVisitedPlaces[0].visitedAt;
    console.log(`Calculated first visit date: ${calculatedFirstVisitDate}`);

    // Create a simplified version of places for the AI prompt
    const placesData = visitedPlaces.map((place) => ({
      name: place.name,
      location: place.vicinity || "",
      placeType: place.types?.[0] || "place",
      category: place.types?.[0] || "",
      tags: place.types || [],
      visitDate: new Date(place.visitedAt).toDateString(),
      visitedAt: place.visitedAt, // Include the raw visitedAt date for accurate chronology
    }));

    const prompt = `
      Analyze these ${
        visitedPlaces.length
      } places a user has visited and generate a detailed travel profile:
      ${JSON.stringify(placesData)}
      
      Consider patterns in the types of places visited, locations, frequency, and any other insights. Traveler Traits must be realistic based off the information you have received.
      Based on this data, determine the type of traveler this person is, their preferences, and suggest personalized insights. Provide the information as if you are talking directly to the user.
      You must not return unknown in any of your responses. You must not skip anything required from this prompt. If there is no data for you to work with then just return "No Data".
      
      It is CRITICAL that you include the firstVisitDate field formatted as an ISO date string of their earliest visit. You must include ALL other fields in the JSON response too.
      
      Return a JSON object with the following structure:
      {
        "type": "The primary traveler type (e.g., 'Cultural Explorer', 'Urban Adventurer', 'History Buff'. Be creative maximum two words)",
        "level": "Experience level (e.g., 'Beginner', 'Enthusiast', 'Expert')",
        "description": "A 1-2 sentence personalized description of this traveler's style and preferences",
        "travelerTraits": [
          {
            "id": "unique-trait-id", 
            "title": "Trait title (e.g., 'Weekend Adventurer', 'Culture Seeker')",
            "description": "Brief description of this trait and what it reveals about their travel style",
            "icon": "icon-name from Ionicons (e.g., 'calendar', 'museum', 'compass')"
          }
        ],
        "travelMilestones": [
          {
            "title": "Milestone title",
            "value": "Achievement value (can be number or text)",
            "icon": "icon-name from Ionicons",
            "description": "Optional description of the milestone"
          }
        ],
        "visitFrequency": {
          "weekdays": {
            "most": "Most common day of week for visits",
            "percentage": Percentage as number,
            "insight": "Brief insight about this pattern"
          },
          "timeOfDay": {
            "most": "Most common time of day",
            "percentage": Percentage as number,
            "insight": "Brief insight about this pattern"
          },
          "season": {
            "most": "Most active season",
            "percentage": Percentage as number,
            "insight": "Brief insight about this pattern"
          }
        },
        "visitation": {
          "averageDuration": "Estimated average visit duration",
          "averageDistance": "Estimated average travel distance",
          "mostVisitedCity": "Most frequently visited city/area"
        },
        "patterns": [
          "First identified travel pattern or habit",
          "Second identified pattern",
          "Third identified pattern"
        ],
        "preferences": {
          "categories": [
            {
              "category": "Category name (e.g., 'Historical Sites')",
              "percentage": Percentage preference as number
            }
          ],
          "architecturalStyles": [
            {
              "name": "Style name (e.g., 'Classical')",
              "percentage": Percentage preference as number
            }
          ],
          "activities": [
            {
              "name": "Activity name (e.g., 'Guided Tours')",
              "percentage": Percentage preference as number
            }
          ]
        },
        "recentInsights": [
          "First personalized insight based on recent activity",
          "Second personalized insight"
        ],
        "firstVisitDate": "ISO date string of first visited place if available",
        "bestDayToExplore": "Suggested best day to explore based on their patterns",
        "explorationScore": Numerical score (0-100) representing their exploration level
      }
    `;

    const responseData = await generateContent({ prompt, responseFormat: "json" });
    const response = responseData as GeminiTravelProfileResponse;
    console.log(response, "AI RESPONSE");

    // Check if firstVisitDate is included in the response
    if (!response.firstVisitDate) {
      console.log("Warning: AI response did not include firstVisitDate, using calculated value");
    }

    // Process existing data as before...
    // Map category names to icons
    const categoryIcons: Record<string, string> = {
      "Historical Sites": "business",
      "Urban Exploration": "map",
      "Cultural Venues": "color-palette",
      "Natural Settings": "leaf",
      "Religious Sites": "home",
      Museums: "easel",
      Parks: "leaf",
      Monuments: "business",
    };

    // Add icons to categories
    const categoriesWithIcons: TravelPreference[] = response.preferences?.categories
      ? response.preferences.categories.map((cat) => ({
          category: cat.category,
          percentage: cat.percentage,
          icon: categoryIcons[cat.category] || "navigate", // Default icon
        }))
      : DEFAULT_TRAVEL_PROFILE.preferences.categories;

    // Get badges and update progress
    const badges = await getAllUserBadges();

    // Update user stats for badge progress
    await updateUserStats(visitedPlaces);

    // Update badge progress
    await checkBadgeProgressUpdate();

    // Get updated badges after progress check
    const updatedBadges = await getAllUserBadges();

    // Define a set of colors for traveler traits
    const traitColors = [
      Colors.primary,
      Colors.secondary,
      AccentColors.accent1,
      AccentColors.accent2,
      AccentColors.accent3,
      "#FF7043", // Deep orange
      "#5C6BC0", // Indigo
      "#26A69A", // Teal
    ];

    // Process traveler traits with colors
    let processedTraits: TravelerTrait[] = [];
    if (response.travelerTraits && response.travelerTraits.length > 0) {
      console.log("Processing traveler traits from AI response");
      processedTraits = response.travelerTraits.map((trait, index) => ({
        ...trait,
        color: traitColors[index % traitColors.length], // Assign colors in rotation
      }));
      console.log(`Generated ${processedTraits.length} traveler traits from API`);
    } else {
      console.log("No traveler traits in API response, using defaults");
      processedTraits = generateDefaultTraits();
      console.log(`Using ${processedTraits.length} default traveler traits`);
    }

    // Process travel milestones
    const travelMilestones = response.travelMilestones || [];

    // Create the profile with safe fallbacks to default values
    const profile: TravelProfile = {
      type: response.type || DEFAULT_TRAVEL_PROFILE.type,
      level: response.level || DEFAULT_TRAVEL_PROFILE.level,
      description: response.description || DEFAULT_TRAVEL_PROFILE.description,
      streak: calculateStreak(visitedPlaces),
      visitFrequency: {
        weekdays:
          response.visitFrequency?.weekdays || DEFAULT_TRAVEL_PROFILE.visitFrequency.weekdays,
        timeOfDay:
          response.visitFrequency?.timeOfDay || DEFAULT_TRAVEL_PROFILE.visitFrequency.timeOfDay,
        season: response.visitFrequency?.season || DEFAULT_TRAVEL_PROFILE.visitFrequency.season,
      },
      visitation: {
        averageDuration:
          response.visitation?.averageDuration || DEFAULT_TRAVEL_PROFILE.visitation.averageDuration,
        averageDistance:
          response.visitation?.averageDistance || DEFAULT_TRAVEL_PROFILE.visitation.averageDistance,
        mostVisitedCity:
          response.visitation?.mostVisitedCity || DEFAULT_TRAVEL_PROFILE.visitation.mostVisitedCity,
      },
      patterns: response.patterns || DEFAULT_TRAVEL_PROFILE.patterns,
      preferences: {
        categories: categoriesWithIcons,
        architecturalStyles:
          response.preferences?.architecturalStyles ||
          DEFAULT_TRAVEL_PROFILE.preferences.architecturalStyles,
        activities:
          response.preferences?.activities || DEFAULT_TRAVEL_PROFILE.preferences.activities,
      },
      recentInsights: response.recentInsights || DEFAULT_TRAVEL_PROFILE.recentInsights,
      // Add new fields
      travelerTraits: processedTraits, // Always include traveler traits
      travelMilestones: travelMilestones.length > 0 ? travelMilestones : undefined,
      // Use the AI-provided firstVisitDate if available, otherwise use the calculated one
      firstVisitDate: response.firstVisitDate || calculatedFirstVisitDate,
      bestDayToExplore: response.bestDayToExplore,
      explorationScore: response.explorationScore,
      isGenerating: false,
    };

    // Save the profile to Firebase
    await saveProfileToFirebase(profile, visitedPlaces.length);

    return profile;
  } catch (error) {
    console.error("Error generating travel profile:", error);
    // Ensure the default profile has traveler traits and firstVisitDate
    const defaultProfile = {
      ...DEFAULT_TRAVEL_PROFILE,
      travelerTraits: generateDefaultTraits(),
      // If we have places data despite the error, use that for firstVisitDate
      ...(visitedPlaces.length > 0 && {
        firstVisitDate: visitedPlaces.sort((a, b) => {
          return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
        })[0].visitedAt,
      }),
    };
    return defaultProfile;
  }
};

/**
 * Update user stats based on visited places
 */
const updateUserStats = async (visitedPlaces: VisitedPlaceDetails[]): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update user stats: No authenticated user");
      return;
    }

    const userStatsRef = doc(db, "userStats", currentUser.uid);
    const userStatsDoc = await getDoc(userStatsRef);

    // Calculate basic stats
    const placesVisited = visitedPlaces.length;
    const streak = calculateStreak(visitedPlaces);

    // Calculate place categories
    const categoryVisits: Record<string, number> = {};
    visitedPlaces.forEach((place) => {
      if (place.types && place.types.length > 0) {
        place.types.forEach((type) => {
          categoryVisits[type] = (categoryVisits[type] || 0) + 1;
        });
      }
    });

    // Calculate average visits per week
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const visitsInLastWeek = visitedPlaces.filter((place) => {
      const visitDate = new Date(place.visitedAt);
      return visitDate >= oneWeekAgo && visitDate <= now;
    }).length;

    const avgVisitsPerWeek = visitsInLastWeek;

    // Calculate exploration score (simple formula, can be expanded)
    const explorationScore = Math.min(
      100,
      placesVisited * 2 + streak * 5 + Object.keys(categoryVisits).length * 3
    );

    // Get exploration level
    const explorationLevel =
      explorationScore < 20
        ? 1
        : explorationScore < 40
        ? 2
        : explorationScore < 60
        ? 3
        : explorationScore < 80
        ? 4
        : 5;

    // Create stats object
    const stats = {
      placesVisited,
      dayStreak: streak,
      categoryVisits,
      avgVisitsPerWeek,
      explorationScore,
      explorationLevel,
      lastUpdated: Timestamp.now(),
    };

    // Use setDoc with merge to update only specified fields
    await setDoc(userStatsRef, stats, { merge: true });

    console.log("User stats updated successfully");
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
};

/**
 * Calculate travel streak based on visited places data
 */
const calculateStreak = (visitedPlaces: VisitedPlaceDetails[]): number => {
  if (visitedPlaces.length === 0) return 0;

  // Sort visits by date (newest first)
  const sortedVisits = [...visitedPlaces].sort((a, b) => {
    const dateA = new Date(a.visitedAt);
    const dateB = new Date(b.visitedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Get the most recent visit
  const mostRecent = new Date(sortedVisits[0].visitedAt);

  // Check if most recent visit was within the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (mostRecent < oneWeekAgo) {
    return 0;
  }

  // Count consecutive days with visits
  let currentDate = new Date(mostRecent);
  let streak = 1;

  currentDate.setHours(0, 0, 0, 0);

  for (let i = 1; i < 30; i++) {
    currentDate.setDate(currentDate.getDate() - 1);

    const hasVisitOnDay = sortedVisits.some((visit) => {
      const visitDate = new Date(visit.visitedAt);
      visitDate.setHours(0, 0, 0, 0);
      return visitDate.getTime() === currentDate.getTime();
    });

    if (hasVisitOnDay) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Update badge progress based on user stats
 */
const updateBadgeProgress = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update badge progress: No authenticated user");
      return;
    }

    // Get user stats
    const userStatsRef = doc(db, "userStats", currentUser.uid);
    const userStatsDoc = await getDoc(userStatsRef);

    if (!userStatsDoc.exists()) {
      console.warn("User stats not found for badge progress update");
      return;
    }

    const userStats = userStatsDoc.data();

    // Get all badges for the user
    const badges = await getAllUserBadges();
    const completedBadges: TravelBadge[] = [];

    // Check each badge against the user stats
    for (const badge of badges) {
      // Skip already completed badges
      if (badge.completed) {
        continue;
      }

      let allRequirementsMet = true;
      let requirementsUpdated = false;

      // Update each requirement
      const updatedRequirements = badge.requirements.map((req) => {
        let current = req.current;

        // Update current progress based on user stats
        switch (req.type) {
          case "visitCount":
            current = userStats.placesVisited || 0;
            break;
          case "categoryVisit":
            if (req.category) {
              // Check category-specific counts
              const categoryVisits = userStats.categoryVisits || {};
              current = categoryVisits[req.category] || 0;
            }
            break;
          case "streak":
            current = userStats.dayStreak || 0;
            break;
          case "distance":
            current = userStats.distanceTraveled || 0;
            break;
          case "countries":
            current = userStats.countriesVisited?.length || 0;
            break;
          case "continents":
            current = userStats.continentsVisited?.length || 0;
            break;
          case "explorationscore":
            current = userStats.explorationScore || 0;
            break;
        }

        // Check if current value has changed
        if (current !== req.current) {
          requirementsUpdated = true;
        }

        // Check if requirement is met
        if (current < req.value) {
          allRequirementsMet = false;
        }

        return {
          ...req,
          current,
        };
      });

      // If badge is completed or requirements updated, update the badge
      if (allRequirementsMet || requirementsUpdated) {
        if (allRequirementsMet) {
          // Mark badge as completed
          await completeBadge(badge.id);

          // Add to completed badges array
          completedBadges.push({
            ...badge,
            completed: true,
            dateEarned: new Date(),
            requirements: updatedRequirements,
          });
        } else if (requirementsUpdated) {
          // Only update requirements
          await updateBadgeRequirements(badge.id, updatedRequirements);
        }
      }
    }

    // Update badge settings with the last check timestamp
    // Instead of updating the profile document, update the badge settings document
    const badgeSettingsRef = doc(db, "users", currentUser.uid, "settings", "badges");
    await setDoc(
      badgeSettingsRef,
      {
        lastBadgeCheck: Date.now(),
      },
      { merge: true }
    );

    // If any badges were completed, update achievementsEarned counter in userStats
    if (completedBadges.length > 0) {
      await updateDoc(userStatsRef, {
        achievementsEarned: increment(completedBadges.length),
      });

      console.log(
        `${completedBadges.length} badges completed:`,
        completedBadges.map((b) => b.name).join(", ")
      );
    }
  } catch (error) {
    console.error("Error updating badge progress:", error);
  }
};

/**
 * Check if badge progress should be updated (once a day)
 */
const checkBadgeProgressUpdate = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    // Instead of checking the profile document which might not exist yet,
    // we'll check the badge settings document
    const badgeSettingsRef = doc(db, "users", currentUser.uid, "settings", "badges");
    const badgeSettingsDoc = await getDoc(badgeSettingsRef);

    if (!badgeSettingsDoc.exists()) {
      // If badge settings don't exist, create them and trigger first badge progress check
      await setDoc(badgeSettingsRef, {
        lastBadgeCheck: Date.now(),
        badgesGenerated: 0,
      });

      // Run initial badge progress update
      console.log("First-time badge progress check");
      await updateBadgeProgress();
      return;
    }

    // Check when badges were last updated
    const badgeSettings = badgeSettingsDoc.data();
    const lastBadgeCheck = badgeSettings.lastBadgeCheck || 0;
    const now = Date.now();
    const timeSinceLastCheck = now - lastBadgeCheck;

    // Check if it's been more than 24 hours since the last check
    if (timeSinceLastCheck > 24 * 60 * 60 * 1000) {
      console.log("Updating badge progress (last check was more than 24 hours ago)");
      await updateBadgeProgress();
    }
  } catch (error) {
    console.error("Error checking badge progress update:", error);
  }
};

/**
 * Main function to get travel profile with visited places
 * Ensures the badges subcollection exists and checks Firebase first
 */
export const getTravelProfile = async (): Promise<{
  profile: TravelProfile;
  visitedPlaces: VisitedPlaceDetails[];
}> => {
  let visitedPlaces: VisitedPlaceDetails[] = [];

  try {
    // First fetch user's visited places
    visitedPlaces = await fetchUserVisitedPlaces();

    // Check if there are at least 2 valid places
    if (visitedPlaces.length < 2) {
      console.log(
        `Not enough places to generate a profile (need at least 2, found ${visitedPlaces.length})`
      );

      // Calculate first visit date if we have at least one place
      let firstVisitDate: string | undefined;
      if (visitedPlaces.length > 0) {
        const sortedPlaces = [...visitedPlaces].sort((a, b) => {
          return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
        });
        firstVisitDate = sortedPlaces[0].visitedAt;
      }

      return {
        profile: {
          ...DEFAULT_TRAVEL_PROFILE,
          type: "New Traveler",
          description: "Visit at least 2 places to generate your personalized travel profile.",
          firstVisitDate, // Include first visit date even for incomplete profiles
          isGenerating: false,
        },
        visitedPlaces: visitedPlaces,
      };
    }

    // Check Firebase for an existing profile
    const { profile: existingProfile, needsRefresh } = await getProfileFromFirebase();

    // If we have a valid profile in Firebase and it doesn't need refresh, use it
    if (existingProfile && !needsRefresh) {
      // Double-check that traveler traits exist
      if (!existingProfile.travelerTraits || existingProfile.travelerTraits.length === 0) {
        console.log("Missing traveler traits in valid profile, adding defaults");
        existingProfile.travelerTraits = generateDefaultTraits();

        // Save the updated traits to Firebase
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileDocRef = doc(db, "users", currentUser.uid, "travelProfiles", "current");
          await updateDoc(profileDocRef, {
            travelerTraits: existingProfile.travelerTraits,
          });
          console.log("Saved default traits to profile");
        }
      }

      // Ensure firstVisitDate exists
      if (!existingProfile.firstVisitDate && visitedPlaces.length > 0) {
        console.log("Missing firstVisitDate in valid profile, calculating and adding");
        // Find earliest visit date
        const sortedPlaces = [...visitedPlaces].sort((a, b) => {
          return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
        });

        existingProfile.firstVisitDate = sortedPlaces[0].visitedAt;

        // Save the updated firstVisitDate back to Firebase
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileDocRef = doc(db, "users", currentUser.uid, "travelProfiles", "current");
          await updateDoc(profileDocRef, {
            firstVisitDate: existingProfile.firstVisitDate,
          });
          console.log("Saved firstVisitDate to profile:", existingProfile.firstVisitDate);
        }
      }

      return { profile: existingProfile, visitedPlaces: visitedPlaces };
    }

    // Check if places count has changed significantly
    const shouldForceRefresh =
      existingProfile && ((existingProfile as any).placeCount || 0) !== visitedPlaces.length;

    if (shouldForceRefresh) {
      console.log("Place count changed, forcing profile regeneration");
    }

    // Generate a new profile
    if (needsRefresh || shouldForceRefresh || !existingProfile) {
      console.log("Generating new travel profile");
      const profile = await generateTravelProfile(visitedPlaces);

      // Final check: ensure traveler traits exist
      if (!profile.travelerTraits || profile.travelerTraits.length === 0) {
        console.log("Final check: Adding default traits to new profile");
        profile.travelerTraits = generateDefaultTraits();
      }

      // Final check: ensure firstVisitDate exists
      if (!profile.firstVisitDate && visitedPlaces.length > 0) {
        console.log("Final check: Adding missing firstVisitDate to new profile");
        const sortedPlaces = [...visitedPlaces].sort((a, b) => {
          return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
        });

        profile.firstVisitDate = sortedPlaces[0].visitedAt;

        // This will be saved when the entire profile is saved next time
        const currentUser = auth.currentUser;
        if (currentUser) {
          const profileDocRef = doc(db, "users", currentUser.uid, "travelProfiles", "current");
          await updateDoc(profileDocRef, {
            firstVisitDate: profile.firstVisitDate,
          });
          console.log("Saved firstVisitDate to new profile:", profile.firstVisitDate);
        }
      }

      return { profile, visitedPlaces: visitedPlaces };
    }

    // Ensure traits exist in the existing profile
    if (
      existingProfile &&
      (!existingProfile.travelerTraits || existingProfile.travelerTraits.length === 0)
    ) {
      existingProfile.travelerTraits = generateDefaultTraits();
    }

    // Ensure firstVisitDate exists in the existing profile
    if (existingProfile && !existingProfile.firstVisitDate && visitedPlaces.length > 0) {
      console.log("Adding missing firstVisitDate to existing profile");
      // Find earliest visit date
      const sortedPlaces = [...visitedPlaces].sort((a, b) => {
        return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
      });

      existingProfile.firstVisitDate = sortedPlaces[0].visitedAt;

      // Save the updated firstVisitDate back to Firebase
      const currentUser = auth.currentUser;
      if (currentUser) {
        const profileDocRef = doc(db, "users", currentUser.uid, "travelProfiles", "current");
        await updateDoc(profileDocRef, {
          firstVisitDate: existingProfile.firstVisitDate,
        });
        console.log("Saved firstVisitDate to existing profile:", existingProfile.firstVisitDate);
      }
    }

    return { profile: existingProfile!, visitedPlaces: visitedPlaces };
  } catch (error) {
    console.error("Error getting travel profile:", error);

    // Calculate firstVisitDate from visitedPlaces if available
    let firstVisitDate = undefined;
    try {
      if (error instanceof Error && visitedPlaces.length > 0) {
        const sortedPlaces = [...visitedPlaces].sort((a, b) => {
          return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
        });

        if (sortedPlaces.length > 0) {
          firstVisitDate = sortedPlaces[0].visitedAt;
          console.log("Calculated firstVisitDate in error handler:", firstVisitDate);
        }
      }
    } catch (innerError) {
      console.error("Error calculating firstVisitDate in error handler:", innerError);
    }

    // Make sure default profile has traveler traits and firstVisitDate if available
    const defaultProfile = {
      ...DEFAULT_TRAVEL_PROFILE,
      travelerTraits: generateDefaultTraits(),
      ...(firstVisitDate && { firstVisitDate }),
    };

    return {
      profile: defaultProfile,
      visitedPlaces: visitedPlaces,
    };
  }
};

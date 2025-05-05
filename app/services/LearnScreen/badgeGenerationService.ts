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
  Timestamp,
  DocumentReference,
} from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { TravelBadge, BadgeTask } from "../../types/LearnScreen/TravelProfileTypes";
import { VisitedPlaceDetails } from "../../types/MapTypes";
import { fetchUserVisitedPlaces } from "./travelProfileService";

interface GeminiGeneratedBadge {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
  requirementType?: string;
  requirementValue?: number;
  category?: string;
}

const VALID_ICONS = [
  "map",
  "compass",
  "ribbon",
  "trophy",
  "star",
  "medal",
  "earth",
  "globe",
  "business",
  "leaf",
  "footsteps",
  "walk",
  "camera",
  "time",
  "calendar",
  "easel",
  "book",
  "color-palette",
];

const VALID_REQUIREMENT_TYPES = [
  "visitCount",
  "categoryVisit",
  "streak",
  "distance",
  "countries",
  "continents",
  "explorationscore",
];

const BADGE_GENERATION_INTERVAL = 24 * 60 * 60 * 1000;
const BADGES_TO_GENERATE = 5;

/**
 * Check if new badges should be generated
 */
export const checkBadgeGeneration = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot check badge generation: No authenticated user");
      return false;
    }

    const badgeSettingsRef = doc(db, "users", currentUser.uid, "settings", "badges");
    const badgeSettingsDoc = await getDoc(badgeSettingsRef);

    if (!badgeSettingsDoc.exists()) {
      await setDoc(badgeSettingsRef, {
        lastGeneratedAt: Timestamp.now(),
        badgesGenerated: 0,
      });
      return true;
    }

    const settings = badgeSettingsDoc.data();
    const lastGeneratedAt = settings.lastGeneratedAt
      ? settings.lastGeneratedAt.toDate().getTime()
      : 0;
    const now = Date.now();
    if (now - lastGeneratedAt > BADGE_GENERATION_INTERVAL) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking badge generation:", error);
    return false;
  }
};

/**
 * Generate new badges using AI based on users travel patterns
 */
export const generateBadgesWithAI = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot generate badges: No authenticated user");
      return;
    }
    const visitedPlaces = await fetchUserVisitedPlaces();
    if (visitedPlaces.length === 0) {
      console.log("No visited places to generate badges from, using default values");
      await createDefaultBadges();
      return;
    }
    const badgesCollection = collection(db, "users", currentUser.uid, "badges");
    const badgesSnapshot = await getDocs(badgesCollection);
    const existingBadges = badgesSnapshot.docs.map((doc) => doc.data());
    const existingBadgeIds = new Set(existingBadges.map((badge) => badge.id));
    const existingBadgeNames = new Set(existingBadges.map((badge) => badge.name?.toLowerCase()));
    const placeTypes = new Set<string>();
    const cities = new Set<string>();
    const categories = new Map<string, number>();

    visitedPlaces.forEach((place) => {
      if (place.types && place.types.length > 0) {
        place.types.forEach((type) => placeTypes.add(type));
        place.types.forEach((type) => {
          categories.set(type, (categories.get(type) || 0) + 1);
        });
      }

      if (place.vicinity) {
        const city = place.vicinity.split(",").pop()?.trim() || "";
        if (city) cities.add(city);
      }
    });

    const prompt = `
      I need you to generate ${BADGES_TO_GENERATE} unique achievement badges for a travel app.
      These badges should be attainable goals based on the user's travel patterns.
      
      User has visited ${visitedPlaces.length} places, including:
      - Place types: ${Array.from(placeTypes).join(", ")}
      - Cities: ${Array.from(cities).join(", ")}
      
      Please create badges with varying difficulty levels. Don't make them too easy or too hard.
      For each badge, provide the following information in JSON format:
      
      [{
        "id": "unique-badge-id", // Use kebab-case (e.g., "mountain-climber")
        "name": "Badge Name", // Catchy, 2-3 words
        "description": "Short description of what the user must do to earn this badge",
        "icon": "one from this list only: map, compass, ribbon, trophy, star, medal, earth, globe, business, leaf, footsteps, walk, camera, time, calendar, easel, book, color-palette",
        "requirementType": "one of: visitCount, categoryVisit, streak, distance, countries, continents, explorationscore",
        "requirementValue": number, // The target value to achieve
        "category": "optional - only for categoryVisit type badges"
      }]
      
      Don't generate badges for requirements that are impossible based on the user's current travel patterns.
      Avoid creating duplicate badges. Each badge should feel attainable but challenging.
    `;

    let generatedBadges: GeminiGeneratedBadge[] = [];

    try {
      const response = await generateContent({ prompt, responseFormat: "json" });
      generatedBadges = Array.isArray(response) ? response : [];
      console.log("AI generated badges:", JSON.stringify(generatedBadges));
    } catch (aiError) {
      console.error("Error in AI badge generation:", aiError);
      await createDefaultBadges();
      return;
    }

    const validBadges = generatedBadges.filter((badge) => {
      if (
        !badge.id ||
        !badge.name ||
        !badge.description ||
        !badge.icon ||
        !badge.requirementType ||
        !badge.requirementValue
      ) {
        return false;
      }

      if (existingBadgeIds.has(badge.id)) {
        return false;
      }

      if (existingBadgeNames.has(badge.name.toLowerCase())) {
        return false;
      }

      if (!VALID_ICONS.includes(badge.icon)) {
        badge.icon = "ribbon";
      }
      if (!VALID_REQUIREMENT_TYPES.includes(badge.requirementType)) {
        return false;
      }
      if (typeof badge.requirementValue !== "number" || badge.requirementValue <= 0) {
        return false;
      }
      return true;
    });

    if (validBadges.length === 0) {
      console.log("No valid badges generated, falling back to defaults");
      await createDefaultBadges();
      return;
    }

    // Limit to required number of badges
    const badgesToCreate = validBadges.slice(0, BADGES_TO_GENERATE);
    const batch = writeBatch(db);
    for (const badge of badgesToCreate) {
      const badgeDoc = doc(badgesCollection, badge.id);
      const badgeData = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        completed: false,
        dateEarned: new Date(0).toISOString(),
        requirements: [
          {
            type: badge.requirementType,
            value: badge.requirementValue,
            current: 0,
            ...(badge.requirementType === "categoryVisit" && badge.category
              ? { category: badge.category }
              : {}),
          },
        ],
      };

      batch.set(badgeDoc, badgeData);
    }

    // Update badge generation settings
    const badgeSettingsRef = doc(db, "users", currentUser.uid, "settings", "badges");
    batch.set(
      badgeSettingsRef,
      {
        lastGeneratedAt: Timestamp.now(),
        badgesGenerated: badgesToCreate.length + existingBadges.length,
      },
      { merge: true }
    );

    await batch.commit();
    console.log(`${badgesToCreate.length} new badges generated and saved to Firestore`);
  } catch (error) {
    console.error("Error generating badges with AI:", error);
    await createDefaultBadges();
  }
};

/**
 * Create default badges when AI generation fails or no places visited
 */
const createDefaultBadges = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot create default badges: No authenticated user");
      return;
    }

    const badgesCollection = collection(db, "users", currentUser.uid, "badges");
    const badgesSnapshot = await getDocs(badgesCollection);
    const existingBadgeIds = new Set(badgesSnapshot.docs.map((doc) => doc.id));
    const defaultBadges = [
      {
        id: "first-visit",
        name: "First Visit",
        description: "Visit your first place",
        icon: "footsteps",
        requirementType: "visitCount",
        requirementValue: 1,
      },
      {
        id: "weekend-explorer",
        name: "Weekend Explorer",
        description: "Visit 3 places on weekends",
        icon: "calendar",
        requirementType: "visitCount",
        requirementValue: 3,
      },
      {
        id: "food-adventure",
        name: "Food Adventure",
        description: "Visit 2 restaurants or cafes",
        icon: "restaurant",
        requirementType: "categoryVisit",
        requirementValue: 2,
        category: "restaurant",
      },
      {
        id: "scenic-view",
        name: "Scenic View",
        description: "Visit a park or nature spot",
        icon: "leaf",
        requirementType: "categoryVisit",
        requirementValue: 1,
        category: "park",
      },
      {
        id: "city-wanderer",
        name: "City Wanderer",
        description: "Visit 5 different locations",
        icon: "map",
        requirementType: "visitCount",
        requirementValue: 5,
      },
    ];

    // Filter out badges that already exist
    const badgesToCreate = defaultBadges.filter((badge) => !existingBadgeIds.has(badge.id));

    if (badgesToCreate.length === 0) {
      console.log("No new default badges to create");
      return;
    }

    const batch = writeBatch(db);

    for (const badge of badgesToCreate) {
      const badgeDoc = doc(badgesCollection, badge.id);

      const badgeData = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        completed: false,
        dateEarned: new Date(0).toISOString(),
        requirements: [
          {
            type: badge.requirementType,
            value: badge.requirementValue,
            current: 0,
            ...(badge.category ? { category: badge.category } : {}),
          },
        ],
      };

      batch.set(badgeDoc, badgeData);
    }

    // Update badge generation settings
    const badgeSettingsRef = doc(db, "users", currentUser.uid, "settings", "badges");
    batch.set(
      badgeSettingsRef,
      {
        lastGeneratedAt: Timestamp.now(),
        badgesGenerated: badgesToCreate.length + badgesSnapshot.size,
      },
      { merge: true }
    );

    await batch.commit();
    console.log(`${badgesToCreate.length} default badges created and saved to Firestore`);
  } catch (error) {
    console.error("Error creating default badges:", error);
  }
};

/**
 * Initialize badge subcollection and generate first batch if needed
 */
export const initializeBadgeSubcollection = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot initialize badge subcollection: No authenticated user");
      return;
    }

    // Check if badge subcollection exists
    const badgesCollection = collection(db, "users", currentUser.uid, "badges");
    const badgesSnapshot = await getDocs(badgesCollection);

    if (badgesSnapshot.empty) {
      console.log("Badge subcollection doesn't exist, generating initial badges");
      await generateBadgesWithAI();
    } else {
      const shouldGenerate = await checkBadgeGeneration();
      if (shouldGenerate) {
        console.log("Time to generate new badges");
        await generateBadgesWithAI();
      }
    }
  } catch (error) {
    console.error("Error initializing badge subcollection:", error);
  }
};

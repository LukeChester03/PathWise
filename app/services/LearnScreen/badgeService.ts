import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { TravelBadge, BadgeTask } from "../../types/LearnScreen/TravelProfileTypes";

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
  "restaurant",
];

const DEFAULT_BADGES: {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  value: number;
  category?: string;
}[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "Visit your first place",
    icon: "footsteps",
    type: "visitCount",
    value: 1,
  },
  {
    id: "explorer-novice",
    name: "Explorer Novice",
    description: "Visit 5 different places",
    icon: "compass",
    type: "visitCount",
    value: 5,
  },
  {
    id: "museum-lover",
    name: "Museum Lover",
    description: "Visit 3 museums",
    icon: "easel",
    type: "categoryVisit",
    value: 3,
    category: "museum",
  },
  {
    id: "nature-enthusiast",
    name: "Nature Enthusiast",
    description: "Visit 5 parks or natural areas",
    icon: "leaf",
    type: "categoryVisit",
    value: 5,
    category: "park",
  },
  {
    id: "urban-wanderer",
    name: "Urban Wanderer",
    description: "Visit 10 city locations",
    icon: "business",
    type: "categoryVisit",
    value: 10,
    category: "point_of_interest",
  },
];

/**
 * Check if the badges subcollection exists for the current user
 */
export const checkBadgesSubcollection = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot check badges subcollection: No authenticated user");
      return false;
    }

    const badgesCollection = collection(db, "users", currentUser.uid, "badges");
    const badgesSnapshot = await getDocs(badgesCollection);

    return !badgesSnapshot.empty;
  } catch (error) {
    console.error("Error checking badges subcollection:", error);
    return false;
  }
};

/**
 * Create badges subcollection with default badges
 */
export const createBadgesSubcollection = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot create badges subcollection: No authenticated user");
      return false;
    }

    // Check if the subcollection already exists
    const exists = await checkBadgesSubcollection();
    if (exists) {
      console.log("Badges subcollection already exists");
      return true;
    }

    console.log("Creating badges subcollection with default badges");

    // Create the badges
    const batch = writeBatch(db);

    for (const badge of DEFAULT_BADGES) {
      const icon = VALID_ICONS.includes(badge.icon) ? badge.icon : "ribbon";

      // Create badge document
      const badgeDoc = doc(db, "users", currentUser.uid, "badges", badge.id);
      const badgeData = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: icon,
        completed: false,
        dateEarned: new Date(0).toISOString(),
        requirements: [
          {
            type: badge.type,
            value: badge.value,
            current: 0,
            ...(badge.category ? { category: badge.category } : {}),
          },
        ],
      };

      batch.set(badgeDoc, badgeData);
    }

    const settingsRef = doc(db, "users", currentUser.uid, "settings", "badges");
    batch.set(settingsRef, {
      lastGeneratedAt: Timestamp.now(),
      badgesGenerated: DEFAULT_BADGES.length,
    });

    await batch.commit();
    console.log("Successfully created badges subcollection");
    return true;
  } catch (error) {
    console.error("Error creating badges subcollection:", error);
    return false;
  }
};

/**
 * Map Firestore document to TravelBadge object
 */
export const mapDocToBadge = (doc: DocumentData): TravelBadge => {
  const data = doc.data();
  let dateEarned: Date;
  try {
    dateEarned = data.dateEarned ? new Date(data.dateEarned) : new Date(0);
  } catch (e) {
    dateEarned = new Date(0);
  }

  const requirements = Array.isArray(data.requirements)
    ? data.requirements.map((req) => ({
        type: req.type || "visitCount",
        value: req.value || 0,
        current: req.current || 0,
        ...(req.category ? { category: req.category } : {}),
      }))
    : [{ type: "visitCount", value: 1, current: 0 }];

  return {
    id: doc.id,
    name: data.name || "Unknown Badge",
    description: data.description || "No description",
    icon: VALID_ICONS.includes(data.icon) ? data.icon : "ribbon",
    dateEarned: dateEarned,
    completed: !!data.completed,
    requirements: requirements,
  };
};

/**
 * Get all badges for the current user
 * This creates the badges subcollection if it doesn't exist
 */
export const getAllUserBadges = async (): Promise<TravelBadge[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot get user badges: No authenticated user");
      return [];
    }
    const exists = await checkBadgesSubcollection();
    if (!exists) {
      const created = await createBadgesSubcollection();
      if (!created) {
        console.error("Failed to create badges subcollection");
        return [];
      }
    }

    const badgesCollection = collection(db, "users", currentUser.uid, "badges");
    const badgesSnapshot = await getDocs(badgesCollection);

    if (badgesSnapshot.empty) {
      console.warn("Badges subcollection is empty");
      return [];
    }

    // Map documents to badge objects
    const badges = badgesSnapshot.docs.map(mapDocToBadge);

    return badges.sort((a, b) => {
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      if (a.completed && b.completed) {
        return b.dateEarned.getTime() - a.dateEarned.getTime();
      }
      return a.id.localeCompare(b.id);
    });
  } catch (error) {
    console.error("Error getting user badges:", error);
    return [];
  }
};

/**
 * Update the requirements for a badge
 */
export const updateBadgeRequirements = async (
  badgeId: string,
  requirements: { type: string; value: number; current: number; category?: string }[]
): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update badge: No authenticated user");
      return false;
    }

    const badgeRef = doc(db, "users", currentUser.uid, "badges", badgeId);
    await setDoc(badgeRef, { requirements }, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error updating badge ${badgeId}:`, error);
    return false;
  }
};

/**
 * Mark a badge as completed
 */
export const completeBadge = async (badgeId: string): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot complete badge: No authenticated user");
      return false;
    }

    const badgeRef = doc(db, "users", currentUser.uid, "badges", badgeId);
    await setDoc(
      badgeRef,
      {
        completed: true,
        dateEarned: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error(`Error completing badge ${badgeId}:`, error);
    return false;
  }
};

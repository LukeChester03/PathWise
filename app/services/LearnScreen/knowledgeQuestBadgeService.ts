// services/LearnScreen/knowledgeQuestBadgeService.ts
import { getAllUserBadges, updateBadgeRequirements, completeBadge } from "./badgeService";
import { TravelBadge } from "../../types/LearnScreen/TravelProfileTypes";
import { auth, db } from "../../config/firebaseConfig";
import { getKnowledgeQuestStats } from "./knowledgeQuestService";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  Timestamp,
  DocumentReference,
  addDoc,
} from "firebase/firestore";

// Quiz-related badge types to check for
const QUIZ_BADGE_TYPES = ["quizCount", "quizStreak", "quizScore", "quizAccuracy", "quizCorrect"];

/**
 * Check and create quiz-related badges if they don't exist
 */
export const initializeQuizBadges = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot initialize quiz badges: No authenticated user");
      return;
    }

    // Get existing badges
    const badges = await getAllUserBadges();

    // Filter for quiz-related badges
    const quizBadges = badges.filter((badge) =>
      badge.requirements.some((req) => QUIZ_BADGE_TYPES.includes(req.type))
    );

    // If we already have quiz badges, no need to create them
    if (quizBadges.length >= 5) {
      console.log("Quiz badges already exist");
      return;
    }

    // Create default quiz badges
    await createDefaultQuizBadges();
  } catch (error) {
    console.error("Error initializing quiz badges:", error);
  }
};

/**
 * Create default quiz-related badges
 */
const createDefaultQuizBadges = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot create quiz badges: No authenticated user");
      return;
    }

    // Default quiz badges to create
    const quizBadges = [
      {
        id: "quiz-beginner",
        name: "Quiz Beginner",
        description: "Complete your first quiz",
        icon: "school",
        requirements: [
          {
            type: "quizCount",
            value: 1,
            current: 0,
          },
        ],
      },
      {
        id: "quiz-enthusiast",
        name: "Quiz Enthusiast",
        description: "Complete 5 quizzes",
        icon: "book",
        requirements: [
          {
            type: "quizCount",
            value: 5,
            current: 0,
          },
        ],
      },
      {
        id: "quiz-perfectionist",
        name: "Quiz Perfectionist",
        description: "Score 100% on any quiz",
        icon: "star",
        requirements: [
          {
            type: "quizScore",
            value: 100,
            current: 0,
          },
        ],
      },
      {
        id: "knowledge-seeker",
        name: "Knowledge Seeker",
        description: "Answer 50 questions correctly",
        icon: "ribbon",
        requirements: [
          {
            type: "quizCorrect",
            value: 50,
            current: 0,
          },
        ],
      },
      {
        id: "quiz-streak",
        name: "Quiz Streak",
        description: "Complete quizzes on 3 consecutive days",
        icon: "flame",
        requirements: [
          {
            type: "quizStreak",
            value: 3,
            current: 0,
          },
        ],
      },
      {
        id: "quiz-master",
        name: "Quiz Master",
        description: "Maintain 80% accuracy after at least 10 quizzes",
        icon: "trophy",
        requirements: [
          {
            type: "quizCount",
            value: 10,
            current: 0,
          },
          {
            type: "quizAccuracy",
            value: 80,
            current: 0,
          },
        ],
      },
    ];

    // Get existing badges to avoid duplicates
    const existingBadges = await getAllUserBadges();
    const existingBadgeIds = new Set(existingBadges.map((badge) => badge.id));

    // Filter out badges that already exist
    const badgesToCreate = quizBadges.filter((badge) => !existingBadgeIds.has(badge.id));

    if (badgesToCreate.length === 0) {
      console.log("No new quiz badges to create");
      return;
    }

    // Create badges using a batch
    const batch = writeBatch(db);
    const badgesCollection = collection(db, "users", currentUser.uid, "badges");

    for (const badge of badgesToCreate) {
      const badgeRef = doc(badgesCollection, badge.id);

      batch.set(badgeRef, {
        ...badge,
        completed: false,
        dateEarned: new Date(0).toISOString(),
      });
    }

    await batch.commit();
    console.log(`Created ${badgesToCreate.length} quiz badges`);
  } catch (error) {
    console.error("Error creating default quiz badges:", error);
  }
};

/**
 * Update quiz badge progress based on Knowledge Quest stats
 * FIXED: Better error handling and logging
 */
export const updateQuizBadgeProgress = async (): Promise<string[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update quiz badges: No authenticated user");
      return [];
    }

    // Get stats and badges
    const stats = await getKnowledgeQuestStats();
    const badges = await getAllUserBadges();

    console.log("Updating quiz badge progress with current stats");

    // Filter for quiz-related badges that aren't completed
    const quizBadges = badges.filter(
      (badge) =>
        !badge.completed && badge.requirements.some((req) => QUIZ_BADGE_TYPES.includes(req.type))
    );

    if (quizBadges.length === 0) {
      console.log("No incomplete quiz badges found to update");
      return [];
    }

    const completedBadgeIds: string[] = [];

    for (const badge of quizBadges) {
      let allRequirementsMet = true;
      let requirementsUpdated = false;

      const updatedRequirements = badge.requirements.map((req) => {
        let current = req.current;

        switch (req.type) {
          case "quizCount":
            current = stats.totalQuizzesTaken;
            break;

          case "quizStreak":
            current = stats.streakDays;
            break;

          case "quizScore":
            // This would be updated when a quiz is completed
            // We leave it as-is for now since it's updated elsewhere
            break;

          case "quizAccuracy":
            current = stats.accuracy;
            break;

          case "quizCorrect":
            current = stats.totalCorrectAnswers;
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

      // Update badge requirements if needed
      if (requirementsUpdated) {
        try {
          await updateBadgeRequirements(badge.id, updatedRequirements);
          console.log(`Updated requirements for badge: ${badge.name}`);
        } catch (updateError) {
          console.error(`Error updating requirements for badge ${badge.id}:`, updateError);
          // Continue with other badges even if one fails
          continue;
        }
      }

      // Complete the badge if all requirements are met
      if (allRequirementsMet) {
        try {
          await completeBadge(badge.id);
          completedBadgeIds.push(badge.id);
          console.log(`Badge completed: ${badge.name}`);
        } catch (completeError) {
          console.error(`Error completing badge ${badge.id}:`, completeError);
          // Continue with other badges even if one fails to complete
        }
      }
    }

    return completedBadgeIds;
  } catch (error) {
    console.error("Error updating quiz badge progress:", error);
    return [];
  }
};

/**
 * Check if a new high score should update a badge
 * FIXED: Better error handling and validation
 */
export const checkScoreBadges = async (score: number): Promise<string[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot check score badges: No authenticated user");
      return [];
    }

    // Validate score is a positive number
    if (typeof score !== "number" || score < 0 || score > 100) {
      console.warn(`Invalid score value: ${score}. Must be between 0 and 100.`);
      return [];
    }

    console.log(`Checking score badges for new score: ${score}%`);

    const badges = await getAllUserBadges();

    // Filter for quiz score badges that aren't completed
    const scoreBadges = badges.filter(
      (badge) => !badge.completed && badge.requirements.some((req) => req.type === "quizScore")
    );

    if (scoreBadges.length === 0) {
      console.log("No incomplete score badges found");
      return [];
    }

    console.log(`Found ${scoreBadges.length} score badges to check`);
    const completedBadgeIds: string[] = [];

    for (const badge of scoreBadges) {
      let allRequirementsMet = true;
      let requirementsUpdated = false;

      const updatedRequirements = badge.requirements.map((req) => {
        let current = req.current;

        if (req.type === "quizScore") {
          // Update the highest score if this one is better
          current = Math.max(current, score);

          // Check if requirement is met
          if (current < req.value) {
            allRequirementsMet = false;
          }

          // Check if value has changed
          if (current !== req.current) {
            requirementsUpdated = true;
          }
        } else {
          // For other requirement types, just check if they're met
          if (req.current < req.value) {
            allRequirementsMet = false;
          }
        }

        return {
          ...req,
          current,
        };
      });

      // Update badge requirements if needed
      if (requirementsUpdated) {
        try {
          await updateBadgeRequirements(badge.id, updatedRequirements);
          console.log(`Updated requirements for score badge: ${badge.name}`);
        } catch (updateError) {
          console.error(`Error updating requirements for badge ${badge.id}:`, updateError);
          // Continue with other badges even if one fails
          continue;
        }
      }

      // Complete the badge if all requirements are met
      if (allRequirementsMet) {
        try {
          await completeBadge(badge.id);
          completedBadgeIds.push(badge.id);
          console.log(`Score badge completed: ${badge.name}`);
        } catch (completeError) {
          console.error(`Error completing badge ${badge.id}:`, completeError);
          // Continue with other badges even if one fails to complete
        }
      }
    }

    return completedBadgeIds;
  } catch (error) {
    console.error("Error checking score badges:", error);
    return [];
  }
};

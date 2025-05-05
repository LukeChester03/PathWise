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
    const badges = await getAllUserBadges();
    const quizBadges = badges.filter((badge) =>
      badge.requirements.some((req) => QUIZ_BADGE_TYPES.includes(req.type))
    );
    if (quizBadges.length >= 5) {
      console.log("Quiz badges already exist");
      return;
    }
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

    const existingBadges = await getAllUserBadges();
    const existingBadgeIds = new Set(existingBadges.map((badge) => badge.id));
    const badgesToCreate = quizBadges.filter((badge) => !existingBadgeIds.has(badge.id));

    if (badgesToCreate.length === 0) {
      console.log("No new quiz badges to create");
      return;
    }
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
 */
export const updateQuizBadgeProgress = async (): Promise<string[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot update quiz badges: No authenticated user");
      return [];
    }
    const stats = await getKnowledgeQuestStats();
    const badges = await getAllUserBadges();

    console.log("Updating quiz badge progress with current stats");
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
            break;

          case "quizAccuracy":
            current = stats.accuracy;
            break;

          case "quizCorrect":
            current = stats.totalCorrectAnswers;
            break;
        }
        if (current < req.value) {
          allRequirementsMet = false;
        }
        if (current !== req.current) {
          requirementsUpdated = true;
        }

        return {
          ...req,
          current,
        };
      });

      if (requirementsUpdated) {
        try {
          await updateBadgeRequirements(badge.id, updatedRequirements);
          console.log(`Updated requirements for badge: ${badge.name}`);
        } catch (updateError) {
          console.error(`Error updating requirements for badge ${badge.id}:`, updateError);
          continue;
        }
      }
      if (allRequirementsMet) {
        try {
          await completeBadge(badge.id);
          completedBadgeIds.push(badge.id);
          console.log(`Badge completed: ${badge.name}`);
        } catch (completeError) {
          console.error(`Error completing badge ${badge.id}:`, completeError);
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
 */
export const checkScoreBadges = async (score: number): Promise<string[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("Cannot check score badges: No authenticated user");
      return [];
    }
    if (typeof score !== "number" || score < 0 || score > 100) {
      console.warn(`Invalid score value: ${score}. Must be between 0 and 100.`);
      return [];
    }

    console.log(`Checking score badges for new score: ${score}%`);

    const badges = await getAllUserBadges();
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
          current = Math.max(current, score);
          if (current < req.value) {
            allRequirementsMet = false;
          }
          if (current !== req.current) {
            requirementsUpdated = true;
          }
        } else {
          if (req.current < req.value) {
            allRequirementsMet = false;
          }
        }

        return {
          ...req,
          current,
        };
      });

      if (requirementsUpdated) {
        try {
          await updateBadgeRequirements(badge.id, updatedRequirements);
          console.log(`Updated requirements for score badge: ${badge.name}`);
        } catch (updateError) {
          console.error(`Error updating requirements for badge ${badge.id}:`, updateError);
          continue;
        }
      }

      if (allRequirementsMet) {
        try {
          await completeBadge(badge.id);
          completedBadgeIds.push(badge.id);
          console.log(`Score badge completed: ${badge.name}`);
        } catch (completeError) {
          console.error(`Error completing badge ${badge.id}:`, completeError);
        }
      }
    }

    return completedBadgeIds;
  } catch (error) {
    console.error("Error checking score badges:", error);
    return [];
  }
};

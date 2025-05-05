import { awardXP, XP_VALUES } from "./xpService";
import { Quiz, QuizResult } from "../../types/LearnScreen/KnowledgeQuestTypes";

const QUIZ_XP_VALUES = {
  COMPLETE_QUIZ: 10,
  DIFFICULTY_EASY: 1,
  DIFFICULTY_MEDIUM: 1.5,
  DIFFICULTY_HARD: 2,
  PERFECT_SCORE: 30,
  HIGH_SCORE: 20,
  MEDIUM_SCORE: 10,
  FAST_COMPLETION: 15,
  MEDIUM_COMPLETION: 8,
  FIRST_CATEGORY: 5,
  MILESTONE_5_QUIZZES: 25,
  MILESTONE_10_QUIZZES: 50,
  MILESTONE_25_QUIZZES: 100,
  MILESTONE_50_QUIZZES: 250,
  DAILY_STREAK: 5,
  STREAK_MILESTONE_3: 15,
  STREAK_MILESTONE_7: 35,
  STREAK_MILESTONE_30: 100,
};

export const awardQuizCompletionXP = async (
  quiz: Quiz,
  result: QuizResult,
  quizzesTaken: number,
  isFirstCategory: boolean = false,
  streakDays: number = 0
): Promise<{ totalXP: number; breakdown: { reason: string; amount: number }[] }> => {
  try {
    const xpBreakdown: { reason: string; amount: number }[] = [];
    let totalXP = 0;

    // Base XP for completing a quiz
    const baseXP = QUIZ_XP_VALUES.COMPLETE_QUIZ;
    xpBreakdown.push({ reason: "Quiz completion", amount: baseXP });
    totalXP += baseXP;

    // Difficulty multiplier
    let difficultyMultiplier = QUIZ_XP_VALUES.DIFFICULTY_EASY;
    if (quiz.difficulty === "medium") {
      difficultyMultiplier = QUIZ_XP_VALUES.DIFFICULTY_MEDIUM;
    } else if (quiz.difficulty === "hard") {
      difficultyMultiplier = QUIZ_XP_VALUES.DIFFICULTY_HARD;
    }

    // Performance bonus
    let performanceBonus = 0;
    if (result.score === 100) {
      performanceBonus = QUIZ_XP_VALUES.PERFECT_SCORE;
      xpBreakdown.push({ reason: "Perfect score!", amount: performanceBonus });
    } else if (result.score >= 80) {
      performanceBonus = QUIZ_XP_VALUES.HIGH_SCORE;
      xpBreakdown.push({ reason: "High score (80%+)", amount: performanceBonus });
    } else if (result.score >= 60) {
      performanceBonus = QUIZ_XP_VALUES.MEDIUM_SCORE;
      xpBreakdown.push({ reason: "Good score (60%+)", amount: performanceBonus });
    }
    totalXP += performanceBonus;

    // Speed bonus (average time per question in milliseconds)
    const avgTimePerQuestion = result.timeSpent / result.totalQuestions;
    let speedBonus = 0;

    if (avgTimePerQuestion < 5000 && result.score >= 70) {
      speedBonus = QUIZ_XP_VALUES.FAST_COMPLETION;
      xpBreakdown.push({ reason: "Quick completion", amount: speedBonus });
    } else if (avgTimePerQuestion < 10000 && result.score >= 60) {
      speedBonus = QUIZ_XP_VALUES.MEDIUM_COMPLETION;
      xpBreakdown.push({ reason: "Efficient completion", amount: speedBonus });
    }
    totalXP += speedBonus;
    if (isFirstCategory) {
      const categoryBonus = QUIZ_XP_VALUES.FIRST_CATEGORY;
      xpBreakdown.push({ reason: `First ${quiz.category} quiz`, amount: categoryBonus });
      totalXP += categoryBonus;
    }

    // Milestone bonuses
    if (quizzesTaken === 5) {
      const milestoneBonus = QUIZ_XP_VALUES.MILESTONE_5_QUIZZES;
      xpBreakdown.push({ reason: "5 quizzes milestone", amount: milestoneBonus });
      totalXP += milestoneBonus;
    } else if (quizzesTaken === 10) {
      const milestoneBonus = QUIZ_XP_VALUES.MILESTONE_10_QUIZZES;
      xpBreakdown.push({ reason: "10 quizzes milestone", amount: milestoneBonus });
      totalXP += milestoneBonus;
    } else if (quizzesTaken === 25) {
      const milestoneBonus = QUIZ_XP_VALUES.MILESTONE_25_QUIZZES;
      xpBreakdown.push({ reason: "25 quizzes milestone", amount: milestoneBonus });
      totalXP += milestoneBonus;
    } else if (quizzesTaken === 50) {
      const milestoneBonus = QUIZ_XP_VALUES.MILESTONE_50_QUIZZES;
      xpBreakdown.push({ reason: "50 quizzes milestone", amount: milestoneBonus });
      totalXP += milestoneBonus;
    }

    // Streak bonuses
    if (streakDays > 0) {
      const streakBonus = QUIZ_XP_VALUES.DAILY_STREAK;
      xpBreakdown.push({ reason: `Day ${streakDays} streak`, amount: streakBonus });
      totalXP += streakBonus;

      // Streak milestones
      if (streakDays === 3) {
        const streakMilestoneBonus = QUIZ_XP_VALUES.STREAK_MILESTONE_3;
        xpBreakdown.push({ reason: "3-day streak milestone", amount: streakMilestoneBonus });
        totalXP += streakMilestoneBonus;
      } else if (streakDays === 7) {
        const streakMilestoneBonus = QUIZ_XP_VALUES.STREAK_MILESTONE_7;
        xpBreakdown.push({ reason: "7-day streak milestone", amount: streakMilestoneBonus });
        totalXP += streakMilestoneBonus;
      } else if (streakDays === 30) {
        const streakMilestoneBonus = QUIZ_XP_VALUES.STREAK_MILESTONE_30;
        xpBreakdown.push({ reason: "30-day streak milestone", amount: streakMilestoneBonus });
        totalXP += streakMilestoneBonus;
      }
    }

    // Apply difficulty multiplier to total
    const finalXP = Math.round(totalXP * difficultyMultiplier);

    if (difficultyMultiplier > 1) {
      xpBreakdown.push({
        reason: `${quiz.difficulty} difficulty (${difficultyMultiplier}x multiplier)`,
        amount: finalXP - totalXP,
      });
    }

    await awardXP(finalXP, `Completed ${quiz.title} quiz (${result.score}%)`);

    return {
      totalXP: finalXP,
      breakdown: xpBreakdown,
    };
  } catch (error) {
    console.error("Error awarding quiz XP:", error);
    return { totalXP: 0, breakdown: [] };
  }
};

export const awardBadgeCompletionXP = async (badgeName: string): Promise<number> => {
  const xpAmount = 25;
  try {
    await awardXP(xpAmount, `Earned "${badgeName}" badge`);
    return xpAmount;
  } catch (error) {
    console.error("Error awarding badge XP:", error);
    return 0;
  }
};

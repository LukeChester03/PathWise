// types/LearnScreen/KnowledgeQuestTypes.ts
import { Timestamp } from "firebase/firestore";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  relatedPlace?: string;
  relatedRegion?: string;
  image?: {
    uri: string;
  };
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  difficulty: "easy" | "medium" | "hard";
  category: "history" | "culture" | "geography" | "art" | "food" | "general";
  relatedRegions: string[];
  createdAt: string;
  expiresAt: string; // When to refresh from AI
  completions: number; // Number of times user has taken this quiz
  lastCompletedAt?: string;
}

export interface QuizSession {
  id: string;
  quizId: string;
  startedAt: string;
  completedAt?: string;
  answers: {
    questionId: string;
    selectedAnswerIndex: number;
    isCorrect: boolean;
    timeSpent: number; // in milliseconds
  }[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSpent: number; // in milliseconds
}

export interface QuizResult {
  id: string;
  quizId: string;
  title: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number; // in milliseconds
  difficulty: "easy" | "medium" | "hard";
  category: "history" | "culture" | "geography" | "art" | "food" | "general";
}

export interface KnowledgeQuestStats {
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  streakDays: number; // consecutive days with at least one quiz
  lastQuizDate: string;
  accuracy: number; // percentage
  averageTimePerQuestion: number; // in milliseconds
  quizzesByCategory: Record<string, number>;
  quizzesByDifficulty: Record<string, number>;
  favoriteCategory?: string;
  masteredRegions: string[]; // regions with >90% accuracy
  badges: string[]; // IDs of badges earned through quizzes
  level: number; // knowledge level based on performance
  pointsToNextLevel: number;
  totalPoints: number;
}

export interface KnowledgeQuestSettings {
  lastRefreshedAt: number; // timestamp when quizzes were last refreshed
  preferredDifficulty?: "easy" | "medium" | "hard";
  preferredCategories?: string[];
  dailyReminderTime?: string; // time of day for reminders
  dailyReminderEnabled?: boolean;
  dailyGoal?: number; // number of quizzes to complete per day
  cacheExpiryDays: number; // days until cache expires (default 30)
}

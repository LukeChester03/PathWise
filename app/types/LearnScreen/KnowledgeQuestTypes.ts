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
  expiresAt: string;
  completions: number;
  regionType?: string;
  metadata?: {
    disambiguated?: boolean;
    originalRegion?: string;
    clarifiedRegion?: string;
    regionType?: string;
    country?: string;
  };
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
    timeSpent: number;
  }[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  totalTimeSpent: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  title: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completedAt: string;
  timeSpent: number;
  difficulty: "easy" | "medium" | "hard";
  category: "history" | "culture" | "geography" | "art" | "food" | "general";
}

export interface KnowledgeQuestStats {
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  streakDays: number;
  lastQuizDate: string;
  accuracy: number;
  averageTimePerQuestion: number;
  quizzesByCategory: Record<string, number>;
  quizzesByDifficulty: Record<string, number>;
  favoriteCategory?: string;
  masteredRegions: string[];
  badges: string[];
  level: number;
  pointsToNextLevel: number;
  totalPoints: number;
}

export interface KnowledgeQuestSettings {
  lastRefreshedAt: number;
  preferredDifficulty?: "easy" | "medium" | "hard";
  preferredCategories?: string[];
  dailyReminderTime?: string;
  dailyReminderEnabled?: boolean;
  dailyGoal?: number;
  cacheExpiryDays: number;
}

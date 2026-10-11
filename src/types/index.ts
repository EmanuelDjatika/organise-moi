export type Priority = 'low' | 'medium' | 'high';
export type Horizon = 'today' | 'todo' | 'life';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  createdAt?: number;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  horizon?: Horizon; // 'today' (Journée) | 'todo' (À faire) | 'life' (Tâches de vie)
  scheduledDate?: string; // 'YYYY-MM-DD' for specific day of the week
  completed: boolean;
  cancelled?: boolean; // Tâche annulée
  priority: Priority;
  estimatedTime?: string;
  dueDate?: string;
  notes?: string;
  createdAt: number;
  todayOrder?: number;
  suggestedTimeSlot?: string;
  todayPhase?: TodaySchedulePhase | string;
  todayRationale?: string;
  isFrog?: boolean;
  subtasks?: SubTask[];
}

export interface Category {
  id: string;
  name: string;
  color: string; // e.g., '#1d4ed8'
  bgColor: string; // e.g., '#eff6ff'
  borderColor: string; // e.g., '#bfdbfe'
}

export interface GroqSettings {
  apiKey: string;
  model: string;
  customPromptExtra?: string;
}

export interface CategorizeResult {
  tasks: Array<{
    title: string;
    categoryName: string;
    horizon?: Horizon;
    priority: Priority;
    estimatedTime?: string;
    dueDate?: string;
    notes?: string;
  }>;
  aiTip?: string;
}

export type ViewMode = 'board' | 'week' | 'today' | 'todo' | 'matrix' | 'mindmap';

export interface AIThoughtAnalysis {
  themeTag?: string;
  summary: string;
  clarityInsights: string[];
  actionableSteps: string[];
  extractedTasks?: Array<{
    title: string;
    categoryName: string;
    horizon?: Horizon;
  }>;
  reflectionQuestion: string;
  encouragement: string;
}

export interface ThoughtEntry {
  id: string;
  content: string;
  tag?: string;
  createdAt: number;
  analysis?: AIThoughtAnalysis;
}

export type AppPage = 'board' | 'thoughts' | 'brainstorm' | 'fitness';

export type ExerciseCategory = 'cardio' | 'upper_body' | 'abs_core' | 'lower_body' | 'mobility';
export type ExerciseUnit = 'reps' | 'seconds';
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description: string;
  tips: string[];
  muscles: string[];
  difficulty: ExerciseDifficulty;
  defaultUnit: ExerciseUnit;
  defaultCount: number;
  presetCounts: number[];
  caloriesPerUnitApprox: number;
  illustrationKey: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  exerciseId: string;
  targetCount: number;
  unit: ExerciseUnit;
  badgeLabel: string;
  difficulty: ExerciseDifficulty;
  points: number;
}

export interface FitnessActivityLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  count: number;
  unit: ExerciseUnit;
  completedAt: number;
}

export interface FitnessState {
  completedChallengeIds: string[];
  challengeProgress: Record<string, number>;
  lastChallengeDate: string;
  streak: number;
  lastActiveDate: string;
  activityLogs: FitnessActivityLog[];
}

export type BrainstormMode =
  | 'structure' // Structurer un projet complet (Vision, Piliers, Jalons, Actions)
  | 'ideation' // Explorer des idées, angles innovants et opportunités
  | 'roadmap' // Définir les directions et ordonnancer la feuille de route
  | 'action_plan'; // Découper rapidement en tâches actionnables

export interface BrainstormPillar {
  id: string;
  title: string;
  description: string;
  keyPoints: string[];
}

export interface BrainstormMilestone {
  id: string;
  phase: string;
  timeline?: string;
  objectives: string[];
}

export interface BrainstormAction {
  id: string;
  title: string;
  categoryName?: string;
  horizon?: Horizon;
  priority?: Priority;
  estimatedTime?: string;
  rationale?: string;
}

export interface BrainstormAnalysis {
  projectTitle: string;
  tagline: string;
  vision: string;
  strategicDirections: string[];
  pillars: BrainstormPillar[];
  milestones: BrainstormMilestone[];
  immediateActions: BrainstormAction[];
  keyRisksOrConsiderations: string[];
  suggestedNextSteps: string[];
}

export interface BrainstormMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: BrainstormMode;
  analysis?: BrainstormAnalysis;
}

export interface BrainstormSession {
  id: string;
  title: string;
  topic?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
  messages: BrainstormMessage[];
  lastAnalysis?: BrainstormAnalysis;
}

export type TodaySchedulePhase =
  | 'morning_frog'
  | 'morning_focus'
  | 'afternoon_low'
  | 'afternoon_peak'
  | 'evening_wrap';

export interface OptimizedScheduleTask {
  taskId: string;
  taskTitle: string;
  order: number;
  phase: TodaySchedulePhase;
  phaseLabel: string;
  suggestedTimeSlot: string; // e.g., "09:00 - 10:30"
  energyLevel: 'high' | 'medium' | 'low';
  rationale: string;
  isFrog?: boolean;
}

export interface TodayOptimizationResult {
  scheduleSummary: string;
  frogTaskTitle?: string;
  frogRationale?: string;
  energyAdvice: string;
  orderedTasks: OptimizedScheduleTask[];
}



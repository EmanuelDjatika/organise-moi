import type { Task } from '../types';

/**
 * Parse a human duration string (e.g. "30 min", "1h30", "2h", "45m") into minutes.
 */
export function parseEstimatedMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const str = timeStr.trim().toLowerCase();

  // Format "1h30", "1h 30m", "1h30min", "2h15"
  const hMinMatch = str.match(/^(\d+(?:\.\d+)?)\s*h(?:eures?|rs?)?\s*(\d+)?(?:\s*m(?:in)?)?$/i);
  if (hMinMatch) {
    const hours = parseFloat(hMinMatch[1]);
    const mins = hMinMatch[2] ? parseInt(hMinMatch[2], 10) : 0;
    return Math.round(hours * 60 + mins);
  }

  // Format "1.5h", "2h", "0.5 h"
  const hoursOnlyMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:h|heures?|hrs?)$/i);
  if (hoursOnlyMatch) {
    return Math.round(parseFloat(hoursOnlyMatch[1]) * 60);
  }

  // Format "30 min", "45m", "15 minutes", "20"
  const minsMatch = str.match(/^(\d+)(?:\s*(?:min|mins|minutes?|m))?$/i);
  if (minsMatch) {
    return parseInt(minsMatch[1], 10);
  }

  return null;
}

/**
 * Calculate the weighted effort value of a task based on:
 * 1. Estimated duration (or standard baseline duration)
 * 2. Priority multiplier (High = 1.6x, Medium = 1.0x, Low = 0.7x)
 * 3. Frog task bonus (1.4x for the top daily frog task)
 */
export function getTaskWeight(task: Partial<Task>): number {
  const parsedMins = parseEstimatedMinutes(task.estimatedTime);
  let baseMinutes = 30;

  if (parsedMins && parsedMins > 0) {
    // Clamped between 10 minutes and 240 minutes (4h)
    baseMinutes = Math.min(Math.max(parsedMins, 10), 240);
  } else {
    // Baseline duration based on priority if not specified
    if (task.priority === 'high') baseMinutes = 45;
    else if (task.priority === 'medium') baseMinutes = 30;
    else baseMinutes = 20;
  }

  // Priority coefficient
  let priorityMultiplier = 1.0;
  if (task.priority === 'high') {
    priorityMultiplier = 1.6;
  } else if (task.priority === 'medium') {
    priorityMultiplier = 1.0;
  } else if (task.priority === 'low') {
    priorityMultiplier = 0.7;
  }

  // Frog multiplier (high cognitive impact task)
  const frogMultiplier = task.isFrog ? 1.4 : 1.0;

  const rawWeight = Math.round(baseMinutes * priorityMultiplier * frogMultiplier);
  return Math.max(rawWeight, 10);
}

export interface TodayEvolutionStats {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  totalWeight: number;
  completedWeight: number;
  remainingWeight: number;
  progressPercent: number; // Weighted completion percentage (0-100)
  countPercent: number; // Raw item count percentage (0-100)
  hasFrog: boolean;
  frogCompleted: boolean;
}

/**
 * Compute full weighted evolution statistics for a set of day tasks.
 */
export function calculateTodayEvolutionStats(todayTasks: Task[]): TodayEvolutionStats {
  const validTasks = todayTasks.filter((t) => !t.cancelled);

  if (validTasks.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      remainingTasks: 0,
      totalWeight: 0,
      completedWeight: 0,
      remainingWeight: 0,
      progressPercent: 0,
      countPercent: 0,
      hasFrog: false,
      frogCompleted: false,
    };
  }

  const completedList = validTasks.filter((t) => t.completed);
  const remainingList = validTasks.filter((t) => !t.completed);

  const totalWeight = validTasks.reduce((acc, t) => acc + getTaskWeight(t), 0);
  const completedWeight = completedList.reduce((acc, t) => acc + getTaskWeight(t), 0);
  const remainingWeight = totalWeight - completedWeight;

  const progressPercent = totalWeight > 0 ? Math.min(100, Math.round((completedWeight / totalWeight) * 100)) : 0;
  const countPercent = validTasks.length > 0 ? Math.min(100, Math.round((completedList.length / validTasks.length) * 100)) : 0;

  const frogTask = validTasks.find((t) => t.isFrog);

  return {
    totalTasks: validTasks.length,
    completedTasks: completedList.length,
    remainingTasks: remainingList.length,
    totalWeight,
    completedWeight,
    remainingWeight,
    progressPercent,
    countPercent,
    hasFrog: Boolean(frogTask),
    frogCompleted: Boolean(frogTask?.completed),
  };
}

/**
 * Sorts tasks so that:
 * 1. Cancelled tasks are placed at the bottom
 * 2. Completed tasks are placed at the top (before remaining tasks)
 * 3. Daily AI order is respected if in today mode
 * 4. Most recent creation date as tie-breaker
 */
export function sortTasksWithCompletedFirst(
  tasks: Task[],
  isTodayMode: boolean = false
): Task[] {
  return [...tasks].sort((a, b) => {
    // 1. Cancelled tasks at the bottom
    if (a.cancelled && !b.cancelled) return 1;
    if (!a.cancelled && b.cancelled) return -1;

    // 2. Completed tasks before remaining tasks
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;

    // 3. Today AI order
    if (isTodayMode) {
      const orderA = typeof a.todayOrder === 'number' ? a.todayOrder : 9999;
      const orderB = typeof b.todayOrder === 'number' ? b.todayOrder : 9999;
      if (orderA !== orderB) return orderA - orderB;
    }

    // 4. Creation date fallback
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}


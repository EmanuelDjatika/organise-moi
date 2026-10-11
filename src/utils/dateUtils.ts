export interface WeekDayInfo {
  dateStr: string; // 'YYYY-MM-DD'
  dayName: string; // 'Lundi', 'Mardi', etc.
  dayShort: string; // 'Lun', 'Mar', etc.
  dayNumber: number; // 5, 6, 7
  monthShort: string; // 'oct.'
  isToday: boolean;
  isPast: boolean;
}

/**
 * Returns the current date in 'YYYY-MM-DD' local format
 */
export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object to 'YYYY-MM-DD'
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the 7 days of the current week (Monday to Sunday)
 */
export function getCurrentWeekDays(baseDate: Date = new Date()): WeekDayInfo[] {
  const todayStr = getTodayDateStr();
  const current = new Date(baseDate);
  
  // Day of week: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayOfWeek = current.getDay();
  // Distance to Monday (if Sunday (0), distance is -6, if Monday (1), distance is 0)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const dayShorts = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const monthShorts = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  const weekDays: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateToISO(d);
    
    weekDays.push({
      dateStr,
      dayName: dayNames[i],
      dayShort: dayShorts[i],
      dayNumber: d.getDate(),
      monthShort: monthShorts[d.getMonth()],
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  return weekDays;
}

/**
 * Returns a human-friendly label for a given dateStr
 * e.g. 'Aujourd'hui', 'Demain', 'Mercredi 7 oct.'
 */
export function formatDayLabel(dateStr?: string): string {
  if (!dateStr) return 'Sans date';
  const todayStr = getTodayDateStr();
  
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;

  const today = new Date(todayStr + 'T00:00:00');
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === -1) return 'Hier';

  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const monthShorts = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  return `${dayNames[d.getDay()]} ${d.getDate()} ${monthShorts[d.getMonth()]}`;
}

/**
 * Returns short day label e.g. "Lun. 5", "Mar. 6", etc.
 */
export function formatShortDayLabel(dateStr?: string): string {
  if (!dateStr) return 'Sans date';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;

  const dayShorts = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return `${dayShorts[d.getDay()]} ${d.getDate()}`;
}

/**
 * Checks if a task is scheduled on a specific date (YYYY-MM-DD)
 */
export function isTaskOnDate(
  task: { scheduledDate?: string; horizon?: string; createdAt?: number },
  dateStr: string,
  todayStr: string = getTodayDateStr()
): boolean {
  if (task.scheduledDate) {
    return task.scheduledDate === dateStr;
  }
  if (task.createdAt) {
    const createdDateStr = formatDateToISO(new Date(task.createdAt));
    if (task.horizon === 'today') {
      return createdDateStr === dateStr;
    }
    return false;
  }
  if (task.horizon === 'today' && dateStr === todayStr) {
    return true;
  }
  return false;
}

/**
 * Checks if a task is scheduled strictly for today
 */
export function isTaskToday(
  task: { scheduledDate?: string; horizon?: string; createdAt?: number },
  todayStr: string = getTodayDateStr()
): boolean {
  return isTaskOnDate(task, todayStr, todayStr);
}

/**
 * Checks if an uncompleted task is from a past day (e.g. yesterday or earlier)
 */
export function isTaskPast(
  task: { scheduledDate?: string; horizon?: string; createdAt?: number; completed?: boolean; cancelled?: boolean },
  todayStr: string = getTodayDateStr()
): boolean {
  if (task.completed || task.cancelled) return false;
  const taskDate = task.scheduledDate || (task.createdAt ? formatDateToISO(new Date(task.createdAt)) : undefined);
  if (taskDate && taskDate < todayStr && (task.scheduledDate || task.horizon === 'today')) {
    return true;
  }
  return false;
}

/**
 * Checks if a task is unscheduled ("Sans date")
 */
export function isTaskUnscheduled(task: { scheduledDate?: string; horizon?: string }): boolean {
  if (task.scheduledDate) return false;
  return (task.horizon || 'todo') === 'todo';
}

/**
 * Automatically rolls over any uncompleted past tasks (from yesterday or earlier) to today.
 * Preserves completed/cancelled status and moves active uncompleted tasks to today's date.
 */
export function rolloverPastTasksToToday<T extends {
  id: string;
  completed?: boolean;
  cancelled?: boolean;
  scheduledDate?: string;
  horizon?: string;
  createdAt?: number;
  [key: string]: any;
}>(tasks: T[], todayStr: string = getTodayDateStr()): { updatedTasks: T[]; rolledOverCount: number } {
  let rolledOverCount = 0;
  const updatedTasks = tasks.map((task) => {
    if (isTaskPast(task, todayStr)) {
      rolledOverCount++;
      return {
        ...task,
        horizon: 'today',
        scheduledDate: todayStr,
      };
    }
    return task;
  });
  return { updatedTasks, rolledOverCount };
}

import type { Task, Category, GroqSettings, ThoughtEntry } from '../types';
import { DEFAULT_CATEGORIES, CATEGORY_PALETTE } from '../constants/defaultCategories';
import { formatDateToISO } from '../utils/dateUtils';

const TASKS_KEY = 'monorg_tasks_v1';
const CATEGORIES_KEY = 'monorg_categories_v1';
const SETTINGS_KEY = 'monorg_groq_settings_v1';
const THOUGHTS_KEY = 'monorg_thoughts_v1';

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t: any) => {
      const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
      const createdDateStr = formatDateToISO(new Date(createdAt));

      let scheduledDate = typeof t.scheduledDate === 'string' ? t.scheduledDate : undefined;
      const validHorizon = ['today', 'todo', 'life'].includes(t.horizon)
        ? t.horizon
        : (t.dueDate === "Aujourd'hui" || t.dueDate === "Ce soir" ? 'today' : 'todo');

      // Bind missing scheduledDate for 'today' horizon to its creation date
      if (!scheduledDate && validHorizon === 'today') {
        scheduledDate = createdDateStr;
      }

      return {
        ...t,
        horizon: validHorizon,
        scheduledDate,
        todayOrder: typeof t.todayOrder === 'number' ? t.todayOrder : undefined,
        suggestedTimeSlot: t.suggestedTimeSlot || undefined,
        todayPhase: t.todayPhase || undefined,
        todayRationale: t.todayRationale || undefined,
        isFrog: typeof t.isFrog === 'boolean' ? t.isFrog : undefined,
        cancelled: typeof t.cancelled === 'boolean' ? t.cancelled : undefined,
        createdAt,
        subtasks: Array.isArray(t.subtasks)
          ? t.subtasks.map((st: any) => ({
              id: String(st.id || Math.random().toString(36).substring(2, 9)),
              title: String(st.title || ''),
              completed: Boolean(st.completed),
              createdAt: typeof st.createdAt === 'number' ? st.createdAt : Date.now(),
            }))
          : undefined,
      };
    });
  } catch (e) {
    console.error('Failed to load tasks', e);
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CATEGORIES;

    return parsed.map((cat, idx) => {
      const defaultMatch = DEFAULT_CATEGORIES.find((d) => d.id === cat.id);
      const paletteMatch = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
      return {
        ...cat,
        color: cat.color || defaultMatch?.color || paletteMatch.color,
        bgColor: cat.bgColor || defaultMatch?.bgColor || paletteMatch.bgColor,
        borderColor: cat.borderColor || defaultMatch?.borderColor || paletteMatch.borderColor,
      };
    });
  } catch (e) {
    console.error('Failed to load categories', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories', e);
  }
}

export function loadGroqSettings(): GroqSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const envApiKey = (import.meta.env.VITE_GROQ_API_KEY as string) || '';
    const defaultModel = 'llama-3.1-8b-instant';

    if (!raw) {
      return {
        apiKey: envApiKey,
        model: defaultModel,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      apiKey: parsed.apiKey || envApiKey || '',
      model: parsed.model || defaultModel,
    };
  } catch (e) {
    return {
      apiKey: (import.meta.env.VITE_GROQ_API_KEY as string) || '',
      model: 'llama-3.1-8b-instant',
    };
  }
}

export function saveGroqSettings(settings: GroqSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

const FAVORITES_KEY = 'monorg_favorite_quotes_v1';

export function loadFavoriteQuotes(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .map((q: any) => (typeof q === 'string' ? q.trim() : ''))
      .filter(Boolean);
    return Array.from(new Set(sanitized));
  } catch (e) {
    console.error('Failed to load favorite quotes', e);
    return [];
  }
}

export function saveFavoriteQuotes(quotes: string[]): void {
  try {
    const sanitized = quotes
      .map((q: any) => (typeof q === 'string' ? q.trim() : ''))
      .filter(Boolean);
    const unique = Array.from(new Set(sanitized));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save favorite quotes', e);
  }
}

export function loadThoughts(): ThoughtEntry[] {
  try {
    const raw = localStorage.getItem(THOUGHTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load thoughts', e);
    return [];
  }
}

export function saveThoughts(thoughts: ThoughtEntry[]): void {
  try {
    localStorage.setItem(THOUGHTS_KEY, JSON.stringify(thoughts));
  } catch (e) {
    console.error('Failed to save thoughts', e);
  }
}

const BRAINSTORM_KEY = 'monorg_brainstorm_sessions_v1';

export function loadBrainstormSessions(): import('../types').BrainstormSession[] {
  try {
    const raw = localStorage.getItem(BRAINSTORM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load brainstorm sessions', e);
    return [];
  }
}

export function saveBrainstormSessions(sessions: import('../types').BrainstormSession[]): void {
  try {
    localStorage.setItem(BRAINSTORM_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save brainstorm sessions', e);
  }
}

const FITNESS_KEY = 'monorg_fitness_state_v1';

export function loadFitnessState(): import('../types').FitnessState {
  const defaultState: import('../types').FitnessState = {
    completedChallengeIds: [],
    challengeProgress: {},
    lastChallengeDate: new Date().toISOString().split('T')[0],
    streak: 0,
    lastActiveDate: '',
    activityLogs: [],
  };

  try {
    const raw = localStorage.getItem(FITNESS_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      completedChallengeIds: Array.isArray(parsed.completedChallengeIds) ? parsed.completedChallengeIds : [],
      challengeProgress: parsed.challengeProgress && typeof parsed.challengeProgress === 'object' ? parsed.challengeProgress : {},
      lastChallengeDate: parsed.lastChallengeDate || defaultState.lastChallengeDate,
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      lastActiveDate: parsed.lastActiveDate || '',
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
    };
  } catch (e) {
    console.error('Failed to load fitness state', e);
    return defaultState;
  }
}

export function saveFitnessState(state: import('../types').FitnessState): void {
  try {
    localStorage.setItem(FITNESS_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save fitness state', e);
  }
}

export function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(THOUGHTS_KEY);
    localStorage.removeItem(FAVORITES_KEY);
    localStorage.removeItem(BRAINSTORM_KEY);
    localStorage.removeItem(FITNESS_KEY);
  } catch (e) {
    // ignore
  }
}




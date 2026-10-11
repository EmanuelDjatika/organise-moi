import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Task, Category, ThoughtEntry } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

// ==========================================
// AUTHENTICATION HELPERS
// ==========================================

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

export function subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  if (!isSupabaseConfigured || !supabase) return { unsubscribe: () => {} };
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'Supabase n\'est pas configuré.' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user, error: null };
  } catch (e: any) {
    return { user: null, error: e.message || 'Erreur lors de la connexion' };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null; needsEmailConfirmation?: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'Supabase n\'est pas configuré.' };
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      return { user: null, error: error.message };
    }

    // Check if email confirmation is required or user already created
    const needsEmailConfirmation = Boolean(data.user && !data.session);
    return { user: data.user, error: null, needsEmailConfirmation };
  } catch (e: any) {
    return { user: null, error: e.message || 'Erreur lors de l\'inscription' };
  }
}

export async function signOutUser(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
}

// ==========================================
// CATEGORIES (USER-SCOPED)
// ==========================================

export async function fetchCategoriesFromSupabase(): Promise<Category[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch categories error:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      // Seed default categories for this user if none exist
      await saveCategoriesToSupabase(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      bgColor: row.bg_color,
      borderColor: row.border_color,
    }));
  } catch (e) {
    console.warn('Supabase fetch categories exception:', e);
    return null;
  }
}

export async function saveCategoriesToSupabase(categories: Category[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || categories.length === 0) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const rows = categories.map((cat) => ({
      id: cat.id,
      user_id: user.id,
      name: cat.name,
      color: cat.color,
      bg_color: cat.bgColor,
      border_color: cat.borderColor,
    }));

    const { error } = await supabase
      .from('categories')
      .upsert(rows, { onConflict: 'id,user_id' });

    if (error) {
      console.warn('Supabase upsert categories error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase save categories exception:', e);
  }
}

// ==========================================
// TASKS (USER-SCOPED)
// ==========================================

export async function fetchTasksFromSupabase(): Promise<Task[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch tasks error:', error.message);
      return null;
    }

    if (!data) return null;

    return data.map((row: any) => {
      let notesText = row.notes || undefined;
      let todayOrder = typeof row.today_order === 'number' ? row.today_order : undefined;
      let suggestedTimeSlot = row.suggested_time_slot || undefined;
      let todayPhase = row.today_phase || undefined;
      let todayRationale = row.today_rationale || undefined;
      let isFrog = typeof row.is_frog === 'boolean' ? row.is_frog : undefined;
      let scheduledDate = typeof row.scheduled_date === 'string' ? row.scheduled_date : undefined;
      let cancelled = typeof row.cancelled === 'boolean' ? row.cancelled : undefined;
      let subtasks: any = undefined;

      // Check if notes contains serialized metadata
      if (row.notes && typeof row.notes === 'string' && row.notes.startsWith('__METADATA_JSON__:')) {
        try {
          const parsedMeta = JSON.parse(row.notes.substring('__METADATA_JSON__:'.length));
          notesText = parsedMeta.notes || undefined;
          if (parsedMeta.todayOrder !== undefined) todayOrder = parsedMeta.todayOrder;
          if (parsedMeta.suggestedTimeSlot !== undefined) suggestedTimeSlot = parsedMeta.suggestedTimeSlot;
          if (parsedMeta.todayPhase !== undefined) todayPhase = parsedMeta.todayPhase;
          if (parsedMeta.todayRationale !== undefined) todayRationale = parsedMeta.todayRationale;
          if (parsedMeta.isFrog !== undefined) isFrog = parsedMeta.isFrog;
          if (parsedMeta.scheduledDate !== undefined) scheduledDate = parsedMeta.scheduledDate;
          if (parsedMeta.cancelled !== undefined) cancelled = parsedMeta.cancelled;
          if (Array.isArray(parsedMeta.subtasks)) subtasks = parsedMeta.subtasks;
        } catch (err) {
          // ignore parsing error, keep as raw notes
        }
      }

      return {
        id: row.id,
        title: row.title,
        categoryId: row.category_id || 'work',
        horizon: row.horizon || 'todo',
        scheduledDate,
        completed: Boolean(row.completed),
        cancelled: Boolean(cancelled),
        priority: row.priority || 'medium',
        estimatedTime: row.estimated_time || undefined,
        dueDate: row.due_date || undefined,
        notes: notesText,
        todayOrder,
        suggestedTimeSlot,
        todayPhase,
        todayRationale,
        isFrog,
        subtasks,
        createdAt: Number(row.created_at) || Date.now(),
      };
    });
  } catch (e) {
    console.warn('Supabase fetch tasks exception:', e);
    return null;
  }
}

export async function saveTasksToSupabase(tasks: Task[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || tasks.length === 0) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const rows = tasks.map((t) => {
      let notesPayload = t.notes || null;
      if (
        t.todayOrder !== undefined ||
        t.suggestedTimeSlot ||
        t.todayPhase ||
        t.todayRationale ||
        t.isFrog !== undefined ||
        t.scheduledDate !== undefined ||
        t.cancelled !== undefined ||
        (t.subtasks && t.subtasks.length > 0)
      ) {
        notesPayload = '__METADATA_JSON__:' + JSON.stringify({
          notes: t.notes || null,
          todayOrder: t.todayOrder,
          suggestedTimeSlot: t.suggestedTimeSlot,
          todayPhase: t.todayPhase,
          todayRationale: t.todayRationale,
          isFrog: t.isFrog,
          scheduledDate: t.scheduledDate,
          cancelled: t.cancelled,
          subtasks: t.subtasks,
        });
      }

      return {
        id: t.id,
        user_id: user.id,
        title: t.title,
        category_id: t.categoryId,
        horizon: t.horizon || 'todo',
        completed: t.completed,
        priority: t.priority,
        estimated_time: t.estimatedTime || null,
        due_date: t.dueDate || null,
        notes: notesPayload,
        created_at: t.createdAt,
      };
    });

    const { error } = await supabase
      .from('tasks')
      .upsert(rows, { onConflict: 'id,user_id' });

    if (error) {
      console.warn('Supabase upsert tasks error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase save tasks exception:', e);
  }
}

export async function deleteTaskFromSupabase(taskId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.warn('Supabase delete task error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase delete task exception:', e);
  }
}

export async function clearAllTasksFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      await supabase.from('tasks').delete().eq('user_id', user.id);
    } else {
      await supabase.from('tasks').delete().neq('id', 'dummy_keep_none');
    }
  } catch (e) {
    console.warn('Supabase clear all tasks error:', e);
  }
}

// ==========================================
// THOUGHTS & JOURNAL (USER-SCOPED)
// ==========================================

export async function fetchThoughtsFromSupabase(): Promise<ThoughtEntry[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch thoughts error:', error.message);
      return null;
    }

    if (!data) return null;

    return data.map((row: any) => ({
      id: row.id,
      content: row.content,
      tag: row.tag || 'Réflexion',
      analysis: row.analysis || undefined,
      createdAt: Number(row.created_at) || Date.now(),
    }));
  } catch (e) {
    console.warn('Supabase fetch thoughts exception:', e);
    return null;
  }
}

export async function saveThoughtsToSupabase(thoughts: ThoughtEntry[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (thoughts.length === 0) return;

    const rows = thoughts.map((th) => ({
      id: th.id,
      user_id: user.id,
      content: th.content,
      tag: th.tag || 'Réflexion',
      analysis: th.analysis || null,
      created_at: th.createdAt,
    }));

    const { error } = await supabase
      .from('thoughts')
      .upsert(rows, { onConflict: 'id,user_id' });

    if (error) {
      console.warn('Supabase upsert thoughts error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase save thoughts exception:', e);
  }
}

export async function deleteThoughtFromSupabase(thoughtId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase
      .from('thoughts')
      .delete()
      .eq('id', thoughtId)
      .eq('user_id', user.id);

    if (error) {
      console.warn('Supabase delete thought error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase delete thought exception:', e);
  }
}

// ==========================================
// FAVORITE QUOTES (USER-SCOPED)
// ==========================================

export async function fetchFavoriteQuotesFromSupabase(): Promise<string[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('favorite_quotes')
      .select('quote')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch favorite quotes error:', error.message);
      return null;
    }

    if (!data) return null;

    const cleanQuotes = data
      .map((r: any) => (r.quote ? String(r.quote).trim() : ''))
      .filter(Boolean);

    return Array.from(new Set(cleanQuotes));
  } catch (e) {
    console.warn('Supabase fetch favorite quotes exception:', e);
    return null;
  }
}

export async function saveFavoriteQuotesToSupabase(quotes: string[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // Fetch currently saved quotes for this user
    const { data: existingRows, error: fetchErr } = await supabase
      .from('favorite_quotes')
      .select('id, quote')
      .eq('user_id', user.id);

    if (fetchErr) {
      console.warn('Supabase fetch existing quotes error:', fetchErr.message);
    }

    const currentRows = existingRows || [];
    const normalizedTargetQuotes = Array.from(new Set(quotes.map((q) => String(q || '').trim()).filter(Boolean)));
    const targetSet = new Set(normalizedTargetQuotes);
    const existingQuotesSet = new Set(currentRows.map((r: any) => String(r.quote || '').trim()));

    // 1. Delete rows no longer in target quotes
    const rowsToDelete = currentRows.filter((r: any) => !targetSet.has(String(r.quote || '').trim()));
    if (rowsToDelete.length > 0) {
      const idsToDelete = rowsToDelete.map((r: any) => r.id);
      await supabase
        .from('favorite_quotes')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', user.id);
    }

    // 2. Insert new quotes not yet in Supabase
    const quotesToInsert = normalizedTargetQuotes.filter((q) => !existingQuotesSet.has(q));
    if (quotesToInsert.length > 0) {
      const rowsToInsert = quotesToInsert.map((q) => ({
        quote: q,
        user_id: user.id,
      }));
      const { error: insertErr } = await supabase
        .from('favorite_quotes')
        .insert(rowsToInsert);

      if (insertErr) {
        console.warn('Supabase insert favorite quotes error:', insertErr.message);
      }
    }
  } catch (e) {
    console.warn('Supabase save favorite quotes exception:', e);
  }
}

export async function saveFavoriteQuoteToSupabase(quote: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !quote) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const trimmed = String(quote).trim();
    if (!trimmed) return;

    // Check if already exists in Supabase
    const { data: existing } = await supabase
      .from('favorite_quotes')
      .select('id')
      .eq('user_id', user.id)
      .eq('quote', trimmed)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    const { error } = await supabase
      .from('favorite_quotes')
      .insert({ quote: trimmed, user_id: user.id });

    if (error) {
      console.warn('Supabase save single favorite quote error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase save single favorite quote exception:', e);
  }
}

export async function deleteFavoriteQuoteFromSupabase(quote: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !quote) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const trimmed = String(quote).trim();
    const { error } = await supabase
      .from('favorite_quotes')
      .delete()
      .eq('quote', trimmed)
      .eq('user_id', user.id);

    if (error) {
      console.warn('Supabase delete favorite quote error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase delete favorite quote exception:', e);
  }
}

// ==========================================
// BRAINSTORM SESSIONS (USER-SCOPED)
// ==========================================

export async function fetchBrainstormSessionsFromSupabase(): Promise<import('../types').BrainstormSession[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch brainstorm sessions error:', error.message);
      return null;
    }

    if (!data) return null;

    return data.map((r: any) => ({
      id: r.id,
      title: r.title,
      topic: r.topic || undefined,
      category: r.category || undefined,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      messages: Array.isArray(r.messages) ? r.messages : [],
      lastAnalysis: r.last_analysis || undefined,
    }));
  } catch (e) {
    console.warn('Supabase fetch brainstorm sessions exception:', e);
    return null;
  }
}

export async function saveBrainstormSessionToSupabase(session: import('../types').BrainstormSession): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase.from('brainstorm_sessions').upsert(
      {
        id: session.id,
        user_id: user.id,
        title: session.title,
        topic: session.topic || null,
        category: session.category || null,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
        messages: session.messages,
        last_analysis: session.lastAnalysis || null,
      },
      { onConflict: 'id,user_id' }
    );
  } catch (e) {
    console.warn('Supabase save brainstorm session exception:', e);
  }
}

export async function deleteBrainstormSessionFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase
      .from('brainstorm_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  } catch (e) {
    console.warn('Supabase delete brainstorm session exception:', e);
  }
}

// ==========================================
// INITIAL SYNC FOR ACTIVE USER
// ==========================================

export async function syncInitialDataFromSupabase(): Promise<{
  categories?: Category[];
  tasks?: Task[];
  thoughts?: ThoughtEntry[];
  quotes?: string[];
  brainstorms?: import('../types').BrainstormSession[];
}> {
  if (!isSupabaseConfigured || !supabase) return {};

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return {};

  const [categories, tasks, thoughts, quotes, brainstorms] = await Promise.all([
    fetchCategoriesFromSupabase(),
    fetchTasksFromSupabase(),
    fetchThoughtsFromSupabase(),
    fetchFavoriteQuotesFromSupabase(),
    fetchBrainstormSessionsFromSupabase(),
  ]);

  return {
    categories: categories || undefined,
    tasks: tasks || undefined,
    thoughts: thoughts || undefined,
    quotes: quotes || undefined,
    brainstorms: brainstorms || undefined,
  };
}

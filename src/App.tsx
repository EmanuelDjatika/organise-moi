import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BrainDumpInput } from './components/BrainDumpInput';
import { CategoryBoard } from './components/CategoryBoard';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExportModal } from './components/ExportModal';
import { FavoriteQuotesModal } from './components/FavoriteQuotesModal';
import { LifeTasksModal } from './components/LifeTasksModal';
import { AuthModal } from './components/AuthModal';
import { AuthPage } from './components/AuthPage';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ThoughtsJournalPage } from './components/ThoughtsJournalPage';
import { BrainstormPage } from './components/BrainstormPage';
import { FitnessPage } from './components/FitnessPage';
import { AIBanner } from './components/AIBanner';
import { Leaf, Brain, Compass, Dumbbell } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type {
  Task,
  Category,
  GroqSettings,
  Horizon,
  ThoughtEntry,
  AIThoughtAnalysis,
  AppPage,
  OptimizedScheduleTask,
  TodayOptimizationResult,
  BrainstormSession,
  Priority,
} from './types';
import {
  loadGroqSettings,
  saveGroqSettings,
  loadTasks,
  saveTasks,
  loadCategories,
  saveCategories,
  loadThoughts,
  saveThoughts,
  loadFavoriteQuotes,
  saveFavoriteQuotes,
  loadBrainstormSessions,
  saveBrainstormSessions,
  clearLegacyLocalStorage,
} from './services/storage';
import { isSupabaseConfigured } from './services/supabaseClient';
import {
  saveCategoriesToSupabase,
  saveTasksToSupabase,
  deleteTaskFromSupabase,
  clearAllTasksFromSupabase,
  saveThoughtsToSupabase,
  deleteThoughtFromSupabase,
  saveFavoriteQuotesToSupabase,
  saveBrainstormSessionToSupabase,
  deleteBrainstormSessionFromSupabase,
  syncInitialDataFromSupabase,
  getCurrentUser,
  subscribeToAuthChanges,
  signOutUser,
} from './services/supabaseService';
import { categorizeTasks, getNextUniqueQuote, fetchAvailableGroqModels } from './services/aiCategorizer';
import { CATEGORY_PALETTE, DEFAULT_CATEGORIES } from './constants/defaultCategories';
import { playTaskAddSound, preloadAppSounds } from './utils/soundUtils';
import { getTodayDateStr, isTaskOnDate, rolloverPastTasksToToday } from './utils/dateUtils';
import confetti from 'canvas-confetti';
import './App.css';

export function App() {
  const isCloudSyncDone = useRef(false);
  const [currentPage, setCurrentPage] = useState<AppPage>('board');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const cached = loadTasks();
    const { updatedTasks, rolledOverCount } = rolloverPastTasksToToday(cached);
    if (rolledOverCount > 0) {
      saveTasks(updatedTasks);
    }
    return updatedTasks;
  });
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [thoughts, setThoughts] = useState<ThoughtEntry[]>(() => loadThoughts());
  const [brainstormSessions, setBrainstormSessions] = useState<BrainstormSession[]>(() => loadBrainstormSessions());
  const [groqSettings, setGroqSettings] = useState<GroqSettings>(() => loadGroqSettings());
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [favoriteQuotes, setFavoriteQuotes] = useState<string[]>(() => loadFavoriteQuotes());
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isLifeModalOpen, setIsLifeModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(() => {
    const cachedTasks = loadTasks();
    const cachedCats = loadCategories();
    return cachedTasks.length === 0 && cachedCats.length === 0;
  });
  const [aiTip, setAiTip] = useState<string>(() => getNextUniqueQuote());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Eagerly preload sound effects on app start
  useEffect(() => {
    preloadAppSounds();
  }, []);

  // Auto-fetch available Groq models if API key is present
  useEffect(() => {
    if (groqSettings.apiKey && groqSettings.apiKey.trim().length > 5) {
      fetchAvailableGroqModels(groqSettings.apiKey.trim()).then((models) => {
        if (models.length > 0) {
          setAvailableModels(models);
        }
      });
    }
  }, [groqSettings.apiKey]);

  // Auth Subscription and Initial User Check
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsDataLoading(false);
      return;
    }

    getCurrentUser().then((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserDataFromCloud(true);
      } else {
        setIsDataLoading(false);
        setIsAuthModalOpen(false);
      }
    });

    const sub = subscribeToAuthChanges((event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setTasks([]);
        setThoughts([]);
        setBrainstormSessions([]);
        setCategories([]);
        setFavoriteQuotes([]);
        clearLegacyLocalStorage();
        setIsDataLoading(false);
        setIsAuthModalOpen(false);
        return;
      }

      if (event === 'SIGNED_IN' && user) {
        setIsAuthModalOpen(false);
        loadUserDataFromCloud(true);
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const loadUserDataFromCloud = async (silent = true) => {
    if (!silent) {
      setIsDataLoading(true);
    }
    try {
      const cloudData = await syncInitialDataFromSupabase();

      if (cloudData.categories && cloudData.categories.length > 0) {
        setCategories(cloudData.categories);
        saveCategories(cloudData.categories);
      } else {
        const localCats = loadCategories();
        if (localCats.length > 0) {
          setCategories(localCats);
        } else {
          setCategories(DEFAULT_CATEGORIES);
          await saveCategoriesToSupabase(DEFAULT_CATEGORIES);
        }
      }

      if (cloudData.tasks && cloudData.tasks.length > 0) {
        const { updatedTasks, rolledOverCount } = rolloverPastTasksToToday(cloudData.tasks);
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
        if (isSupabaseConfigured && currentUser && rolledOverCount > 0) {
          saveTasksToSupabase(updatedTasks);
        }
      } else {
        // If Supabase returned empty, check local cache to preserve existing tasks
        const localTasks = loadTasks();
        if (localTasks.length > 0) {
          const { updatedTasks } = rolloverPastTasksToToday(localTasks);
          setTasks(updatedTasks);
          saveTasks(updatedTasks);
          await saveTasksToSupabase(updatedTasks);
        }
      }

      if (cloudData.thoughts && cloudData.thoughts.length > 0) {
        setThoughts(cloudData.thoughts);
        saveThoughts(cloudData.thoughts);
      } else {
        const localThoughts = loadThoughts();
        if (localThoughts.length > 0) {
          setThoughts(localThoughts);
          await saveThoughtsToSupabase(localThoughts);
        }
      }

      if (cloudData.brainstorms && cloudData.brainstorms.length > 0) {
        setBrainstormSessions(cloudData.brainstorms);
        saveBrainstormSessions(cloudData.brainstorms);
      } else {
        const localBrainstorms = loadBrainstormSessions();
        if (localBrainstorms.length > 0) {
          setBrainstormSessions(localBrainstorms);
          for (const s of localBrainstorms) {
            await saveBrainstormSessionToSupabase(s);
          }
        }
      }

      if (cloudData.quotes && cloudData.quotes.length > 0) {
        const localQuotes = loadFavoriteQuotes();
        const mergedQuotes = Array.from(new Set([...cloudData.quotes, ...localQuotes]));
        setFavoriteQuotes(mergedQuotes);
        saveFavoriteQuotes(mergedQuotes);
        if (isSupabaseConfigured && currentUser && mergedQuotes.length > cloudData.quotes.length) {
          await saveFavoriteQuotesToSupabase(mergedQuotes);
        }
      } else {
        const localQuotes = loadFavoriteQuotes();
        if (localQuotes.length > 0) {
          setFavoriteQuotes(localQuotes);
          if (isSupabaseConfigured && currentUser) {
            await saveFavoriteQuotesToSupabase(localQuotes);
          }
        }
      }
    } catch (err) {
      console.warn('Error syncing user cloud data:', err);
    } finally {
      setIsDataLoading(false);
      isCloudSyncDone.current = true;
    }
  };

  const handleSignOut = async () => {
    isCloudSyncDone.current = false;
    await signOutUser();
    setCurrentUser(null);
    setTasks([]);
    setThoughts([]);
    setBrainstormSessions([]);
    setCategories([]);
    setFavoriteQuotes([]);
    clearLegacyLocalStorage();
    showToast('Déconnexion réussie.');
    setIsAuthModalOpen(false);
    setIsLogoutModalOpen(false);
  };

  const handleAuthSuccess = (user: User) => {
    isCloudSyncDone.current = false;
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    loadUserDataFromCloud(false);
    showToast(`Bienvenue, ${user.email} !`);
  };

  // Save changes to Supabase and localStorage for the authenticated user
  useEffect(() => {
    saveTasks(tasks);
    if (isSupabaseConfigured && currentUser && isCloudSyncDone.current) {
      saveTasksToSupabase(tasks);
    }
  }, [tasks, currentUser]);

  // Automatically rollover uncompleted past tasks (from yesterday or earlier) to today
  useEffect(() => {
    const handleAutoRollover = () => {
      const todayStr = getTodayDateStr();
      setTasks((prev) => {
        const { updatedTasks, rolledOverCount } = rolloverPastTasksToToday(prev, todayStr);
        if (rolledOverCount > 0) {
          saveTasks(updatedTasks);
          if (isSupabaseConfigured && currentUser && isCloudSyncDone.current) {
            saveTasksToSupabase(updatedTasks);
          }
          return updatedTasks;
        }
        return prev;
      });
    };

    handleAutoRollover();

    // Check periodically every minute (catches midnight date transition)
    const timer = setInterval(handleAutoRollover, 60000);

    // Check whenever the browser tab gains focus or becomes visible
    window.addEventListener('focus', handleAutoRollover);
    document.addEventListener('visibilitychange', handleAutoRollover);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleAutoRollover);
      document.removeEventListener('visibilitychange', handleAutoRollover);
    };
  }, [currentUser]);

  useEffect(() => {
    if (categories.length > 0) {
      saveCategories(categories);
      if (isSupabaseConfigured && currentUser && isCloudSyncDone.current) {
        saveCategoriesToSupabase(categories);
      }
    }
  }, [categories, currentUser]);

  useEffect(() => {
    saveThoughts(thoughts);
    if (isSupabaseConfigured && currentUser && isCloudSyncDone.current) {
      saveThoughtsToSupabase(thoughts);
    }
  }, [thoughts, currentUser]);

  useEffect(() => {
    saveFavoriteQuotes(favoriteQuotes);
    if (isSupabaseConfigured && currentUser && isCloudSyncDone.current) {
      saveFavoriteQuotesToSupabase(favoriteQuotes);
    }
  }, [favoriteQuotes, currentUser]);



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOrganize = async (rawText: string, mode: 'append' | 'replace') => {
    setIsLoading(true);
    try {
      const result = await categorizeTasks(
        rawText,
        categories,
        groqSettings.apiKey,
        groqSettings.model
      );

      if (!result.tasks || result.tasks.length === 0) {
        showToast('Aucune tâche détectée dans le texte.');
        setIsLoading(false);
        return;
      }

      // Process new categories if any returned
      const updatedCategories = [...categories];
      const newTasks: Task[] = [];

      for (const item of result.tasks) {
        // Find existing category or create a new one
        let matchedCat = updatedCategories.find(
          (c) => c.name.toLowerCase() === item.categoryName.toLowerCase()
        );

        if (!matchedCat) {
          const colorObj =
            CATEGORY_PALETTE[updatedCategories.length % CATEGORY_PALETTE.length];
          matchedCat = {
            id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: item.categoryName,
            color: colorObj.color,
            bgColor: colorObj.bgColor,
            borderColor: colorObj.borderColor,
          };
          updatedCategories.push(matchedCat);
        }

        const todayStr = getTodayDateStr();
        const isToday = (item.horizon || 'todo') === 'today';
        newTasks.push({
          id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
          title: item.title,
          categoryId: matchedCat.id,
          horizon: item.horizon || 'todo',
          scheduledDate: isToday ? todayStr : undefined,
          completed: false,
          priority: item.priority,
          estimatedTime: item.estimatedTime,
          dueDate: item.dueDate,
          notes: item.notes,
          createdAt: Date.now(),
        });
      }

      setCategories(updatedCategories);

      if (mode === 'replace') {
        setTasks(newTasks);
      } else {
        setTasks((prev) => [...prev, ...newTasks]);
      }

      if (result.aiTip) {
        setAiTip(result.aiTip);
      }

      // Play sound and celebrate
      playTaskAddSound();
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast(`${newTasks.length} tâche(s) classée(s) avec succès.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Erreur lors du traitement: ${err.message || 'Vérifiez votre connexion'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (isSupabaseConfigured) {
      deleteTaskFromSupabase(id);
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const handleReorderTasks = (orderedTasks: OptimizedScheduleTask[], _result?: TodayOptimizationResult) => {
    const todayStr = getTodayDateStr();
    const scheduleMap = new Map<string, OptimizedScheduleTask>();
    orderedTasks.forEach((item) => {
      scheduleMap.set(item.taskId, item);
    });

    setTasks((prev) => {
      const updated = prev.map((task) => {
        const sched = scheduleMap.get(task.id);
        if (sched) {
          return {
            ...task,
            todayOrder: sched.order,
            suggestedTimeSlot: sched.suggestedTimeSlot,
            todayPhase: sched.phase,
            todayRationale: sched.rationale,
            isFrog: Boolean(sched.isFrog),
          };
        }
        return task;
      });

      return [...updated].sort((a, b) => {
        const isTodayA = isTaskOnDate(a, todayStr, todayStr);
        const isTodayB = isTaskOnDate(b, todayStr, todayStr);
        if (isTodayA && isTodayB) {
          const orderA = typeof a.todayOrder === 'number' ? a.todayOrder : 9999;
          const orderB = typeof b.todayOrder === 'number' ? b.todayOrder : 9999;
          if (orderA !== orderB) return orderA - orderB;
        }
        return 0;
      });
    });

    showToast("Ordre de la journée & créneaux enregistrés avec succès !");
  };

  const handleAddTaskToCategory = (
    categoryId: string,
    title: string,
    horizon: Horizon = 'todo',
    scheduledDate?: string
  ) => {
    const todayStr = getTodayDateStr();
    const finalScheduledDate =
      scheduledDate !== undefined
        ? scheduledDate
        : horizon === 'today'
        ? todayStr
        : undefined;

    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      title,
      categoryId,
      horizon,
      scheduledDate: finalScheduledDate,
      completed: false,
      priority: 'medium',
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);
    playTaskAddSound();
    showToast('Tâche ajoutée.');
  };

  const handleClearAll = () => {
    setIsClearAllModalOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setTasks([]);
    if (isSupabaseConfigured) {
      await clearAllTasksFromSupabase();
    }
    clearLegacyLocalStorage();
    setAiTip('');
    showToast('Toutes les tâches ont été effacées.');
  };

  const handleToggleFavoriteQuote = (quote: string) => {
    if (!quote) return;
    const trimmed = quote.trim();
    if (!trimmed) return;

    setFavoriteQuotes((prev) => {
      const exists = prev.some((q) => q.trim() === trimmed);
      if (exists) {
        showToast('Citation retirée des favoris.');
        return prev.filter((q) => q.trim() !== trimmed);
      } else {
        showToast('Citation ajoutée aux favoris.');
        return [trimmed, ...prev.filter((q) => q.trim() !== trimmed)];
      }
    });
  };

  const handleRemoveFavoriteQuote = (quote: string) => {
    if (!quote) return;
    const trimmed = quote.trim();
    setFavoriteQuotes((prev) => prev.filter((q) => q.trim() !== trimmed));
    showToast('Citation retirée des favoris.');
  };

  const handleSelectFavoriteQuote = (quote: string) => {
    setAiTip(quote);
    showToast('Citation affichée.');
  };

  const handleSelectModel = (model: string) => {
    const updated = { ...groqSettings, model };
    setGroqSettings(updated);
    saveGroqSettings(updated);
    showToast(`Modèle IA actif : ${model}`);
  };

  const handleSaveGroqSettings = (newSettings: GroqSettings) => {
    setGroqSettings(newSettings);
    saveGroqSettings(newSettings);
    showToast('Paramètres Groq enregistrés.');
  };

  const handleSaveThought = async (content: string, tag?: string): Promise<ThoughtEntry> => {
    const newThought: ThoughtEntry = {
      id: 'thought_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      content,
      tag: tag || 'Réflexion',
      createdAt: Date.now(),
    };
    setThoughts((prev) => [newThought, ...prev]);
    showToast('Pensée enregistrée dans votre journal.');
    return newThought;
  };

  const handleDeleteThought = (id: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== id));
    if (isSupabaseConfigured) {
      deleteThoughtFromSupabase(id);
    }
    showToast('Pensée supprimée.');
  };

  const handleUpdateThoughtAnalysis = (id: string, analysis: AIThoughtAnalysis) => {
    setThoughts((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              tag: analysis.themeTag || t.tag,
              analysis,
            }
          : t
      )
    );
    showToast('Pensée analysée et classée par l\'IA.');
  };

  const handleSaveBrainstormSession = (session: BrainstormSession) => {
    setBrainstormSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      let updated: BrainstormSession[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = session;
      } else {
        updated = [session, ...prev];
      }
      saveBrainstormSessions(updated);
      if (isSupabaseConfigured && currentUser) {
        saveBrainstormSessionToSupabase(session);
      }
      return updated;
    });
  };

  const handleDeleteBrainstormSession = (id: string) => {
    setBrainstormSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveBrainstormSessions(updated);
      if (isSupabaseConfigured && currentUser) {
        deleteBrainstormSessionFromSupabase(id);
      }
      return updated;
    });
    showToast('Projet supprimé.');
  };

  const handleAddTaskFromBrainstorm = (
    title: string,
    categoryId: string,
    horizon: Horizon = 'todo',
    priority: Priority = 'medium'
  ) => {
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      title,
      categoryId,
      horizon,
      completed: false,
      priority,
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);
    showToast(`Action « ${title} » ajoutée au tableau.`);
  };

  const handleAddTaskFromThought = (title: string, categoryName: string, horizon: Horizon = 'todo') => {
    // Match existing category or create one
    let matchedCat = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!matchedCat) {
      const colorObj = CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length];
      matchedCat = {
        id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: categoryName,
        color: colorObj.color,
        bgColor: colorObj.bgColor,
        borderColor: colorObj.borderColor,
      };
      setCategories((prev) => [...prev, matchedCat!]);
    }

    const todayStr = getTodayDateStr();
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      title,
      categoryId: matchedCat.id,
      horizon,
      scheduledDate: horizon === 'today' ? todayStr : undefined,
      completed: false,
      priority: 'medium',
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);
    showToast(`Action « ${title} » ajoutée au tableau.`);
  };

  const handleAddTaskFromFitness = (
    title: string,
    categoryId: string,
    horizon: Horizon = 'today',
    subtasks?: string[],
    notes?: string
  ) => {
    const todayStr = getTodayDateStr();
    const newTask: Task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      title,
      categoryId,
      horizon,
      scheduledDate: todayStr,
      dueDate: "Aujourd'hui",
      completed: false,
      priority: 'medium',
      notes,
      subtasks: subtasks?.map((st) => ({
        id: 'st_' + Math.random().toString(36).substring(2, 8),
        title: st,
        completed: false,
        createdAt: Date.now(),
      })),
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);
    playTaskAddSound();
    showToast(`Séance « ${title} » ajoutée au tableau.`);
  };

  // If checking authentication state on startup
  if (isDataLoading) {
    return (
      <div className="auth-loading-screen font-alamain">
        <span className="spinner-loader-sm" style={{ width: 28, height: 28, borderWidth: 3 }} />
        <span style={{ fontSize: 16, color: '#475569' }}>Chargement de votre espace...</span>
      </div>
    );
  }

  // If user is not authenticated, display the dedicated login / signup landing page
  if (!currentUser) {
    return (
      <>
        {toastMessage && <div className="toast-notification font-alamain">{toastMessage}</div>}
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toastMessage && <div className="toast-notification font-alamain">{toastMessage}</div>}

      {currentPage === 'fitness' ? (
        <FitnessPage
          categories={categories}
          onAddTaskToBoard={handleAddTaskFromFitness}
          onBackToBoard={() => setCurrentPage('board')}
        />
      ) : currentPage === 'brainstorm' ? (
        <BrainstormPage
          sessions={brainstormSessions}
          categories={categories}
          onSaveSession={handleSaveBrainstormSession}
          onDeleteSession={handleDeleteBrainstormSession}
          onAddTaskToBoard={handleAddTaskFromBrainstorm}
          onBackToBoard={() => setCurrentPage('board')}
          apiKey={groqSettings.apiKey}
          model={groqSettings.model}
        />
      ) : currentPage === 'thoughts' ? (
        <ThoughtsJournalPage
          thoughts={thoughts}
          categories={categories}
          onSaveThought={handleSaveThought}
          onDeleteThought={handleDeleteThought}
          onUpdateThoughtAnalysis={handleUpdateThoughtAnalysis}
          onAddTaskFromThought={handleAddTaskFromThought}
          onBackToBoard={() => setCurrentPage('board')}
          apiKey={groqSettings.apiKey}
          model={groqSettings.model}
        />
      ) : (
        <>
          <Header
            hasApiKey={Boolean(groqSettings.apiKey && groqSettings.apiKey.trim().length > 5)}
            currentUser={currentUser}
            currentModel={groqSettings.model}
            availableModels={availableModels}
            favoriteQuotesCount={favoriteQuotes.length}
            currentPage={currentPage}
            onNavigatePage={setCurrentPage}
            onOpenFavoritesModal={() => setIsFavoritesModalOpen(true)}
            onSelectModel={handleSelectModel}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onSignOut={() => setIsLogoutModalOpen(true)}
          />

          <main className="main-content">
            <BrainDumpInput
              onOrganize={handleOrganize}
              isLoading={isLoading}
              hasApiKey={Boolean(groqSettings.apiKey && groqSettings.apiKey.trim().length > 5)}
              model={groqSettings.model}
            />

            {aiTip && (
              <AIBanner
                tip={aiTip}
                isFavorite={favoriteQuotes.some((q) => q.trim() === (aiTip || '').trim())}
                onToggleFavorite={() => handleToggleFavoriteQuote(aiTip)}
                onOpenFavorites={() => setIsFavoritesModalOpen(true)}
                favoritesCount={favoriteQuotes.length}
                onDismiss={() => setAiTip('')}
                onRefresh={() => setAiTip(getNextUniqueQuote(aiTip))}
              />
            )}

            <CategoryBoard
              tasks={tasks}
              categories={categories}
              apiKey={groqSettings.apiKey}
              model={groqSettings.model}
              onToggleComplete={handleToggleComplete}
              onDeleteTask={handleDeleteTask}
              onUpdateTask={handleUpdateTask}
              onAddTaskToCategory={handleAddTaskToCategory}
              onReorderTasks={handleReorderTasks}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenLifeModal={() => setIsLifeModalOpen(true)}
              onClearAll={handleClearAll}
            />
          </main>

          {/* Floating Brainstorm Pill (Bottom Left - 1) */}
          <button
            type="button"
            className="floating-brainstorm-pill font-sans"
            onClick={() => setCurrentPage('brainstorm')}
            title="Espace Brainstorming & Projets"
          >
            <Compass size={15} className="floating-brainstorm-icon" />
            <span>Brainstorming</span>
            {brainstormSessions.length > 0 && (
              <span className="floating-thoughts-count">{brainstormSessions.length}</span>
            )}
          </button>

          {/* Floating Thoughts Pill (Bottom Left - 2) */}
          <button
            type="button"
            className="floating-thoughts-pill font-sans"
            onClick={() => setCurrentPage('thoughts')}
            title="Journal de Pensées"
          >
            <Brain size={15} className="floating-thoughts-icon" />
            <span>Pensées</span>
            {thoughts.length > 0 && (
              <span className="floating-thoughts-count">{thoughts.length}</span>
            )}
          </button>

          {/* Floating Fitness Pill (Bottom Left - 3) */}
          <button
            type="button"
            className="floating-fitness-pill font-sans"
            onClick={() => setCurrentPage('fitness')}
            title="Espace Sport & Défis"
          >
            <Dumbbell size={15} className="floating-fitness-icon" />
            <span>Sport & Défis</span>
          </button>

          {/* Floating Life Tasks Pill (Bottom Right) */}
          <button
            type="button"
            className="floating-life-pill font-sans"
            onClick={() => setIsLifeModalOpen(true)}
            title="Tâches de Vie"
          >
            <Leaf size={15} className="floating-life-icon" />
            <span>Vie</span>
            <span className="floating-life-count">
              {tasks.filter((t) => (t.horizon || 'todo') === 'life' && t.completed).length}/
              {tasks.filter((t) => (t.horizon || 'todo') === 'life').length}
            </span>
          </button>

          <footer className="app-footer">
            <p className="footer-handwritten font-alamain">
              Organisation épurée
            </p>
          </footer>
        </>
      )}

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        settings={groqSettings}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveGroqSettings}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        tasks={tasks}
        categories={categories}
        onClose={() => setIsExportModalOpen(false)}
      />

      <FavoriteQuotesModal
        isOpen={isFavoritesModalOpen}
        favorites={favoriteQuotes}
        onClose={() => setIsFavoritesModalOpen(false)}
        onRemoveFavorite={handleRemoveFavoriteQuote}
        onSelectQuote={handleSelectFavoriteQuote}
      />

      <LifeTasksModal
        isOpen={isLifeModalOpen}
        onClose={() => setIsLifeModalOpen(false)}
        tasks={tasks}
        categories={categories}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
        onUpdateTask={handleUpdateTask}
        onAddTask={(title, categoryId) => handleAddTaskToCategory(categoryId, title, 'life')}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        userEmail={currentUser?.email}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleSignOut}
      />

      {/* Confirmation Modal for Clearing All Tasks */}
      <ConfirmDeleteModal
        isOpen={isClearAllModalOpen}
        title="Vider toutes les tâches"
        subtitle="Suppression générale"
        message={`Voulez-vous vraiment effacer l'intégralité de vos ${tasks.length} tâche${tasks.length > 1 ? 's' : ''} ?`}
        itemName={tasks.length > 0 ? `${tasks.length} tâche${tasks.length > 1 ? 's' : ''} réparties sur vos catégories` : undefined}
        confirmLabel="Tout effacer"
        isDangerHigh={true}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={handleConfirmClearAll}
      />
    </div>
  );
};

export default App;

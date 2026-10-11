import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Flame,
  Dumbbell,
  Trophy,
  Play,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Search,
  Timer,
  Info,
  ListPlus,
  Check,
  Pause,
  TrendingUp,
  Zap,
  X
} from 'lucide-react';
import type {
  Exercise,
  ExerciseCategory,
  DailyChallenge,
  FitnessState,
  FitnessActivityLog,
  Category,
  Horizon,
} from '../types';
import {
  EXERCISES_CATALOG,
  EXERCISE_CATEGORIES,
  getDailyChallengesForDate,
} from '../constants/exerciseCatalog';
import { ExerciseIllustration } from './ExerciseIllustration';
import { loadFitnessState, saveFitnessState } from '../services/storage';
import { playTaskCompletionSound, playTaskAddSound } from '../utils/soundUtils';
import confetti from 'canvas-confetti';

interface FitnessPageProps {
  categories: Category[];
  onAddTaskToBoard: (
    title: string,
    categoryId: string,
    horizon?: Horizon,
    subtasks?: string[],
    notes?: string
  ) => void;
  onBackToBoard: () => void;
}

interface SelectedExerciseItem {
  exercise: Exercise;
  count: number;
}

type TabMode = 'catalog' | 'challenges' | 'workout' | 'history';

export const FitnessPage: React.FC<FitnessPageProps> = ({
  categories,
  onAddTaskToBoard,
  onBackToBoard,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<TabMode>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fitnessState, setFitnessState] = useState<FitnessState>(() => loadFitnessState());
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    EXERCISES_CATALOG.forEach((ex) => {
      map[ex.id] = ex.defaultCount;
    });
    return map;
  });

  // Routine basket (multi-exercise selection)
  const [routineItems, setRoutineItems] = useState<SelectedExerciseItem[]>([]);

  // Selected exercise for tips modal
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  // Active workout player state
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutIndex, setWorkoutIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerTotalDuration, setTimerTotalDuration] = useState(0);
  const [isRestPhase, setIsRestPhase] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dailyChallenges = useMemo(() => getDailyChallengesForDate(todayStr), [todayStr]);

  // Sync state to localStorage
  useEffect(() => {
    saveFitnessState(fitnessState);
  }, [fitnessState]);

  // Daily streak check on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (fitnessState.lastActiveDate && fitnessState.lastActiveDate !== today) {
      const lastDate = new Date(fitnessState.lastActiveDate);
      const currentDate = new Date(today);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays > 1) {
        // Streak broken
        setFitnessState((prev) => ({ ...prev, streak: 0 }));
      }
    }
  }, []);

  // Update streak when an activity is completed
  const registerActivityCompletion = (
    exerciseId: string,
    exerciseName: string,
    count: number,
    unit: 'reps' | 'seconds'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const newLog: FitnessActivityLog = {
      id: 'fit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      exerciseId,
      exerciseName,
      count,
      unit,
      completedAt: Date.now(),
    };

    setFitnessState((prev) => {
      let newStreak = prev.streak;
      if (prev.lastActiveDate !== today) {
        newStreak = prev.streak + 1;
      }
      return {
        ...prev,
        streak: newStreak,
        lastActiveDate: today,
        activityLogs: [newLog, ...prev.activityLogs].slice(0, 100),
      };
    });

    playTaskCompletionSound();
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
    });
  };

  // Find health category ID from user categories or default to first
  const healthCategory = useMemo(() => {
    const found = categories.find(
      (c) =>
        c.id === 'health' ||
        c.name.toLowerCase().includes('santé') ||
        c.name.toLowerCase().includes('sport') ||
        c.name.toLowerCase().includes('bien-être')
    );
    return found || categories[0];
  }, [categories]);

  // Adjust count for an exercise
  const handleSetCount = (exerciseId: string, value: number) => {
    const safeVal = Math.max(1, Math.min(999, value));
    setExerciseCounts((prev) => ({ ...prev, [exerciseId]: safeVal }));
  };

  const handleStepCount = (exerciseId: string, delta: number) => {
    const current = exerciseCounts[exerciseId] || 20;
    handleSetCount(exerciseId, current + delta);
  };

  // Add / Toggle exercise in Routine basket
  const handleToggleRoutineItem = (exercise: Exercise) => {
    const count = exerciseCounts[exercise.id] || exercise.defaultCount;
    setRoutineItems((prev) => {
      const exists = prev.find((item) => item.exercise.id === exercise.id);
      if (exists) {
        return prev.filter((item) => item.exercise.id !== exercise.id);
      } else {
        return [...prev, { exercise, count }];
      }
    });
    playTaskAddSound();
  };

  // Instant action: Validate an exercise directly
  const handleQuickValidateExercise = (exercise: Exercise) => {
    const count = exerciseCounts[exercise.id] || exercise.defaultCount;
    registerActivityCompletion(exercise.id, exercise.name, count, exercise.defaultUnit);
  };

  // Instant action: Add an exercise to board tasks
  const handleAddSingleToBoard = (exercise: Exercise) => {
    const count = exerciseCounts[exercise.id] || exercise.defaultCount;
    const unitLabel = exercise.defaultUnit === 'reps' ? 'répétitions' : 'secondes';
    const taskTitle = `Séance Sport : ${count} ${unitLabel} de ${exercise.name}`;
    const subtasks = [
      `Échauffement & mise en place (2 min)`,
      `Série 1 : ${Math.ceil(count / 2)} ${unitLabel}`,
      `Série 2 : ${Math.floor(count / 2)} ${unitLabel}`,
      `Étirements & retour au calme`,
    ];
    const notes = `Exercice : ${exercise.name}\nCatégorie : ${exercise.category}\nMuscles ciblés : ${exercise.muscles.join(', ')}\nConseil : ${exercise.tips.join(' ')}`;

    onAddTaskToBoard(taskTitle, healthCategory.id, 'today', subtasks, notes);
    playTaskAddSound();
  };

  // Add entire routine basket to board
  const handleAddRoutineToBoard = () => {
    if (routineItems.length === 0) return;
    const countExo = routineItems.length;
    const taskTitle = `Entraînement complet (${countExo} exercice${countExo > 1 ? 's' : ''})`;
    const subtasks = routineItems.map(
      (item) =>
        `${item.exercise.name} : ${item.count} ${item.exercise.defaultUnit === 'reps' ? 'réps' : 'sec'}`
    );
    subtasks.unshift('Échauffement articulaire (3 min)');
    subtasks.push('Étirements de fin de séance (3 min)');

    onAddTaskToBoard(taskTitle, healthCategory.id, 'today', subtasks, 'Séance créée depuis l\'espace Sport');
    playTaskAddSound();
  };

  // Daily Challenge Handlers
  const handleToggleChallengeComplete = (challenge: DailyChallenge) => {
    const isCompleted = fitnessState.completedChallengeIds.includes(challenge.id);
    const today = new Date().toISOString().split('T')[0];

    if (isCompleted) {
      // Uncheck
      setFitnessState((prev) => ({
        ...prev,
        completedChallengeIds: prev.completedChallengeIds.filter((id) => id !== challenge.id),
      }));
    } else {
      // Complete
      setFitnessState((prev) => {
        let newStreak = prev.streak;
        if (prev.lastActiveDate !== today) {
          newStreak = prev.streak + 1;
        }
        return {
          ...prev,
          completedChallengeIds: [...prev.completedChallengeIds, challenge.id],
          streak: newStreak,
          lastActiveDate: today,
          challengeProgress: {
            ...prev.challengeProgress,
            [challenge.id]: challenge.targetCount,
          },
        };
      });

      playTaskCompletionSound();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      });
    }
  };

  const handleStepChallengeProgress = (challenge: DailyChallenge, delta: number) => {
    const current = fitnessState.challengeProgress[challenge.id] || 0;
    const next = Math.max(0, Math.min(challenge.targetCount, current + delta));
    const willBeCompleted = next >= challenge.targetCount;

    setFitnessState((prev) => {
      const isAlreadyCompleted = prev.completedChallengeIds.includes(challenge.id);
      let updatedCompleted = [...prev.completedChallengeIds];
      if (willBeCompleted && !isAlreadyCompleted) {
        updatedCompleted.push(challenge.id);
      } else if (!willBeCompleted && isAlreadyCompleted) {
        updatedCompleted = updatedCompleted.filter((id) => id !== challenge.id);
      }

      return {
        ...prev,
        challengeProgress: {
          ...prev.challengeProgress,
          [challenge.id]: next,
        },
        completedChallengeIds: updatedCompleted,
      };
    });

    if (willBeCompleted) {
      playTaskCompletionSound();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      playTaskAddSound();
    }
  };

  const handleAddAllChallengesToBoard = () => {
    dailyChallenges.forEach((ch) => {
      const taskTitle = `Défi du Jour : ${ch.title}`;
      const subtasks = [
        `Objectif : ${ch.targetCount} ${ch.unit === 'reps' ? 'répétitions' : 'secondes'}`,
        'Partie 1 (Matin)',
        'Partie 2 (Après-midi)',
      ];
      onAddTaskToBoard(taskTitle, healthCategory.id, 'today', subtasks, ch.description);
    });
    playTaskAddSound();
  };

  // Active workout interactive timer logic
  const handleStartWorkout = (items?: SelectedExerciseItem[]) => {
    const list = items && items.length > 0 ? items : routineItems;
    if (list.length === 0) return;

    setRoutineItems(list);
    setWorkoutIndex(0);
    setIsRestPhase(false);
    setIsWorkoutActive(true);

    const first = list[0];
    const duration = first.exercise.defaultUnit === 'seconds' ? first.count : 45;
    setTimerSecondsLeft(duration);
    setTimerTotalDuration(duration);
    setIsTimerRunning(true);
  };

  // Timer Tick effect
  useEffect(() => {
    if (isWorkoutActive && isTimerRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            // Step complete
            playTaskCompletionSound();
            if (!isRestPhase) {
              // Log exercise completion
              const currentItem = routineItems[workoutIndex];
              if (currentItem) {
                registerActivityCompletion(
                  currentItem.exercise.id,
                  currentItem.exercise.name,
                  currentItem.count,
                  currentItem.exercise.defaultUnit
                );
              }

              // Check if next exercise exists
              if (workoutIndex < routineItems.length - 1) {
                // Enter 15s rest phase
                setIsRestPhase(true);
                setTimerTotalDuration(15);
                return 15;
              } else {
                // Workout Finished!
                setIsWorkoutActive(false);
                setIsTimerRunning(false);
                confetti({
                  particleCount: 100,
                  spread: 80,
                  origin: { y: 0.5 },
                });
                return 0;
              }
            } else {
              // Finish rest, advance to next exercise
              setIsRestPhase(false);
              setWorkoutIndex((curr) => {
                const nextIdx = curr + 1;
                const nextItem = routineItems[nextIdx];
                const dur = nextItem ? (nextItem.exercise.defaultUnit === 'seconds' ? nextItem.count : 45) : 30;
                setTimerTotalDuration(dur);
                setTimerSecondsLeft(dur);
                return nextIdx;
              });
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isWorkoutActive, isTimerRunning, isRestPhase, workoutIndex, routineItems]);

  const handleNextWorkoutExercise = () => {
    if (workoutIndex < routineItems.length - 1) {
      const nextIdx = workoutIndex + 1;
      setWorkoutIndex(nextIdx);
      setIsRestPhase(false);
      const nextItem = routineItems[nextIdx];
      const dur = nextItem.exercise.defaultUnit === 'seconds' ? nextItem.count : 45;
      setTimerTotalDuration(dur);
      setTimerSecondsLeft(dur);
    } else {
      setIsWorkoutActive(false);
      setIsTimerRunning(false);
      confetti({ particleCount: 80, spread: 70 });
    }
  };

  // Filtered exercises list
  const filteredExercises = useMemo(() => {
    return EXERCISES_CATALOG.filter((ex) => {
      const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.description.toLowerCase().includes(q) ||
        ex.muscles.some((m) => m.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Summary stats
  const totalCompletedChallenges = fitnessState.completedChallengeIds.length;
  const todayLogs = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return fitnessState.activityLogs.filter((l) => l.completedAt >= startOfToday.getTime());
  }, [fitnessState.activityLogs]);

  return (
    <div className="fitness-page-layout font-sans">
      {/* Top Navigation Bar */}
      <header className="fitness-header">
        <div className="fitness-header-container">
          <div className="fitness-header-left">
            <button
              type="button"
              className="btn-back-board font-sans"
              onClick={onBackToBoard}
              title="Retourner au tableau d'organisation"
            >
              <ArrowLeft size={16} />
              <span>Tableau</span>
            </button>
            <div className="fitness-brand">
              <div className="fitness-brand-badge">
                <Dumbbell size={16} className="text-blue-600" />
              </div>
              <div>
                <h1 className="fitness-main-title font-alamain">Sport & Exercices</h1>
                <p className="fitness-subtitle">
                  Sélectionnez vos exercices, réglez vos répétitions et validez vos défis
                </p>
              </div>
            </div>
          </div>

          <div className="fitness-header-right">
            {/* Streak Counter Pill */}
            <div
              className={`fitness-streak-pill ${fitnessState.streak > 0 ? 'is-active' : ''}`}
              title={`${fitnessState.streak} jour(s) consécutif(s)`}
            >
              <Flame size={16} className={fitnessState.streak > 0 ? 'text-amber-500' : 'text-slate-400'} />
              <span>
                {fitnessState.streak > 0
                  ? `Série : ${fitnessState.streak} j`
                  : 'Série : 0 j'}
              </span>
            </div>

            {/* Quick Stats Pill */}
            <div className="fitness-stats-pill" title="Exercices validés aujourd'hui">
              <Trophy size={15} className="text-emerald-500" />
              <span>
                {todayLogs.length} fait{todayLogs.length > 1 ? 's' : ''} auj.
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="fitness-tabs-wrapper">
          <div className="fitness-tabs-container">
            <button
              type="button"
              className={`fitness-tab-btn ${activeTab === 'catalog' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <Dumbbell size={15} />
              <span>Exercices</span>
              <span className="tab-count">{EXERCISES_CATALOG.length}</span>
            </button>

            <button
              type="button"
              className={`fitness-tab-btn ${activeTab === 'challenges' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('challenges')}
            >
              <Flame size={15} />
              <span>Défis</span>
              <span className="tab-count">
                {totalCompletedChallenges}/{dailyChallenges.length}
              </span>
            </button>

            <button
              type="button"
              className={`fitness-tab-btn ${activeTab === 'workout' ? 'is-active' : ''}`}
              onClick={() => {
                if (routineItems.length === 0) {
                  const defaultList: SelectedExerciseItem[] = [
                    { exercise: EXERCISES_CATALOG[0], count: 30 },
                    { exercise: EXERCISES_CATALOG[5], count: 15 },
                    { exercise: EXERCISES_CATALOG[10], count: 45 },
                  ];
                  setRoutineItems(defaultList);
                }
                setActiveTab('workout');
              }}
            >
              <Timer size={15} />
              <span>Séance & Chrono</span>
              {routineItems.length > 0 && <span className="tab-count">{routineItems.length}</span>}
            </button>

            <button
              type="button"
              className={`fitness-tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <TrendingUp size={15} />
              <span>Historique</span>
              {fitnessState.activityLogs.length > 0 && (
                <span className="tab-count">{fitnessState.activityLogs.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="fitness-main-content">
        {/* ==================== TAB 1: CATALOGUE & SELECTION ==================== */}
        {activeTab === 'catalog' && (
          <div className="fitness-catalog-view">
            {/* Filters and Search Bar */}
            <div className="fitness-filters-bar">
              <div className="fitness-search-box">
                <Search size={15} className="fitness-search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher un exercice, muscle (pompes, abdos, squats...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="fitness-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="fitness-search-clear"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="fitness-category-pills">
                <button
                  type="button"
                  className={`category-pill-btn ${selectedCategory === 'all' ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  Tous ({EXERCISES_CATALOG.length})
                </button>
                {EXERCISE_CATEGORIES.map((cat) => {
                  const count = EXERCISES_CATALOG.filter((ex) => ex.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-pill-btn ${selectedCategory === cat.id ? 'is-active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{
                        borderColor: selectedCategory === cat.id ? cat.color : undefined,
                        color: selectedCategory === cat.id ? cat.color : undefined,
                        backgroundColor: selectedCategory === cat.id ? cat.bgColor : undefined,
                      }}
                    >
                      <span>{cat.name}</span>
                      <span className="cat-badge-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise Grid */}
            <div className="fitness-exercise-grid">
              {filteredExercises.map((exercise) => {
                const count = exerciseCounts[exercise.id] || exercise.defaultCount;
                const isSelectedInRoutine = routineItems.some((r) => r.exercise.id === exercise.id);
                const isReps = exercise.defaultUnit === 'reps';
                const unitShort = isReps ? 'réps' : 'sec';
                const approxKcal = Math.round(count * exercise.caloriesPerUnitApprox);

                return (
                  <div
                    key={exercise.id}
                    className={`exercise-card ${isSelectedInRoutine ? 'is-in-routine' : ''}`}
                  >
                    {/* Card Top: Illustration & Badges */}
                    <div className="exercise-card-header">
                      <div className="exercise-card-visual">
                        <ExerciseIllustration exerciseId={exercise.illustrationKey} size={110} />
                      </div>

                      <div className="exercise-card-meta">
                        <div className="exercise-category-tag">
                          <span className="cat-dot" />
                          <span>
                            {EXERCISE_CATEGORIES.find((c) => c.id === exercise.category)?.name ||
                              exercise.category}
                          </span>
                        </div>
                        <h3 className="exercise-card-title font-alamain">{exercise.name}</h3>
                        <p className="exercise-card-desc">{exercise.description}</p>
                      </div>
                    </div>

                    {/* Muscle Tags */}
                    <div className="exercise-muscles-tags">
                      {exercise.muscles.map((muscle) => (
                        <span key={muscle} className="muscle-pill">
                          {muscle}
                        </span>
                      ))}
                    </div>

                    {/* Reps / Seconds Quantity Configurator (Core User Request) */}
                    <div className="exercise-counter-section">
                      <div className="counter-label-row">
                        <span className="counter-label">
                          {isReps ? 'Nombre de répétitions :' : 'Durée souhaitée :'}
                        </span>
                        <span className="counter-calories-tag">~{approxKcal} kcal</span>
                      </div>

                      <div className="counter-stepper-row">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleStepCount(exercise.id, isReps ? -5 : -10)}
                          title="Diminuer"
                        >
                          <Minus size={15} />
                        </button>

                        <div className="stepper-value-display font-alamain">
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={count}
                            onChange={(e) => handleSetCount(exercise.id, parseInt(e.target.value) || 1)}
                            className="stepper-input"
                          />
                          <span className="stepper-unit">{unitShort}</span>
                        </div>

                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleStepCount(exercise.id, isReps ? +5 : +10)}
                          title="Augmenter"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      {/* Quick Presets Chips */}
                      <div className="counter-presets-row">
                        {exercise.presetCounts.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`preset-chip ${count === preset ? 'is-selected' : ''}`}
                            onClick={() => handleSetCount(exercise.id, preset)}
                          >
                            {preset}
                            {unitShort}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="exercise-card-actions">
                      {/* 1. Quick Validate */}
                      <button
                        type="button"
                        className="btn-exercise-validate"
                        onClick={() => handleQuickValidateExercise(exercise)}
                        title="Marquer comme effectué maintenant"
                      >
                        <CheckCircle2 size={15} />
                        <span>Fait !</span>
                      </button>

                      {/* 2. Add to Board */}
                      <button
                        type="button"
                        className="btn-exercise-board"
                        onClick={() => handleAddSingleToBoard(exercise)}
                        title="Créer une tâche sur le tableau d'organisation"
                      >
                        <ListPlus size={15} />
                        <span>Au tableau</span>
                      </button>

                      {/* 3. Add / Remove to Routine Basket */}
                      <button
                        type="button"
                        className={`btn-exercise-routine ${isSelectedInRoutine ? 'is-active' : ''}`}
                        onClick={() => handleToggleRoutineItem(exercise)}
                        title={
                          isSelectedInRoutine
                            ? 'Retirer de la séance'
                            : 'Ajouter à la séance guidée'
                        }
                      >
                        {isSelectedInRoutine ? <Check size={15} /> : <Play size={14} />}
                        <span>{isSelectedInRoutine ? 'Sélectionné' : '+ Séance'}</span>
                      </button>

                      {/* 4. Tips Modal Trigger */}
                      <button
                        type="button"
                        className="btn-exercise-info"
                        onClick={() => setViewingExercise(exercise)}
                        title="Voir les conseils d'exécution"
                      >
                        <Info size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: DEFIS QUOTIDIENS ==================== */}
        {activeTab === 'challenges' && (
          <div className="fitness-challenges-view">
            {/* Daily Header Banner */}
            <div className="challenges-banner">
              <div className="challenges-banner-content">
                <div className="banner-badge">
                  <Flame size={18} className="text-amber-500" />
                  <span>Défis du {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <h2 className="banner-title font-alamain">Défis Quotidiens</h2>
                <p className="banner-desc">
                  Cumulez vos répétitions au fil de la journée pour faire progresser votre série.
                </p>
              </div>

              <div className="challenges-banner-actions">
                <button
                  type="button"
                  className="btn-banner-action font-sans"
                  onClick={handleAddAllChallengesToBoard}
                  title="Planifier tous les défis du jour dans vos tâches"
                >
                  <ListPlus size={16} />
                  <span>Planifier sur le Tableau</span>
                </button>
              </div>
            </div>

            {/* Challenges List */}
            <div className="challenges-grid">
              {dailyChallenges.map((challenge) => {
                const isCompleted = fitnessState.completedChallengeIds.includes(challenge.id);
                const progress = fitnessState.challengeProgress[challenge.id] || 0;
                const percent = Math.min(100, Math.round((progress / challenge.targetCount) * 100));
                const exercise = EXERCISES_CATALOG.find((e) => e.id === challenge.exerciseId);
                const unitLabel = challenge.unit === 'reps' ? 'répétitions' : 'secondes';

                return (
                  <div
                    key={challenge.id}
                    className={`challenge-card ${isCompleted ? 'is-completed' : ''}`}
                  >
                    <div className="challenge-card-top">
                      <div className="challenge-visual">
                        {exercise && (
                          <ExerciseIllustration exerciseId={exercise.illustrationKey} size={90} />
                        )}
                      </div>

                      <div className="challenge-info">
                        <div className="challenge-badge-row">
                          <span className="badge-reward">
                            <Trophy size={13} />
                            <span>+{challenge.points} pts</span>
                          </span>
                          <span className="badge-name">{challenge.badgeLabel}</span>
                        </div>
                        <h3 className="challenge-title font-alamain">{challenge.title}</h3>
                        <p className="challenge-desc">{challenge.description}</p>
                      </div>

                      {/* Checkbox */}
                      <button
                        type="button"
                        className={`challenge-toggle-btn ${isCompleted ? 'is-done' : ''}`}
                        onClick={() => handleToggleChallengeComplete(challenge)}
                        title={isCompleted ? 'Marquer comme non terminé' : 'Valider le défi'}
                      >
                        {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </button>
                    </div>

                    {/* Progress Bar & Steppers */}
                    <div className="challenge-progress-section">
                      <div className="progress-text-row">
                        <span className="progress-current">
                          Progression : <strong>{progress}</strong> / {challenge.targetCount} {unitLabel}
                        </span>
                        <span className="progress-percent">{percent}%</span>
                      </div>

                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Incremental Steppers */}
                      <div className="challenge-steppers-row">
                        <span className="stepper-quick-label">Ajouter :</span>
                        <button
                          type="button"
                          className="btn-quick-add"
                          onClick={() => handleStepChallengeProgress(challenge, challenge.unit === 'reps' ? 10 : 30)}
                        >
                          +{challenge.unit === 'reps' ? '10 réps' : '30 sec'}
                        </button>
                        <button
                          type="button"
                          className="btn-quick-add"
                          onClick={() => handleStepChallengeProgress(challenge, challenge.unit === 'reps' ? 25 : 60)}
                        >
                          +{challenge.unit === 'reps' ? '25 réps' : '60 sec'}
                        </button>
                        <button
                          type="button"
                          className="btn-quick-add-full"
                          onClick={() => handleToggleChallengeComplete(challenge)}
                        >
                          {isCompleted ? 'Réinitialiser' : 'Tout valider'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: SEANCE GUIDEE & CHRONO ==================== */}
        {activeTab === 'workout' && (
          <div className="fitness-workout-builder-view">
            <div className="workout-builder-header">
              <div>
                <h2 className="builder-title font-alamain">Séance Personnalisée</h2>
                <p className="builder-desc">
                  Lancez le chrono guidé ou planifiez la séance sur votre tableau.
                </p>
              </div>

              <div className="builder-header-actions">
                <button
                  type="button"
                  className="btn-routine-action font-sans"
                  onClick={handleAddRoutineToBoard}
                  disabled={routineItems.length === 0}
                  title="Ajouter toute la séance comme tâche sur le tableau"
                >
                  <ListPlus size={16} />
                  <span>Au Tableau</span>
                </button>

                <button
                  type="button"
                  className="btn-routine-start font-sans"
                  onClick={() => handleStartWorkout()}
                  disabled={routineItems.length === 0}
                >
                  <Play size={16} />
                  <span>Démarrer ({routineItems.length})</span>
                </button>
              </div>
            </div>

            {/* Routine Exercise List */}
            {routineItems.length === 0 ? (
              <div className="routine-empty-state">
                <Dumbbell size={40} className="text-slate-300" />
                <h4 className="empty-title font-alamain">Aucun exercice sélectionné</h4>
                <p className="empty-desc">
                  Rendez-vous dans l'onglet « Catalogue » et cliquez sur « + Séance » pour composer votre routine sur mesure.
                </p>
                <button
                  type="button"
                  className="btn-empty-go-catalog"
                  onClick={() => setActiveTab('catalog')}
                >
                  Explorer le catalogue
                </button>
              </div>
            ) : (
              <div className="routine-items-list">
                {routineItems.map((item, index) => {
                  const isReps = item.exercise.defaultUnit === 'reps';
                  return (
                    <div key={item.exercise.id} className="routine-item-row">
                      <div className="routine-item-order">{index + 1}</div>

                      <div className="routine-item-visual">
                        <ExerciseIllustration exerciseId={item.exercise.illustrationKey} size={70} />
                      </div>

                      <div className="routine-item-details">
                        <h4 className="routine-item-name font-alamain">{item.exercise.name}</h4>
                        <span className="routine-item-category">
                          {EXERCISE_CATEGORIES.find((c) => c.id === item.exercise.category)?.name}
                        </span>
                      </div>

                      <div className="routine-item-stepper">
                        <button
                          type="button"
                          className="stepper-mini-btn"
                          onClick={() => {
                            setRoutineItems((prev) =>
                              prev.map((r, i) =>
                                i === index
                                  ? { ...r, count: Math.max(1, r.count - (isReps ? 5 : 10)) }
                                  : r
                              )
                            );
                          }}
                        >
                          <Minus size={13} />
                        </button>

                        <span className="routine-item-count font-alamain">
                          {item.count} {isReps ? 'réps' : 'sec'}
                        </span>

                        <button
                          type="button"
                          className="stepper-mini-btn"
                          onClick={() => {
                            setRoutineItems((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, count: r.count + (isReps ? 5 : 10) } : r
                              )
                            );
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn-routine-remove"
                        onClick={() => {
                          setRoutineItems((prev) => prev.filter((_, i) => i !== index));
                        }}
                        title="Retirer de la routine"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: HISTORIQUE & STATS ==================== */}
        {activeTab === 'history' && (
          <div className="fitness-history-view">
            <div className="history-stats-cards">
              <div className="stat-card">
                <div className="stat-icon-wrapper text-amber-600 bg-amber-50">
                  <Flame size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Série Active</span>
                  <span className="stat-value font-alamain">
                    {fitnessState.streak} jour{fitnessState.streak > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper text-emerald-600 bg-emerald-50">
                  <Trophy size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Exercices Validés</span>
                  <span className="stat-value font-alamain">
                    {fitnessState.activityLogs.length} au total
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper text-blue-600 bg-blue-50">
                  <Zap size={20} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Aujourd'hui</span>
                  <span className="stat-value font-alamain">
                    {todayLogs.length} série{todayLogs.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Logs List */}
            <div className="history-logs-section">
              <h3 className="history-section-title font-alamain">Dernières activités enregistrées</h3>
              {fitnessState.activityLogs.length === 0 ? (
                <p className="history-empty">Aucune activité enregistrée pour le moment. Validez un exercice ou relevez un défi !</p>
              ) : (
                <div className="history-logs-list">
                  {fitnessState.activityLogs.map((log) => (
                    <div key={log.id} className="history-log-item">
                      <div className="log-check-icon">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                      <div className="log-content">
                        <span className="log-exercise-name font-alamain">{log.exerciseName}</span>
                        <span className="log-count">
                          {log.count} {log.unit === 'reps' ? 'répétitions' : 'secondes'}
                        </span>
                      </div>
                      <span className="log-time">
                        {new Date(log.completedAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Routine Drawer (when exercises are selected) */}
      {routineItems.length > 0 && activeTab === 'catalog' && (
        <aside className="floating-routine-bar">
          <div className="routine-bar-left">
            <div className="routine-count-badge">{routineItems.length}</div>
            <div className="routine-summary-text">
              <span className="summary-title font-alamain">Séance personnalisée</span>
              <span className="summary-sub">
                {routineItems.map((r) => `${r.exercise.name} (${r.count})`).join(' • ')}
              </span>
            </div>
          </div>

          <div className="routine-bar-actions">
            <button
              type="button"
              className="btn-routine-drawer-board"
              onClick={handleAddRoutineToBoard}
              title="Ajouter toute la séance comme tâche sur le tableau"
            >
              <ListPlus size={15} />
              <span>Au Tableau</span>
            </button>

            <button
              type="button"
              className="btn-routine-drawer-start font-sans"
              onClick={() => handleStartWorkout()}
            >
              <Play size={15} />
              <span>Lancer ({routineItems.length})</span>
            </button>

            <button
              type="button"
              className="btn-routine-drawer-clear"
              onClick={() => setRoutineItems([])}
              title="Vider la sélection"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}

      {/* Interactive Workout Modal / Overlay */}
      {isWorkoutActive && (
        <div className="workout-overlay-backdrop">
          <div className="workout-modal-container">
            {/* Modal Header */}
            <div className="workout-modal-header">
              <div className="workout-progress-indicator">
                Exercice {workoutIndex + 1} sur {routineItems.length}
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => {
                  setIsWorkoutActive(false);
                  setIsTimerRunning(false);
                }}
                title="Quitter la séance"
              >
                <X size={18} />
              </button>
            </div>

            {/* Phase Display (Rest or Workout) */}
            <div className="workout-modal-body">
              {isRestPhase ? (
                <div className="workout-rest-state">
                  <span className="rest-badge">Temps de Récupération</span>
                  <div className="timer-circle-display">
                    <span className="timer-seconds font-alamain">{timerSecondsLeft}s</span>
                  </div>
                  <p className="rest-next-preview">
                    Prochain exercice :{' '}
                    <strong>{routineItems[workoutIndex + 1]?.exercise.name}</strong> (
                    {routineItems[workoutIndex + 1]?.count}{' '}
                    {routineItems[workoutIndex + 1]?.exercise.defaultUnit === 'reps' ? 'réps' : 'sec'})
                  </p>
                </div>
              ) : (
                <div className="workout-active-state">
                  <div className="workout-large-visual">
                    <ExerciseIllustration
                      exerciseId={routineItems[workoutIndex]?.exercise.illustrationKey || ''}
                      size={180}
                    />
                  </div>

                  <h2 className="workout-exercise-title font-alamain">
                    {routineItems[workoutIndex]?.exercise.name}
                  </h2>

                  <div className="workout-target-pill font-alamain">
                    {routineItems[workoutIndex]?.count}{' '}
                    {routineItems[workoutIndex]?.exercise.defaultUnit === 'reps' ? 'Répétitions' : 'Secondes'}
                  </div>

                  {/* Countdown Timer Display */}
                  <div className="timer-countdown-bar">
                    <div className="timer-clock-text font-alamain">
                      {timerSecondsLeft}s restant
                    </div>
                    <div className="timer-bar-track">
                      <div
                        className="timer-bar-fill"
                        style={{
                          width: `${((timerTotalDuration - timerSecondsLeft) / (timerTotalDuration || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tips list */}
                  <div className="workout-tips-box">
                    <span className="tips-title">Conseil de posture :</span>
                    <p className="tips-text">
                      {routineItems[workoutIndex]?.exercise.tips[0] ||
                        'Gardez le corps gainé et respirez régulièrement.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Controls */}
            <div className="workout-modal-footer">
              <button
                type="button"
                className="btn-workout-pause"
                onClick={() => setIsTimerRunning((prev) => !prev)}
              >
                {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
                <span>{isTimerRunning ? 'Pause' : 'Reprendre'}</span>
              </button>

              <button
                type="button"
                className="btn-workout-next"
                onClick={handleNextWorkoutExercise}
              >
                <span>Exercice Suivant</span>
                <Check size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Tips Details Modal */}
      {viewingExercise && (
        <div className="tips-modal-backdrop" onClick={() => setViewingExercise(null)}>
          <div className="tips-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="tips-modal-header">
              <h3 className="tips-modal-title font-alamain">{viewingExercise.name}</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setViewingExercise(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="tips-modal-body">
              <div className="tips-visual-center">
                <ExerciseIllustration exerciseId={viewingExercise.illustrationKey} size={140} />
              </div>

              <div className="tips-section">
                <h4 className="tips-heading">Description</h4>
                <p className="tips-p">{viewingExercise.description}</p>
              </div>

              <div className="tips-section">
                <h4 className="tips-heading">Conseils d'exécution & posture</h4>
                <ul className="tips-ul">
                  {viewingExercise.tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="tips-section">
                <h4 className="tips-heading">Muscles sollicités</h4>
                <div className="tips-muscles-grid">
                  {viewingExercise.muscles.map((m) => (
                    <span key={m} className="muscle-pill">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="tips-modal-footer">
              <button
                type="button"
                className="btn-tips-close"
                onClick={() => setViewingExercise(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitnessPage;

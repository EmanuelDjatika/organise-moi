import React, { useState, useMemo } from 'react';
import {
  Dumbbell,
  Flame,
  Trophy,
  Check,
  CheckCircle2,
  Plus,
  Minus,
  X,
  Sun,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Category, Task, DailyChallenge, Exercise } from '../types';
import {
  EXERCISES_CATALOG,
  getDailyChallengesForDate,
} from '../constants/exerciseCatalog';
import { ExerciseIllustration } from './ExerciseIllustration';
import { getTodayDateStr, isTaskOnDate } from '../utils/dateUtils';
import { playTaskAddSound } from '../utils/soundUtils';

export interface TaskToAdd {
  title: string;
  categoryId: string;
  subtasks?: string[];
  notes?: string;
}

interface TodaySportExercisesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingTasks: Task[];
  onAddTasks: (tasks: TaskToAdd[]) => void;
  onGoToFitnessPage?: () => void;
}

// Popular essential exercises to highlight in the quick picker
const POPULAR_EXERCISE_IDS = [
  'pushups-standard',
  'squats-bodyweight',
  'plank-standard',
  'crunches',
  'jumping-jacks',
  'lunges',
  'burpees',
  'cobra-stretch',
];

export const TodaySportExercisesModal: React.FC<TodaySportExercisesModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingTasks,
  onAddTasks,
  onGoToFitnessPage,
}) => {
  const [activeTab, setActiveTab] = useState<'challenges' | 'exercises'>('challenges');

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const dailyChallenges = useMemo(() => getDailyChallengesForDate(todayStr), [todayStr]);

  // Find dedicated sport category or fallback to health/first
  const sportCategory = useMemo(() => {
    const found = categories.find(
      (c) =>
        c.id === 'sport' ||
        c.name.toLowerCase().includes('sport') ||
        c.name.toLowerCase().includes('défis') ||
        c.id === 'health' ||
        c.name.toLowerCase().includes('santé') ||
        c.name.toLowerCase().includes('bien-être')
    );
    return found || categories[0];
  }, [categories]);

  // Check which challenges are already in today's tasks
  const isChallengeAdded = (challenge: DailyChallenge) => {
    const title = `Défi du Jour : ${challenge.title}`;
    return existingTasks.some(
      (t) => isTaskOnDate(t, todayStr, todayStr) && t.title.toLowerCase() === title.toLowerCase()
    );
  };

  // Check which catalog exercises are already in today's tasks
  const isExerciseAdded = (exercise: Exercise) => {
    return existingTasks.some(
      (t) =>
        isTaskOnDate(t, todayStr, todayStr) &&
        t.title.toLowerCase().includes(exercise.name.toLowerCase())
    );
  };

  // State for selected challenge IDs
  const [selectedChallengeIds, setSelectedChallengeIds] = useState<string[]>(() => {
    return dailyChallenges
      .filter((ch) => !isChallengeAdded(ch))
      .map((ch) => ch.id);
  });

  // State for configurable counts for popular exercises
  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    POPULAR_EXERCISE_IDS.forEach((id) => {
      const ex = EXERCISES_CATALOG.find((e) => e.id === id);
      if (ex) map[ex.id] = ex.defaultCount;
    });
    return map;
  });

  // State for selected exercise IDs
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleStepCount = (exerciseId: string, delta: number) => {
    setExerciseCounts((prev) => {
      const current = prev[exerciseId] || 20;
      const next = Math.max(1, Math.min(999, current + delta));
      return { ...prev, [exerciseId]: next };
    });
  };

  const handleToggleChallenge = (challengeId: string) => {
    setSelectedChallengeIds((prev) =>
      prev.includes(challengeId) ? prev.filter((id) => id !== challengeId) : [...prev, challengeId]
    );
  };

  const handleToggleExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleSelectAllChallenges = () => {
    const notYetAdded = dailyChallenges
      .filter((ch) => !isChallengeAdded(ch))
      .map((ch) => ch.id);
    setSelectedChallengeIds(notYetAdded);
  };

  const handleDeselectAllChallenges = () => {
    setSelectedChallengeIds([]);
  };

  // Submit and add selected items to today's schedule
  const handleConfirmAdd = () => {
    const tasksToAdd: TaskToAdd[] = [];

    // 1. Add selected challenges
    selectedChallengeIds.forEach((chId) => {
      const ch = dailyChallenges.find((c) => c.id === chId);
      if (!ch) return;

      const unitLabel = ch.unit === 'reps' ? 'répétitions' : 'secondes';
      tasksToAdd.push({
        title: `Défi du Jour : ${ch.title}`,
        categoryId: sportCategory.id,
        subtasks: [
          `Objectif : ${ch.targetCount} ${unitLabel}`,
          `Série Matin (${Math.ceil(ch.targetCount / 2)} ${unitLabel})`,
          `Série Après-midi (${Math.floor(ch.targetCount / 2)} ${unitLabel})`,
        ],
        notes: `${ch.description}\nRécompense : +${ch.points} pts (${ch.badgeLabel})\nCréé depuis l'espace Sport & Défis`,
      });
    });

    // 2. Add selected individual exercises
    selectedExerciseIds.forEach((exId) => {
      const ex = EXERCISES_CATALOG.find((e) => e.id === exId);
      if (!ex) return;

      const count = exerciseCounts[ex.id] || ex.defaultCount;
      const unitLabel = ex.defaultUnit === 'reps' ? 'répétitions' : 'secondes';
      tasksToAdd.push({
        title: `Séance Sport : ${count} ${unitLabel} de ${ex.name}`,
        categoryId: sportCategory.id,
        subtasks: [
          'Échauffement articulaire (2 min)',
          `Série 1 : ${Math.ceil(count / 2)} ${unitLabel}`,
          `Série 2 : ${Math.floor(count / 2)} ${unitLabel}`,
          'Étirements & récupération',
        ],
        notes: `Exercice : ${ex.name}\nCatégorie : ${ex.category}\nMuscles ciblés : ${ex.muscles.join(', ')}\nConseil : ${ex.tips.join(' ')}`,
      });
    });

    if (tasksToAdd.length === 0) return;

    onAddTasks(tasksToAdd);
    playTaskAddSound();

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ea580c', '#f59e0b', '#10b981', '#3b82f6'],
    });

    onClose();
  };

  const totalSelectedCount = selectedChallengeIds.length + selectedExerciseIds.length;
  const alreadyAddedChallengesCount = dailyChallenges.filter(isChallengeAdded).length;

  return (
    <div className="modal-backdrop-minimal" onClick={onClose}>
      <div
        className="today-sport-modal-container font-sans"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="today-sport-modal-header">
          <div className="today-sport-header-brand">
            <div className="today-sport-icon-pill">
              <Dumbbell size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="today-sport-tag-row">
                <span className="today-sport-badge font-alamain">
                  <Sun size={12} className="inline mr-1 text-amber-500" />
                  Ma Journée
                </span>
                <span className="today-sport-date-badge">
                  {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
              <h2 className="today-sport-title font-alamain">Sport & Défis de la Journée</h2>
              <p className="today-sport-subtitle font-sans">
                Sélectionnez vos exercices et défis quotidiens pour les afficher directement dans Ma Journée.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="today-sport-close-btn"
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="today-sport-tabs-bar">
          <button
            type="button"
            className={`today-sport-tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            <Flame size={15} />
            <span>Défis du Jour</span>
            <span className="sport-tab-count">
              {dailyChallenges.length}
            </span>
          </button>

          <button
            type="button"
            className={`today-sport-tab-btn ${activeTab === 'exercises' ? 'active' : ''}`}
            onClick={() => setActiveTab('exercises')}
          >
            <Dumbbell size={15} />
            <span>Exercices Populaires</span>
            <span className="sport-tab-count">
              {POPULAR_EXERCISE_IDS.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="today-sport-modal-body">
          {/* ================= TAB 1: DEFIS DU JOUR ================= */}
          {activeTab === 'challenges' && (
            <div className="today-sport-challenges-view">
              <div className="today-sport-section-intro">
                <div className="intro-text">
                  <span className="intro-title font-alamain">
                    Les 3 défis recommandés aujourd'hui
                  </span>
                  <span className="intro-desc">
                    Générés chaque matin pour stimuler votre endurance et votre renforcement.
                  </span>
                </div>
                <div className="intro-actions">
                  <button
                    type="button"
                    className="btn-select-all-challenges font-alamain"
                    onClick={
                      selectedChallengeIds.length === dailyChallenges.length - alreadyAddedChallengesCount
                        ? handleDeselectAllChallenges
                        : handleSelectAllChallenges
                    }
                  >
                    <Sparkles size={13} className="text-amber-500 mr-1" />
                    <span>
                      {selectedChallengeIds.length > 0 ? 'Désélectionner' : 'Tout cocher'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="today-sport-challenges-list">
                {dailyChallenges.map((ch) => {
                  const isAdded = isChallengeAdded(ch);
                  const isSelected = selectedChallengeIds.includes(ch.id);
                  const exercise = EXERCISES_CATALOG.find((e) => e.id === ch.exerciseId);
                  const unitLabel = ch.unit === 'reps' ? 'répétitions' : 'secondes';

                  return (
                    <div
                      key={ch.id}
                      className={`today-sport-challenge-card ${isSelected ? 'is-selected' : ''} ${isAdded ? 'is-already-added' : ''}`}
                      onClick={() => !isAdded && handleToggleChallenge(ch.id)}
                    >
                      <div className="challenge-card-left">
                        {exercise && (
                          <div className="challenge-thumb">
                            <ExerciseIllustration exerciseId={exercise.illustrationKey} size={70} />
                          </div>
                        )}

                        <div className="challenge-details">
                          <div className="challenge-meta-row">
                            <span className="challenge-reward-badge">
                              <Trophy size={11} className="inline mr-1 text-amber-600" />
                              +{ch.points} pts
                            </span>
                            <span className="challenge-pill-badge">{ch.badgeLabel}</span>
                            {isAdded && (
                              <span className="challenge-added-badge font-alamain">
                                <Check size={11} className="inline mr-1" />
                                Déjà dans Ma Journée
                              </span>
                            )}
                          </div>
                          <h4 className="challenge-name font-alamain">{ch.title}</h4>
                          <p className="challenge-description">{ch.description}</p>
                          <div className="challenge-target font-alamain">
                            Objectif : <strong>{ch.targetCount}</strong> {unitLabel}
                          </div>
                        </div>
                      </div>

                      <div className="challenge-card-right">
                        {isAdded ? (
                          <div className="challenge-done-icon" title="Déjà dans Ma Journée">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={`challenge-checkbox-btn ${isSelected ? 'checked' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleChallenge(ch.id);
                            }}
                            aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                          >
                            {isSelected && <Check size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 2: EXERCICES A LA CARTE ================= */}
          {activeTab === 'exercises' && (
            <div className="today-sport-exercises-view">
              <div className="today-sport-section-intro">
                <div className="intro-text">
                  <span className="intro-title font-alamain">
                    Exercices essentiels & personnalisables
                  </span>
                  <span className="intro-desc">
                    Réglez le volume souhaité et ajoutez-les à vos priorités du jour.
                  </span>
                </div>
              </div>

              <div className="today-sport-exercises-grid">
                {POPULAR_EXERCISE_IDS.map((id) => {
                  const ex = EXERCISES_CATALOG.find((e) => e.id === id);
                  if (!ex) return null;

                  const isAdded = isExerciseAdded(ex);
                  const isSelected = selectedExerciseIds.includes(ex.id);
                  const count = exerciseCounts[ex.id] || ex.defaultCount;
                  const isReps = ex.defaultUnit === 'reps';
                  const unitLabel = isReps ? 'réps' : 'sec';

                  return (
                    <div
                      key={ex.id}
                      className={`today-sport-exo-item ${isSelected ? 'is-selected' : ''} ${isAdded ? 'is-already-added' : ''}`}
                    >
                      <div className="exo-item-top">
                        <div className="exo-thumb">
                          <ExerciseIllustration exerciseId={ex.illustrationKey} size={55} />
                        </div>
                        <div className="exo-info">
                          <h4 className="exo-title font-alamain">{ex.name}</h4>
                          <span className="exo-muscles">{ex.muscles.slice(0, 2).join(' • ')}</span>
                          {isAdded && (
                            <span className="challenge-added-badge font-alamain mt-1">
                              <Check size={10} className="inline mr-1" />
                              Programmé
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stepper Count */}
                      <div className="exo-stepper-row">
                        <div className="exo-counter font-alamain">
                          <button
                            type="button"
                            className="exo-step-btn"
                            onClick={() => handleStepCount(ex.id, isReps ? -5 : -10)}
                            title="Diminuer"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="exo-count-val">
                            {count} {unitLabel}
                          </span>
                          <button
                            type="button"
                            className="exo-step-btn"
                            onClick={() => handleStepCount(ex.id, isReps ? +5 : +10)}
                            title="Augmenter"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className={`exo-toggle-btn ${isSelected ? 'selected' : ''} ${isAdded ? 'disabled' : ''}`}
                          onClick={() => !isAdded && handleToggleExercise(ex.id)}
                          disabled={isAdded}
                        >
                          {isSelected ? (
                            <>
                              <Check size={13} className="mr-1" />
                              <span>Sélectionné</span>
                            </>
                          ) : isAdded ? (
                            <span>Dans Ma Journée</span>
                          ) : (
                            <>
                              <Plus size={13} className="mr-1" />
                              <span>Ajouter</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="today-sport-modal-footer">
          <div className="footer-left">
            {onGoToFitnessPage && (
              <button
                type="button"
                className="btn-link-fitness font-alamain"
                onClick={() => {
                  onClose();
                  onGoToFitnessPage();
                }}
              >
                <span>Ouvrir l'Espace Sport complet</span>
                <ArrowRight size={13} className="ml-1" />
              </button>
            )}
          </div>

          <div className="footer-right">
            <button
              type="button"
              className="btn-cancel-sport-modal font-alamain"
              onClick={onClose}
            >
              Fermer
            </button>

            <button
              type="button"
              className="btn-submit-sport-modal font-alamain"
              onClick={handleConfirmAdd}
              disabled={totalSelectedCount === 0}
            >
              <Sun size={15} className="mr-1.5" />
              <span>
                {totalSelectedCount > 0
                  ? `Ajouter à Ma Journée (${totalSelectedCount})`
                  : 'Sélectionnez des exercices'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  ClipboardList,
  AlertTriangle,
  Clock,
  ArrowDown,
  Download,
  Trash2,
  Sun,
  ListTodo,
  Leaf,
  Tag,
  Zap,
  Flame,
  Calendar,
  TrendingUp,
  CheckCircle2,
  GitFork,
  X,
  Rows,
  Columns,
  Dumbbell,
} from 'lucide-react';
import type { Task, Category, ViewMode, Horizon, OptimizedScheduleTask, TodayOptimizationResult } from '../types';
import {
  getCurrentWeekDays,
  getTodayDateStr,
  isTaskOnDate,
  isTaskPast,
  isTaskUnscheduled,
} from '../utils/dateUtils';
import { calculateTodayEvolutionStats, sortTasksWithCompletedFirst } from '../utils/taskWeightUtils';
import { TaskItem } from './TaskItem';
import { TodayTaskPickerModal } from './TodayTaskPickerModal';
import { TodayScheduleOptimizerModal } from './TodayScheduleOptimizerModal';
import { WeekTaskAssignModal } from './WeekTaskAssignModal';
import { OrgMindmapView } from './OrgMindmapView';
import { TodaySportExercisesModal } from './TodaySportExercisesModal';

interface CategoryBoardProps {
  tasks: Task[];
  categories: Category[];
  apiKey?: string;
  model?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddTaskToCategory: (categoryId: string, title: string, horizon?: Horizon, scheduledDate?: string, subtasks?: string[], notes?: string) => void;
  onReorderTasks?: (orderedTasks: OptimizedScheduleTask[], result?: TodayOptimizationResult) => void;
  onOpenExportModal?: () => void;
  onOpenLifeModal?: () => void;
  onGoToFitnessPage?: () => void;
  onClearAll?: () => void;
  onDeleteCategory?: (categoryId: string) => void;
}

export const CategoryBoard: React.FC<CategoryBoardProps> = ({
  tasks,
  categories,
  apiKey,
  model,
  viewMode: controlledViewMode,
  onViewModeChange,
  onToggleComplete,
  onDeleteTask,
  onUpdateTask,
  onAddTaskToCategory,
  onReorderTasks,
  onOpenExportModal,
  onOpenLifeModal,
  onGoToFitnessPage,
  onClearAll,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(controlledViewMode || 'board');

  useEffect(() => {
    if (controlledViewMode !== undefined) {
      setInternalViewMode(controlledViewMode);
    }
  }, [controlledViewMode]);

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;

  const setViewMode = (mode: ViewMode) => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };

  const [todayLayout, setTodayLayout] = useState<'categories' | 'timeline'>('categories');
  const [categoryLayout, setCategoryLayout] = useState<'shelves' | 'columns'>('shelves');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddTarget, setQuickAddTarget] = useState<{ type: 'cat' | 'horizon'; id: string } | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [isWeekAssignModalOpen, setIsWeekAssignModalOpen] = useState(false);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const todayStr = getTodayDateStr();
  const weekDays = getCurrentWeekDays();
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>(() => getTodayDateStr());

  // Count sport / exercise tasks scheduled for today
  const todaySportCount = useMemo(() => {
    return tasks.filter(
      (t) =>
        isTaskOnDate(t, todayStr, todayStr) &&
        !t.cancelled &&
        (t.categoryId === 'sport' ||
          t.title.toLowerCase().startsWith('séance sport') ||
          t.title.toLowerCase().startsWith('défi du jour') ||
          t.title.toLowerCase().startsWith('entraînement complet') ||
          Boolean(t.notes?.includes('espace Sport') || t.notes?.includes('Exercice :')))
    ).length;
  }, [tasks, todayStr]);

  // Keyboard shortcut listener (/ or Ctrl+K to search, Escape to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if ((e.key === '/' && !isInputActive) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Filter tasks with search across title, dueDate, category name and notes
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterStatus === 'active' && (task.completed || task.cancelled)) return false;
      if (filterStatus === 'completed' && (!task.completed || task.cancelled)) return false;
      if (filterStatus === 'cancelled' && !task.cancelled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDue = task.dueDate?.toLowerCase().includes(q);
        const matchNotes = task.notes?.toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === task.categoryId);
        const matchCat = cat?.name.toLowerCase().includes(q);
        return Boolean(matchTitle || matchDue || matchCat || matchNotes);
      }
      return true;
    });
  }, [tasks, filterStatus, searchQuery, categories]);

  // Dynamic search placeholder depending on current view mode
  const getSearchPlaceholder = () => {
    switch (viewMode) {
      case 'today':
        return 'Rechercher dans Ma Journée...';
      case 'todo':
        return 'Rechercher dans Sans date...';
      case 'week':
        return 'Rechercher dans la Semaine...';
      case 'board':
        return 'Rechercher par titre, catégorie...';
      case 'matrix':
        return 'Rechercher dans Priorités...';
      case 'mindmap':
        return 'Rechercher dans Mindmap...';
      default:
        return 'Rechercher une tâche...';
    }
  };

  const getViewLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'today':
        return 'Ma Journée';
      case 'todo':
        return 'Sans date';
      case 'week':
        return 'la Semaine';
      case 'board':
        return 'Catégories';
      case 'matrix':
        return 'Priorités';
      case 'mindmap':
        return 'Mindmap';
      default:
        return 'cette section';
    }
  };

  // Count matches in current view
  const currentViewMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return null;
    switch (viewMode) {
      case 'today':
        return filteredTasks.filter((t) => isTaskOnDate(t, todayStr, todayStr)).length;
      case 'todo':
        return filteredTasks.filter((t) => isTaskUnscheduled(t)).length;
      case 'week':
        return filteredTasks.filter((t) => isTaskOnDate(t, selectedWeekDay, todayStr)).length;
      case 'board':
      case 'matrix':
      case 'mindmap':
      default:
        return filteredTasks.length;
    }
  }, [filteredTasks, viewMode, selectedWeekDay, searchQuery, todayStr]);

  // Count search matches for each day of the week
  const weekDaysWithSearchMatches = useMemo(() => {
    if (!searchQuery.trim()) return {};
    const map: { [dateStr: string]: number } = {};
    weekDays.forEach((d) => {
      const count = filteredTasks.filter((t) => isTaskOnDate(t, d.dateStr, todayStr)).length;
      if (count > 0) {
        map[d.dateStr] = count;
      }
    });
    return map;
  }, [filteredTasks, weekDays, searchQuery, todayStr]);

  // Find other days in the week that have search matches
  const otherWeekDaysWithMatches = useMemo(() => {
    if (!searchQuery.trim() || viewMode !== 'week') return [];
    return weekDays
      .filter((d) => d.dateStr !== selectedWeekDay && (weekDaysWithSearchMatches[d.dateStr] || 0) > 0)
      .map((d) => ({
        ...d,
        count: weekDaysWithSearchMatches[d.dateStr],
      }));
  }, [searchQuery, viewMode, weekDays, selectedWeekDay, weekDaysWithSearchMatches]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAddTarget) return;

    if (quickAddTarget.type === 'cat') {
      let defaultHorizon: Horizon = 'todo';
      let defaultDate: string | undefined = undefined;

      if (viewMode === 'today') {
        defaultHorizon = 'today';
        defaultDate = todayStr;
      } else if (viewMode === 'week') {
        defaultHorizon = selectedWeekDay === todayStr ? 'today' : 'todo';
        defaultDate = selectedWeekDay;
      }

      onAddTaskToCategory(quickAddTarget.id, quickAddTitle.trim(), defaultHorizon, defaultDate);
    } else {
      const horizon = quickAddTarget.id as Horizon;
      const defaultCatId = categories[0]?.id || 'work';
      const defaultDate = horizon === 'today' ? todayStr : undefined;
      onAddTaskToCategory(defaultCatId, quickAddTitle.trim(), horizon, defaultDate);
    }

    setQuickAddTitle('');
    setQuickAddTarget(null);
  };

  const handleAssignTaskToDate = (taskId: string, dateStr?: string) => {
    if (!dateStr) {
      onUpdateTask(taskId, {
        horizon: 'todo',
        scheduledDate: undefined,
        todayOrder: undefined,
        suggestedTimeSlot: undefined,
        todayPhase: undefined,
        todayRationale: undefined,
        isFrog: false,
      });
    } else if (dateStr === todayStr) {
      onUpdateTask(taskId, {
        horizon: 'today',
        scheduledDate: dateStr,
      });
    } else {
      onUpdateTask(taskId, {
        horizon: 'todo',
        scheduledDate: dateStr,
        todayOrder: undefined,
        suggestedTimeSlot: undefined,
        todayPhase: undefined,
        todayRationale: undefined,
        isFrog: false,
      });
    }
  };

  // Find active categories that have tasks
  const activeCategories = categories.filter((cat) => {
    const count = tasks.filter((t) => t.categoryId === cat.id).length;
    return count > 0;
  });

  const displayCategories = activeCategories.length > 0 ? activeCategories : categories;

  if (tasks.length === 0) {
    return (
      <div className="empty-board-minimal">
        <ClipboardList size={36} className="empty-icon-minimal" />
        <p className="empty-text font-alamain">Votre liste est vide</p>
      </div>
    );
  }

  const activeCount = tasks.filter((t) => !t.completed && !t.cancelled).length;
  const completedCount = tasks.filter((t) => t.completed && !t.cancelled).length;
  const cancelledCount = tasks.filter((t) => Boolean(t.cancelled)).length;
  const todayTotal = tasks.filter((t) => isTaskOnDate(t, todayStr, todayStr) && !t.cancelled).length;
  const todoTotal = tasks.filter((t) => isTaskUnscheduled(t) && !t.cancelled).length;
  const lifeTotal = tasks.filter((t) => (t.horizon || 'todo') === 'life' && !t.cancelled).length;
  const weekScheduledCount = tasks.filter(
    (t) => (Boolean(t.scheduledDate) || (t.horizon || 'todo') === 'today') && !t.cancelled
  ).length;

  const todayTasksList = sortTasksWithCompletedFirst(
    filteredTasks.filter((t) => isTaskOnDate(t, todayStr, todayStr)),
    true
  );

  const orderedTodayCount = tasks.filter(
    (t) => isTaskOnDate(t, todayStr, todayStr) && typeof t.todayOrder === 'number'
  ).length;

  const frogTask = tasks.find(
    (t) => isTaskOnDate(t, todayStr, todayStr) && t.isFrog && !t.cancelled
  );

  const todayAllTasks = tasks.filter((t) => isTaskOnDate(t, todayStr, todayStr) && !t.cancelled);
  const todayEvolution = calculateTodayEvolutionStats(todayAllTasks);
  const pastTasks = tasks.filter((t) => isTaskPast(t, todayStr));

  const handleRolloverPastToToday = () => {
    pastTasks.forEach((t) => {
      onUpdateTask(t.id, { horizon: 'today', scheduledDate: todayStr });
    });
  };

  // Automatically rollover any uncompleted tasks from yesterday or earlier to today
  useEffect(() => {
    if (pastTasks.length > 0) {
      handleRolloverPastToToday();
    }
  }, [pastTasks.length, todayStr]);

  const handleMovePastToTodo = () => {
    pastTasks.forEach((t) => {
      onUpdateTask(t.id, { horizon: 'todo', scheduledDate: undefined });
    });
  };

  return (
    <section className="board-section-minimal">
      {/* Minimalist Controls Bar */}
      <div className="board-bar-minimal">
        <div className="board-tabs-minimal">
          <button
            type="button"
            className={`tab-minimal tab-categories font-alamain ${viewMode === 'board' ? 'active' : ''}`}
            onClick={() => setViewMode('board')}
          >
            <Tag size={15} className="tab-icon" />
            <span>Catégories</span>
          </button>
          <button
            type="button"
            className={`tab-minimal tab-week font-alamain ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <Calendar size={15} className="tab-icon" />
            <span>Semaine</span>
            <span className="tab-count-badge">{weekScheduledCount}</span>
          </button>
          <button
            type="button"
            className={`tab-minimal tab-today font-alamain ${viewMode === 'today' ? 'active' : ''}`}
            onClick={() => setViewMode('today')}
          >
            <Sun size={15} className="tab-icon" />
            <span>Ma Journée</span>
            <span className="tab-count-badge">{todayTotal}</span>
          </button>
          <button
            type="button"
            className={`tab-minimal tab-todo font-alamain ${viewMode === 'todo' ? 'active' : ''}`}
            onClick={() => setViewMode('todo')}
          >
            <ListTodo size={15} className="tab-icon" />
            <span>Sans date</span>
            <span className="tab-count-badge">{todoTotal}</span>
          </button>
          <button
            type="button"
            className={`tab-minimal tab-matrix font-alamain ${viewMode === 'matrix' ? 'active' : ''}`}
            onClick={() => setViewMode('matrix')}
          >
            <AlertTriangle size={15} className="tab-icon" />
            <span>Priorités</span>
          </button>
          <button
            type="button"
            className={`tab-minimal tab-mindmap font-alamain ${viewMode === 'mindmap' ? 'active' : ''}`}
            onClick={() => setViewMode('mindmap')}
          >
            <GitFork size={15} className="tab-icon" />
            <span>Mindmap</span>
          </button>
        </div>

        <div className="board-actions-minimal">
          {viewMode === 'today' && todayTotal > 0 && (
            <button
              type="button"
              className="btn-optimize-today-banner font-alamain"
              onClick={() => setIsOptimizerModalOpen(true)}
              title="Ordonner avec l'IA"
            >
              <Zap size={14} style={{ color: '#b45309' }} />
              <span>Ordonner (IA)</span>
            </button>
          )}

          {viewMode === 'today' && (
            <button
              type="button"
              className="btn-today-sport-action font-alamain"
              onClick={() => setIsSportModalOpen(true)}
              title="Ajouter les défis et exercices sportifs de la journée"
            >
              <Dumbbell size={14} className="text-orange-600" />
              <span>Sport & Défis {todaySportCount > 0 ? `(${todaySportCount})` : ''}</span>
            </button>
          )}

          {viewMode === 'today' && (
            <button
              type="button"
              className="btn-pick-today-banner font-alamain"
              onClick={() => setIsPickerModalOpen(true)}
              title="Choisir parmi les tâches sans date"
            >
              <ListTodo size={14} />
              <span>Choisir ({todoTotal})</span>
            </button>
          )}

          {viewMode === 'week' && (
            <button
              type="button"
              className="btn-pick-today-banner font-alamain"
              onClick={() => setIsWeekAssignModalOpen(true)}
              title="Affecter des tâches sans date sur la semaine"
            >
              <Calendar size={14} />
              <span>Affecter ({todoTotal})</span>
            </button>
          )}

          {viewMode === 'todo' && todoTotal > 0 && (
            <button
              type="button"
              className="btn-pick-today-banner font-alamain"
              onClick={() => setIsWeekAssignModalOpen(true)}
              title="Planifier sur la semaine"
            >
              <Calendar size={14} />
              <span>Planifier la semaine</span>
            </button>
          )}

          {onOpenLifeModal && (
            <button
              type="button"
              className="btn-life-shortcut font-alamain"
              onClick={onOpenLifeModal}
              title="Tâches de Vie"
            >
              <Leaf size={13} />
              <span>Vie ({lifeTotal})</span>
            </button>
          )}

          <div className={`search-wrap-minimal ${searchQuery ? 'has-query' : ''}`}>
            <Search size={14} className="search-icon-minimal" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-minimal font-alamain"
            />
            {currentViewMatchesCount !== null && (
              <span className="search-results-pill font-alamain" title={`${currentViewMatchesCount} résultat(s)`}>
                {currentViewMatchesCount}
              </span>
            )}
            {searchQuery ? (
              <button
                type="button"
                className="clear-search-minimal"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                title="Effacer la recherche (Échap)"
              >
                <X size={12} />
              </button>
            ) : (
              <kbd className="search-kbd-badge" title="Raccourci : touche / ou Ctrl+K">
                /
              </kbd>
            )}
          </div>

          {(viewMode === 'board' || viewMode === 'todo' || viewMode === 'week' || (viewMode === 'today' && todayLayout === 'categories')) && (
            <div className="layout-mode-toggle font-alamain" title="Mode d'affichage">
              <button
                type="button"
                className={`btn-layout-mode ${categoryLayout === 'shelves' ? 'active' : ''}`}
                onClick={() => setCategoryLayout('shelves')}
                title="Tableau en étagères"
              >
                <Rows size={13} />
                <span>Étagères</span>
              </button>
              <button
                type="button"
                className={`btn-layout-mode ${categoryLayout === 'columns' ? 'active' : ''}`}
                onClick={() => setCategoryLayout('columns')}
                title="Colonnes"
              >
                <Columns size={13} />
                <span>Colonnes</span>
              </button>
            </div>
          )}

          <div className="filter-group-minimal">
            <button
              type="button"
              className={`filter-btn-minimal ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Tous ({tasks.length})
            </button>
            <button
              type="button"
              className={`filter-btn-minimal ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              En cours ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-btn-minimal ${filterStatus === 'completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('completed')}
            >
              Faites ({completedCount})
            </button>
            {cancelledCount > 0 && (
              <button
                type="button"
                className={`filter-btn-minimal filter-btn-cancelled ${filterStatus === 'cancelled' ? 'active' : ''}`}
                onClick={() => setFilterStatus('cancelled')}
              >
                Annulées ({cancelledCount})
              </button>
            )}
          </div>

          {(onOpenExportModal || onClearAll) && (
            <div className="extra-tools-minimal">
              {onOpenExportModal && (
                <button
                  type="button"
                  className="tool-btn-minimal"
                  onClick={onOpenExportModal}
                  title="Exporter"
                >
                  <Download size={14} />
                </button>
              )}
              {onClearAll && (
                <button
                  type="button"
                  className="tool-btn-minimal text-red-500"
                  onClick={onClearAll}
                  title="Tout effacer"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Search Notification Banner */}
      {searchQuery.trim() && currentViewMatchesCount !== null && currentViewMatchesCount > 0 && (
        <div className="search-active-banner font-alamain">
          <div className="search-active-info">
            <Search size={14} className="search-active-icon" />
            <span>
              Recherche dans <strong>{getViewLabel(viewMode)}</strong> : « <strong>{searchQuery}</strong> »
              <span className="search-active-count-tag font-alamain">
                {currentViewMatchesCount} résultat{currentViewMatchesCount > 1 ? 's' : ''}
              </span>
            </span>
          </div>
          <button
            type="button"
            className="btn-clear-search-pill font-alamain"
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            title="Effacer la recherche"
          >
            <X size={12} />
            <span>Effacer</span>
          </button>
        </div>
      )}

      {/* VIEW: WEEK OVERVIEW (CLICKABLE DATES STRIP + SELECTED DAY BOARD) */}
      {viewMode === 'week' && (
        <div className="week-view-wrapper">
          {/* Week Top Action Banner with Dates Selector */}
          <div className="week-banner-strip">
            <div className="week-banner-info font-alamain">
              <Calendar size={18} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <div className="week-banner-text-group">
                <span className="week-banner-range">
                  Semaine du {weekDays[0].dayNumber} {weekDays[0].monthShort} au {weekDays[6].dayNumber} {weekDays[6].monthShort}
                </span>
                <span className="week-banner-count">
                  • <strong>{weekScheduledCount}</strong> tâche(s) au total
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-week-distribute font-alamain"
              onClick={() => setIsWeekAssignModalOpen(true)}
              title="Affecter des tâches sans date sur la semaine"
            >
              <Plus size={14} />
              <span>Affecter sans date ({todoTotal})</span>
            </button>
          </div>

          {/* 7 Clickable Date Buttons Strip */}
          <div className="week-days-strip">
            {weekDays.map((day) => {
              const isSelected = selectedWeekDay === day.dateStr;
              const totalDay = tasks.filter((t) =>
                isTaskOnDate(t, day.dateStr, todayStr) && !t.cancelled
              ).length;
              const completedDay = tasks.filter(
                (t) => isTaskOnDate(t, day.dateStr, todayStr) && t.completed && !t.cancelled
              ).length;
              const dayMatches = weekDaysWithSearchMatches[day.dateStr] || 0;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  className={`week-day-pill font-alamain ${isSelected ? 'active' : ''} ${day.isToday ? 'is-today' : ''} ${dayMatches > 0 ? 'has-search-matches' : ''}`}
                  onClick={() => setSelectedWeekDay(day.dateStr)}
                >
                  <div className="week-pill-header">
                    <span className="week-pill-name">{day.dayShort}</span>
                    {day.isToday && <span className="week-pill-today-badge">Aujourd'hui</span>}
                  </div>
                  <div className="week-pill-number">
                    {day.dayNumber} {day.monthShort}
                  </div>
                  <div className="week-pill-footer">
                    {dayMatches > 0 ? (
                      <span className="week-pill-search-badge font-alamain">
                        {dayMatches} match{dayMatches > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="week-pill-counter">
                        {totalDay > 0 ? `${completedDay}/${totalDay}` : '0 tâche'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cross-day search matches helper */}
          {otherWeekDaysWithMatches.length > 0 && (
            <div className="week-other-matches-strip font-alamain">
              <span className="week-other-matches-label">
                <Search size={13} className="inline mr-1 text-purple-600" />
                Résultats sur d'autres jours :
              </span>
              <div className="week-other-matches-list">
                {otherWeekDaysWithMatches.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    className="week-other-match-chip font-alamain"
                    onClick={() => setSelectedWeekDay(d.dateStr)}
                    title={`Aller au ${d.dayName} ${d.dayNumber}`}
                  >
                    <span>{d.dayShort} {d.dayNumber}</span>
                    <span className="week-other-match-count">{d.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Day Header Strip */}
          {(() => {
            const activeDay = weekDays.find((d) => d.dateStr === selectedWeekDay) || weekDays[0];
            const dayTasksTotal = tasks.filter((t) =>
              isTaskOnDate(t, selectedWeekDay, todayStr) && !t.cancelled
            ).length;
            const dayTasksCompleted = tasks.filter(
              (t) => isTaskOnDate(t, selectedWeekDay, todayStr) && t.completed && !t.cancelled
            ).length;

            return (
              <div className="week-selected-day-header font-alamain">
                <div className="week-selected-day-title-group">
                  {activeDay.isToday ? (
                    <Sun size={20} style={{ color: '#d97706' }} />
                  ) : (
                    <Calendar size={20} style={{ color: '#7c3aed' }} />
                  )}
                  <h3 className="week-selected-day-title">
                    {activeDay.dayName} {activeDay.dayNumber} {activeDay.monthShort}
                  </h3>
                  {activeDay.isToday && (
                    <span className="week-today-badge">Aujourd'hui</span>
                  )}
                </div>

                <div className="week-selected-day-stats">
                  <span>
                    <strong>{dayTasksCompleted}</strong> / {dayTasksTotal} tâche(s) faite(s)
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Selected Day Categories Grid / Shelves or Search Empty State */}
          {searchQuery.trim() && currentViewMatchesCount === 0 ? (
            <div className="search-empty-state font-alamain">
              <div className="search-empty-icon-wrap">
                <Search size={26} style={{ color: '#94a3b8' }} />
              </div>
              <h4 className="search-empty-title">Aucune tâche trouvée pour « {searchQuery} »</h4>
              <p className="search-empty-subtitle">
                Aucun résultat pour ce jour.
              </p>
              <button
                type="button"
                className="btn-clear-search-action font-alamain"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
              >
                <X size={14} />
                <span>Effacer la recherche</span>
              </button>
            </div>
          ) : categoryLayout === 'shelves' ? (
            <div className="shelves-container">
              {displayCategories.map((category) => {
                const categoryTasks = sortTasksWithCompletedFirst(
                  filteredTasks.filter((t) => {
                    if (t.categoryId !== category.id) return false;
                    return isTaskOnDate(t, selectedWeekDay, todayStr);
                  }),
                  selectedWeekDay === todayStr
                );

                const totalInCat = tasks.filter(
                  (t) => t.categoryId === category.id && isTaskOnDate(t, selectedWeekDay, todayStr) && !t.cancelled
                ).length;

                const completedInCat = tasks.filter(
                  (t) =>
                    t.categoryId === category.id &&
                    isTaskOnDate(t, selectedWeekDay, todayStr) &&
                    t.completed &&
                    !t.cancelled
                ).length;

                if (categoryTasks.length === 0 && searchQuery) return null;

                return (
                  <div
                    key={category.id}
                    className="category-shelf-row"
                    style={{
                      backgroundColor: category.bgColor || '#f8fafc',
                      borderColor: category.borderColor || '#e2e8f0',
                    }}
                  >
                    <div
                      className="shelf-header-bar"
                      style={{
                        borderColor: category.borderColor || '#e2e8f0',
                      }}
                    >
                      <div className="shelf-title-group">
                        <span
                          className="shelf-category-dot"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3
                          className="shelf-category-name font-alamain"
                          style={{ color: category.color }}
                        >
                          {category.name}
                        </h3>
                        <span
                          className="shelf-count-badge font-alamain"
                          style={{
                            backgroundColor: '#ffffff',
                            color: category.color,
                            borderColor: category.borderColor || '#e2e8f0',
                          }}
                        >
                          {completedInCat}/{totalInCat}
                        </span>
                      </div>

                      <div className="shelf-actions">
                        {quickAddTarget?.type === 'cat' && quickAddTarget.id === category.id ? null : (
                          <button
                            type="button"
                            className="btn-shelf-add font-alamain"
                            style={{ color: category.color }}
                            onClick={() => setQuickAddTarget({ type: 'cat', id: category.id })}
                          >
                            <Plus size={13} />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="shelf-cards-deck">
                      {categoryTasks.length === 0 ? (
                        <div className="shelf-empty-state font-alamain">
                          <span className="shelf-empty-text">Aucune tâche ce jour</span>
                        </div>
                      ) : (
                        categoryTasks.map((task, idx) => (
                          <div key={task.id} className="shelf-card-item">
                            <TaskItem
                              task={task}
                              categories={categories}
                              index={idx}
                              onToggleComplete={onToggleComplete}
                              onDelete={onDeleteTask}
                              onUpdate={onUpdateTask}
                            />
                          </div>
                        ))
                      )}

                      {quickAddTarget?.type === 'cat' && quickAddTarget.id === category.id && (
                        <div className="shelf-quick-add-card">
                          <form onSubmit={handleQuickAddSubmit} className="shelf-quick-form">
                            <input
                              type="text"
                              placeholder="Nouvelle tâche..."
                              value={quickAddTitle}
                              onChange={(e) => setQuickAddTitle(e.target.value)}
                              autoFocus
                              className="shelf-quick-input font-alamain"
                            />
                            <div className="shelf-quick-actions">
                              <button
                                type="submit"
                                className="btn-quick-add-sm font-alamain"
                                style={{ backgroundColor: category.color }}
                              >
                                Ajouter
                              </button>
                              <button
                                type="button"
                                className="btn-quick-cancel-sm"
                                onClick={() => setQuickAddTarget(null)}
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="columns-grid-minimal">
              {displayCategories.map((category) => {
                const categoryTasks = sortTasksWithCompletedFirst(
                  filteredTasks.filter((t) => {
                    if (t.categoryId !== category.id) return false;
                    return isTaskOnDate(t, selectedWeekDay, todayStr);
                  }),
                  selectedWeekDay === todayStr
                );

                const totalInCat = tasks.filter(
                  (t) => t.categoryId === category.id && isTaskOnDate(t, selectedWeekDay, todayStr) && !t.cancelled
                ).length;

                const completedInCat = tasks.filter(
                  (t) =>
                    t.categoryId === category.id &&
                    isTaskOnDate(t, selectedWeekDay, todayStr) &&
                    t.completed &&
                    !t.cancelled
                ).length;

                if (categoryTasks.length === 0 && searchQuery) return null;

                return (
                  <div
                    key={category.id}
                    className="category-group-minimal"
                    style={{
                      backgroundColor: category.bgColor || '#f8fafc',
                      borderColor: category.borderColor || '#e2e8f0',
                    }}
                  >
                    <div
                      className="category-header-minimal"
                      style={{
                        borderColor: category.borderColor || '#e2e8f0',
                      }}
                    >
                      <div className="category-title-minimal">
                        <span
                          className="category-dot-minimal"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3
                          className="category-name-minimal font-alamain"
                          style={{ color: category.color }}
                        >
                          {category.name}
                        </h3>
                      </div>

                      <span
                        className="category-count-minimal"
                        style={{
                          backgroundColor: '#ffffff',
                          color: category.color,
                          borderColor: category.borderColor || '#e2e8f0',
                        }}
                      >
                        {completedInCat}/{totalInCat}
                      </span>
                    </div>

                    {/* Task list */}
                    <div className="task-list-minimal">
                      {categoryTasks.length === 0 ? (
                        <div className="empty-cat-minimal">
                          <span>Aucune tâche</span>
                        </div>
                      ) : (
                        categoryTasks.map((task, idx) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            categories={categories}
                            index={idx}
                            onToggleComplete={onToggleComplete}
                            onDelete={onDeleteTask}
                            onUpdate={onUpdateTask}
                          />
                        ))
                      )}
                    </div>

                    {/* Quick Add */}
                    <div className="category-footer-minimal">
                      {quickAddTarget?.type === 'cat' && quickAddTarget.id === category.id ? (
                        <form onSubmit={handleQuickAddSubmit} className="quick-form-minimal">
                          <input
                            type="text"
                            placeholder="Nouvelle tâche..."
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            autoFocus
                            className="quick-input-minimal"
                          />
                          <div className="quick-actions-minimal">
                            <button
                              type="submit"
                              className="btn-quick-add-sm font-alamain"
                              style={{ backgroundColor: category.color }}
                            >
                              Ajouter
                            </button>
                            <button
                              type="button"
                              className="btn-quick-cancel-sm"
                              onClick={() => setQuickAddTarget(null)}
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="btn-add-inline font-alamain"
                          style={{ color: category.color }}
                          onClick={() => setQuickAddTarget({ type: 'cat', id: category.id })}
                        >
                          <Plus size={14} />
                          <span>Ajouter</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Past Tasks Rollover Strip (when previous days' tasks exist) */}
      {viewMode === 'today' && pastTasks.length > 0 && !searchQuery && (
        <div className="past-rollover-banner font-alamain">
          <div className="past-rollover-info">
            <Clock size={16} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>
              <strong>{pastTasks.length}</strong> tâche{pastTasks.length > 1 ? 's' : ''} en attente des jours précédents
            </span>
          </div>
          <div className="past-rollover-buttons font-sans">
            <button
              type="button"
              className="btn-rollover-today"
              onClick={handleRolloverPastToToday}
              title="Reporter ces tâches sur aujourd'hui"
            >
              Reporter à aujourd'hui
            </button>
            <button
              type="button"
              className="btn-rollover-todo"
              onClick={handleMovePastToTodo}
              title="Classer dans Sans date"
            >
              Classer sans date
            </button>
          </div>
        </div>
      )}

      {/* Empty banner in Today mode */}
      {viewMode === 'today' && todayTotal === 0 && !searchQuery && (
        <div className="today-empty-banner">
          <div className="today-empty-banner-content">
            <Sun size={22} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <h4 className="font-alamain">Aucune tâche pour aujourd'hui</h4>
              <p className="font-alamain">
                Sélectionnez parmi vos {todoTotal} tâche(s) sans date ou ajoutez vos exercices sportifs du jour.
              </p>
            </div>
          </div>
          <div className="today-empty-actions-row">
            <button
              type="button"
              className="btn-pick-sport-banner font-alamain"
              onClick={() => setIsSportModalOpen(true)}
            >
              <Dumbbell size={14} className="text-orange-600" />
              <span>Ajouter mes exos du jour</span>
            </button>
            <button
              type="button"
              className="btn-pick-today-banner font-alamain"
              onClick={() => setIsPickerModalOpen(true)}
            >
              <ListTodo size={14} />
              <span>Choisir sans date ({todoTotal})</span>
            </button>
          </div>
        </div>
      )}

      {/* Today Active Banner with AI Optimizer shortcut & timeline switch */}
      {viewMode === 'today' && todayTotal > 0 && !searchQuery && (
        <div className="today-active-action-strip">
          <div className="today-strip-info font-alamain">
            <Sun size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <div className="today-strip-text-group">
              <span className="today-strip-main-text">
                <strong>{todayTotal}</strong> tâche(s)
              </span>
              {orderedTodayCount > 0 && (
                <span className="today-strip-active-tag font-alamain">
                  • Ordre IA ({orderedTodayCount}/{todayTotal})
                </span>
              )}
              {frogTask && (
                <span className="today-strip-frog-badge font-alamain" title="Tâche prioritaire">
                  <Flame size={12} className="inline text-amber-600 mr-1" />
                  Crapaud : <strong>{frogTask.title}</strong>
                </span>
              )}
              {todaySportCount > 0 && (
                <span className="today-strip-sport-tag font-alamain" title={`${todaySportCount} exercice(s) de sport aujourd'hui`}>
                  <Dumbbell size={12} className="inline text-orange-600 mr-1" />
                  <strong>{todaySportCount}</strong> exo{todaySportCount > 1 ? 's' : ''} sport
                </span>
              )}
            </div>
          </div>
          <div className="today-strip-actions">
            <button
              type="button"
              className="btn-strip-sport font-alamain"
              onClick={() => setIsSportModalOpen(true)}
              title="Ajouter des exercices ou défis sportifs pour aujourd'hui"
            >
              <Dumbbell size={14} className="text-orange-600" />
              <span>Sport & Défis</span>
            </button>
            {orderedTodayCount > 0 && (
              <div className="today-layout-toggle font-alamain">
                <button
                  type="button"
                  className={`btn-layout-toggle ${todayLayout === 'categories' ? 'active' : ''}`}
                  onClick={() => setTodayLayout('categories')}
                  title="Afficher par Catégories"
                >
                  Catégories
                </button>
                <button
                  type="button"
                  className={`btn-layout-toggle ${todayLayout === 'timeline' ? 'active' : ''}`}
                  onClick={() => setTodayLayout('timeline')}
                  title="Afficher la chronologie"
                >
                  Chronologie ({orderedTodayCount})
                </button>
              </div>
            )}

            <button
              type="button"
              className="btn-strip-optimize font-alamain"
              onClick={() => setIsOptimizerModalOpen(true)}
              title="Calculer l'ordre optimal"
            >
              <Zap size={14} style={{ color: '#b45309' }} />
              <span>{orderedTodayCount > 0 ? 'Réordonner (IA)' : 'Ordonner (IA)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TODAY WEIGHTED EVOLUTION PROGRESS BAR */}
      {viewMode === 'today' && todayTotal > 0 && (
        <div className="today-evolution-card font-alamain">
          <div className="today-evolution-header">
            <div className="today-evolution-title-row">
              <div className="today-evolution-icon-pill">
                <TrendingUp size={16} style={{ color: '#059669' }} />
              </div>
              <div className="today-evolution-title-content">
                <h4 className="today-evolution-title">Évolution de la journée</h4>
                <span className="today-evolution-subtitle">
                  Progression pondérée selon le poids, l'urgence et la durée
                </span>
              </div>
            </div>

            <div className="today-evolution-badges">
              <span className="today-evo-badge badge-done" title="Tâches complétées">
                <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
                <strong>{todayEvolution.completedTasks}</strong> faite{todayEvolution.completedTasks > 1 ? 's' : ''}
              </span>
              <span className="today-evo-badge badge-remaining" title="Tâches restantes">
                <Clock size={12} className="inline mr-1 text-amber-600" />
                <strong>{todayEvolution.remainingTasks}</strong> restante{todayEvolution.remainingTasks > 1 ? 's' : ''}
              </span>
              <span
                className={`today-evo-badge badge-percent ${todayEvolution.progressPercent === 100 ? 'badge-completed' : ''}`}
                title={`Progression pondérée : ${todayEvolution.progressPercent}% (${todayEvolution.completedWeight}/${todayEvolution.totalWeight} pts d'effort)`}
              >
                <strong>{todayEvolution.progressPercent}%</strong>
              </span>
            </div>
          </div>

          {/* Progress bar track */}
          <div className="today-evolution-track-container">
            <div
              className="today-evolution-track"
              role="progressbar"
              aria-valuenow={todayEvolution.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`today-evolution-bar ${todayEvolution.progressPercent === 100 ? 'is-complete' : ''}`}
                style={{ width: `${Math.max(todayEvolution.progressPercent, 0)}%` }}
              >
                <div className="today-evolution-shimmer" />
              </div>
            </div>
          </div>

          {/* Evolution footer details */}
          <div className="today-evolution-footer">
            <div className="today-evolution-effort-info">
              <span>
                Effort accompli : <strong>{todayEvolution.completedWeight}</strong> / {todayEvolution.totalWeight} pts
              </span>
            </div>

            {todayEvolution.hasFrog && (
              <div className={`today-evolution-frog-pill ${todayEvolution.frogCompleted ? 'frog-done' : ''}`}>
                <Flame size={12} className="inline mr-1 text-amber-600" />
                <span>
                  Crapaud : <strong>{todayEvolution.frogCompleted ? 'Accompli !' : 'À faire en priorité'}</strong>
                </span>
              </div>
            )}

            {todayEvolution.progressPercent === 100 && (
              <div className="today-evolution-success-pill">
                <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
                <span>Journée 100% accomplie !</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: TODAY TIMELINE (WHEN USER SELECTS TIMELINE IN TODAY VIEW) */}
      {viewMode === 'today' && todayLayout === 'timeline' && todayTotal > 0 && (
        searchQuery.trim() && currentViewMatchesCount === 0 ? (
          <div className="search-empty-state font-alamain">
            <div className="search-empty-icon-wrap">
              <Search size={26} style={{ color: '#94a3b8' }} />
            </div>
            <h4 className="search-empty-title">Aucune tâche trouvée pour « {searchQuery} »</h4>
            <p className="search-empty-subtitle">
              Aucun résultat dans Ma Journée.
            </p>
            <button
              type="button"
              className="btn-clear-search-action font-alamain"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <X size={14} />
              <span>Effacer la recherche</span>
            </button>
          </div>
        ) : (
          <div className="today-timeline-container">
            <div className="today-timeline-list">
              {todayTasksList.map((task, idx) => {
                const cat = categories.find((c) => c.id === task.categoryId);
                return (
                  <div
                    key={task.id}
                    className={`today-timeline-row ${task.isFrog ? 'is-frog-timeline-row' : ''}`}
                  >
                    <div className="timeline-left-order font-alamain">
                      <div className="timeline-order-badge">
                        {typeof task.todayOrder === 'number' ? `#${task.todayOrder}` : `#${idx + 1}`}
                      </div>
                      {task.suggestedTimeSlot && (
                        <div className="timeline-time-badge font-alamain">
                          <Clock size={11} className="inline mr-1" />
                          <span>{task.suggestedTimeSlot}</span>
                        </div>
                      )}
                    </div>

                    <div className="timeline-task-wrap">
                      {cat && (
                        <div className="timeline-cat-indicator font-alamain" style={{ color: cat.color }}>
                          <span
                            className="category-dot-minimal"
                            style={{ backgroundColor: cat.color, width: 6, height: 6 }}
                          />
                          <span>{cat.name}</span>
                        </div>
                      )}
                      <TaskItem
                        task={task}
                        categories={categories}
                        index={idx}
                        onToggleComplete={onToggleComplete}
                        onDelete={onDeleteTask}
                        onUpdate={onUpdateTask}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* VIEW: CATEGORY BOARD (DEFAULT & FOR TODAY CATEGORY MODE / TODO FILTERS) */}
      {(viewMode === 'board' || (viewMode === 'today' && todayLayout === 'categories') || viewMode === 'todo') && (
        searchQuery.trim() && currentViewMatchesCount === 0 ? (
          <div className="search-empty-state font-alamain">
            <div className="search-empty-icon-wrap">
              <Search size={26} style={{ color: '#94a3b8' }} />
            </div>
            <h4 className="search-empty-title">Aucune tâche trouvée pour « {searchQuery} »</h4>
            <p className="search-empty-subtitle">
              Aucun résultat dans {getViewLabel(viewMode)}.
            </p>
            <button
              type="button"
              className="btn-clear-search-action font-alamain"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <X size={14} />
              <span>Effacer la recherche</span>
            </button>
          </div>
        ) : categoryLayout === 'shelves' ? (
            <div className="shelves-container">
              {displayCategories.map((category) => {
                const categoryTasks = sortTasksWithCompletedFirst(
                  filteredTasks.filter((t) => {
                    if (t.categoryId !== category.id) return false;
                    if (viewMode === 'today') return isTaskOnDate(t, todayStr, todayStr);
                    if (viewMode === 'todo') return isTaskUnscheduled(t);
                    return true;
                  }),
                  viewMode === 'today'
                );

                const totalInCat = tasks.filter((t) => {
                  if (t.categoryId !== category.id) return false;
                  if (t.cancelled) return false;
                  if (viewMode === 'today') return isTaskOnDate(t, todayStr, todayStr);
                  if (viewMode === 'todo') return isTaskUnscheduled(t);
                  return true;
                }).length;

                const completedInCat = tasks.filter((t) => {
                  if (t.categoryId !== category.id) return false;
                  if (t.cancelled) return false;
                  if (viewMode === 'today') return isTaskOnDate(t, todayStr, todayStr);
                  if (viewMode === 'todo') return isTaskUnscheduled(t);
                  return t.completed;
                }).length;

                if (categoryTasks.length === 0 && searchQuery) return null;

                return (
                  <div
                    key={category.id}
                    className="category-shelf-row"
                    style={{
                      backgroundColor: category.bgColor || '#f8fafc',
                      borderColor: category.borderColor || '#e2e8f0',
                    }}
                  >
                    <div
                      className="shelf-header-bar"
                      style={{
                        borderColor: category.borderColor || '#e2e8f0',
                      }}
                    >
                      <div className="shelf-title-group">
                        <span
                          className="shelf-category-dot"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3
                          className="shelf-category-name font-alamain"
                          style={{ color: category.color }}
                        >
                          {category.name}
                        </h3>
                        <span
                          className="shelf-count-badge font-alamain"
                          style={{
                            backgroundColor: '#ffffff',
                            color: category.color,
                            borderColor: category.borderColor || '#e2e8f0',
                          }}
                        >
                          {completedInCat}/{totalInCat}
                        </span>
                      </div>

                      <div className="shelf-actions">
                        {quickAddTarget?.type === 'cat' && quickAddTarget.id === category.id ? null : (
                          <button
                            type="button"
                            className="btn-shelf-add font-alamain"
                            style={{ color: category.color }}
                            onClick={() => setQuickAddTarget({ type: 'cat', id: category.id })}
                          >
                            <Plus size={13} />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="shelf-cards-deck">
                      {categoryTasks.length === 0 ? (
                        <div className="shelf-empty-state font-alamain">
                          <span className="shelf-empty-text">
                            {viewMode === 'today'
                              ? "Aucune tâche aujourd'hui"
                              : viewMode === 'todo'
                              ? 'Aucune tâche sans date'
                              : 'Aucune tâche'}
                          </span>
                          {viewMode === 'today' && todoTotal > 0 && (
                            <button
                              type="button"
                              className="btn-pick-inline-empty font-alamain"
                              onClick={() => setIsPickerModalOpen(true)}
                            >
                              <Plus size={12} />
                              <span>Choisir sans date</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        categoryTasks.map((task, idx) => (
                          <div key={task.id} className="shelf-card-item">
                            <TaskItem
                              task={task}
                              categories={categories}
                              index={idx}
                              onToggleComplete={onToggleComplete}
                              onDelete={onDeleteTask}
                              onUpdate={onUpdateTask}
                            />
                          </div>
                        ))
                      )}

                      {quickAddTarget?.type === 'cat' && quickAddTarget.id === category.id && (
                        <div className="shelf-quick-add-card">
                          <form onSubmit={handleQuickAddSubmit} className="shelf-quick-form">
                            <input
                              type="text"
                              placeholder="Nouvelle tâche..."
                              value={quickAddTitle}
                              onChange={(e) => setQuickAddTitle(e.target.value)}
                              autoFocus
                              className="shelf-quick-input font-alamain"
                            />
                            <div className="shelf-quick-actions">
                              <button
                                type="submit"
                                className="btn-quick-add-sm font-alamain"
                                style={{ backgroundColor: category.color }}
                              >
                                Ajouter
                              </button>
                              <button
                                type="button"
                                className="btn-quick-cancel-sm"
                                onClick={() => setQuickAddTarget(null)}
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="columns-grid-minimal">
              {displayCategories.map((category) => {
                const categoryTasks = sortTasksWithCompletedFirst(
                  filteredTasks.filter((t) => {
                    if (t.categoryId !== category.id) return false;
                    if (viewMode === 'today') return isTaskOnDate(t, todayStr, todayStr);
                    if (viewMode === 'todo') return isTaskUnscheduled(t);
                    return true;
                  }),
                  viewMode === 'today'
                );

                const totalInCat = tasks.filter((t) => {
                  if (t.categoryId !== category.id) return false;
                  if (t.cancelled) return false;
                  if (viewMode === 'today') return isTaskOnDate(t, todayStr, todayStr);
                  if (viewMode === 'todo') return isTaskUnscheduled(t);
                  return true;
                }).length;

                const completedInCat = tasks.filter((t) => {
                  if (t.categoryId !== category.id) return false;
                  if (t.cancelled) return false;
                  if (viewMode === 'today') return isTaskOnDate(t, todayStr, todayStr);
                  if (viewMode === 'todo') return isTaskUnscheduled(t);
                  return t.completed;
                }).length;

                if (categoryTasks.length === 0 && searchQuery) return null;

                return (
                  <div
                    key={category.id}
                    className="category-group-minimal"
                    style={{
                      backgroundColor: category.bgColor || '#f8fafc',
                      borderColor: category.borderColor || '#e2e8f0',
                    }}
                  >
                    <div
                      className="category-header-minimal"
                      style={{
                        borderColor: category.borderColor || '#e2e8f0',
                      }}
                    >
                      <div className="category-title-minimal">
                        <span
                          className="category-dot-minimal"
                          style={{ backgroundColor: category.color }}
                        />
                        <h3
                          className="category-name-minimal font-alamain"
                          style={{ color: category.color }}
                        >
                          {category.name}
                        </h3>
                      </div>

                      <span
                        className="category-count-minimal"
                        style={{
                          backgroundColor: '#ffffff',
                          color: category.color,
                          borderColor: category.borderColor || '#e2e8f0',
                        }}
                      >
                        {completedInCat}/{totalInCat}
                      </span>
                    </div>

                    {/* Task list */}
                    <div className="task-list-minimal">
                      {categoryTasks.length === 0 ? (
                        <div className="empty-cat-minimal">
                          {viewMode === 'today' ? (
                            <div className="empty-cat-action-wrap">
                              <span>Aucune tâche aujourd'hui</span>
                              {todoTotal > 0 && (
                                <button
                                  type="button"
                                  className="btn-pick-inline-empty font-alamain"
                                  onClick={() => setIsPickerModalOpen(true)}
                                >
                                  <Plus size={12} />
                                  <span>Choisir sans date</span>
                                </button>
                              )}
                            </div>
                          ) : viewMode === 'todo' ? (
                            <div className="empty-cat-action-wrap">
                              <span>Aucune tâche sans date</span>
                            </div>
                          ) : searchQuery ? (
                            'Aucun résultat'
                          ) : (
                            'Aucune tâche'
                          )}
                        </div>
                      ) : (
                        categoryTasks.map((task, idx) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            categories={categories}
                            index={idx}
                            onToggleComplete={onToggleComplete}
                            onDelete={onDeleteTask}
                            onUpdate={onUpdateTask}
                          />
                        ))
                      )}
                    </div>

                    {/* Quick Add */}
                    <div className="category-footer-minimal">
                      {quickAddTarget?.type === 'cat' && quickAddTarget.id === category.id ? (
                        <form onSubmit={handleQuickAddSubmit} className="quick-form-minimal">
                          <input
                            type="text"
                            placeholder="Nouvelle tâche..."
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            autoFocus
                            className="quick-input-minimal"
                          />
                          <div className="quick-actions-minimal">
                            <button
                              type="submit"
                              className="btn-quick-add-sm font-alamain"
                              style={{ backgroundColor: category.color }}
                            >
                              Ajouter
                            </button>
                            <button
                              type="button"
                              className="btn-quick-cancel-sm"
                              onClick={() => setQuickAddTarget(null)}
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="btn-add-inline font-alamain"
                          style={{ color: category.color }}
                          onClick={() => setQuickAddTarget({ type: 'cat', id: category.id })}
                        >
                          <Plus size={14} />
                          <span>Ajouter</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* VIEW: MATRIX / PRIORITY */}
      {viewMode === 'matrix' && (
        searchQuery.trim() && currentViewMatchesCount === 0 ? (
          <div className="search-empty-state font-alamain">
            <div className="search-empty-icon-wrap">
              <Search size={26} style={{ color: '#94a3b8' }} />
            </div>
            <h4 className="search-empty-title">Aucune tâche trouvée pour « {searchQuery} »</h4>
            <p className="search-empty-subtitle">
              Aucun résultat dans les Priorités.
            </p>
            <button
              type="button"
              className="btn-clear-search-action font-alamain"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <X size={14} />
              <span>Effacer la recherche</span>
            </button>
          </div>
        ) : (
          <div className="matrix-grid-minimal">
            {/* Urgent / High */}
            <div
              className="matrix-block-minimal"
              style={{
                backgroundColor: '#fef2f2',
                borderColor: '#fecaca',
              }}
            >
              <div
                className="matrix-header-minimal"
                style={{ borderColor: '#fee2e2' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} style={{ color: '#dc2626' }} />
                  <h3
                    className="category-name-minimal font-alamain"
                    style={{ color: '#b91c1c' }}
                  >
                    Urgent
                  </h3>
                </div>
                <span
                  className="category-count-minimal"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#b91c1c',
                    borderColor: '#fecaca',
                  }}
                >
                  {filteredTasks.filter((t) => t.priority === 'high').length}
                </span>
              </div>
              <div className="task-list-minimal">
                {sortTasksWithCompletedFirst(filteredTasks.filter((t) => t.priority === 'high'))
                  .map((task, idx) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={categories}
                      index={idx}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDeleteTask}
                      onUpdate={onUpdateTask}
                    />
                  ))}
                {filteredTasks.filter((t) => t.priority === 'high').length === 0 && (
                  <p className="empty-cat-minimal">Aucune tâche urgente</p>
                )}
              </div>
            </div>

            {/* Medium */}
            <div
              className="matrix-block-minimal"
              style={{
                backgroundColor: '#fffbeb',
                borderColor: '#fde68a',
              }}
            >
              <div
                className="matrix-header-minimal"
                style={{ borderColor: '#fef3c7' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={15} style={{ color: '#d97706' }} />
                  <h3
                    className="category-name-minimal font-alamain"
                    style={{ color: '#b45309' }}
                  >
                    Normal
                  </h3>
                </div>
                <span
                  className="category-count-minimal"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#b45309',
                    borderColor: '#fde68a',
                  }}
                >
                  {filteredTasks.filter((t) => t.priority === 'medium').length}
                </span>
              </div>
              <div className="task-list-minimal">
                {sortTasksWithCompletedFirst(filteredTasks.filter((t) => t.priority === 'medium'))
                  .map((task, idx) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={categories}
                      index={idx}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDeleteTask}
                      onUpdate={onUpdateTask}
                    />
                  ))}
                {filteredTasks.filter((t) => t.priority === 'medium').length === 0 && (
                  <p className="empty-cat-minimal">Aucune tâche moyenne</p>
                )}
              </div>
            </div>

            {/* Low */}
            <div
              className="matrix-block-minimal"
              style={{
                backgroundColor: '#eff6ff',
                borderColor: '#bfdbfe',
              }}
            >
              <div
                className="matrix-header-minimal"
                style={{ borderColor: '#dbeafe' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowDown size={15} style={{ color: '#2563eb' }} />
                  <h3
                    className="category-name-minimal font-alamain"
                    style={{ color: '#1d4ed8' }}
                  >
                    Basse
                  </h3>
                </div>
                <span
                  className="category-count-minimal"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1d4ed8',
                    borderColor: '#bfdbfe',
                  }}
                >
                  {filteredTasks.filter((t) => t.priority === 'low').length}
                </span>
              </div>
              <div className="task-list-minimal">
                {sortTasksWithCompletedFirst(filteredTasks.filter((t) => t.priority === 'low'))
                  .map((task, idx) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      categories={categories}
                      index={idx}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDeleteTask}
                      onUpdate={onUpdateTask}
                    />
                  ))}
                {filteredTasks.filter((t) => t.priority === 'low').length === 0 && (
                  <p className="empty-cat-minimal">Aucune tâche basse</p>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* MINDMAP VIEW */}
      {viewMode === 'mindmap' && (
        searchQuery.trim() && currentViewMatchesCount === 0 ? (
          <div className="search-empty-state font-alamain">
            <div className="search-empty-icon-wrap">
              <Search size={26} style={{ color: '#94a3b8' }} />
            </div>
            <h4 className="search-empty-title">Aucune tâche trouvée pour « {searchQuery} »</h4>
            <p className="search-empty-subtitle">
              Aucun résultat dans la Mindmap.
            </p>
            <button
              type="button"
              className="btn-clear-search-action font-alamain"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <X size={14} />
              <span>Effacer la recherche</span>
            </button>
          </div>
        ) : (
          <OrgMindmapView
            tasks={filteredTasks}
            categories={categories}
            onToggleComplete={onToggleComplete}
            onAddTaskToCategory={onAddTaskToCategory}
          />
        )
      )}

      {/* TODAY TASK PICKER MODAL */}
      <TodayTaskPickerModal
        isOpen={isPickerModalOpen}
        tasks={tasks}
        categories={categories}
        onClose={() => setIsPickerModalOpen(false)}
        onMoveToToday={(id) => onUpdateTask(id, { horizon: 'today', scheduledDate: todayStr })}
        onRemoveFromToday={(id) => onUpdateTask(id, { horizon: 'todo', scheduledDate: undefined })}
      />

      {/* TODAY SCHEDULE OPTIMIZER MODAL */}
      <TodayScheduleOptimizerModal
        isOpen={isOptimizerModalOpen}
        tasks={tasks}
        categories={categories}
        apiKey={apiKey}
        model={model}
        onClose={() => setIsOptimizerModalOpen(false)}
        onApplyOrder={(orderedTasks, result) => {
          if (onReorderTasks) {
            onReorderTasks(orderedTasks, result);
          }
        }}
      />

      {/* WEEK TASK ASSIGN MODAL */}
      <WeekTaskAssignModal
        isOpen={isWeekAssignModalOpen}
        tasks={tasks}
        categories={categories}
        onClose={() => setIsWeekAssignModalOpen(false)}
        onAssignTaskToDate={handleAssignTaskToDate}
      />

      {/* TODAY SPORT & EXERCISES MODAL */}
      <TodaySportExercisesModal
        isOpen={isSportModalOpen}
        categories={categories}
        existingTasks={tasks}
        onClose={() => setIsSportModalOpen(false)}
        onAddTasks={(tasksToAdd) => {
          tasksToAdd.forEach((item) => {
            onAddTaskToCategory(
              item.categoryId,
              item.title,
              'today',
              todayStr,
              item.subtasks,
              item.notes
            );
          });
        }}
        onGoToFitnessPage={onGoToFitnessPage}
      />
    </section>
  );
};

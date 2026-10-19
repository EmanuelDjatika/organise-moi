import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  Save,
  X,
  AlertCircle,
  Sun,
  ListTodo,
  Leaf,
  Flame,
  ChevronDown,
  Ban,
  Undo2,
  ListTree,
  Plus,
  Dumbbell,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Task, SubTask, Category, Priority, Horizon } from '../types';
import {
  getCurrentWeekDays,
  getTodayDateStr,
  formatDayLabel,
  isTaskOnDate,
} from '../utils/dateUtils';
import { playTaskCompletionSound } from '../utils/soundUtils';
import { getTaskWeight } from '../utils/taskWeightUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TaskItemProps {
  task: Task;
  categories: Category[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  index?: number;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  categories,
  onToggleComplete,
  onDelete,
  onUpdate,
  index = 0,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isConfirmDeleteTask, setIsConfirmDeleteTask] = useState(false);
  const [subtaskToDelete, setSubtaskToDelete] = useState<SubTask | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const subtasks = task.subtasks || [];
  const subtasksTotal = subtasks.length;
  const subtasksDone = subtasks.filter((s) => s.completed).length;

  const todayStr = getTodayDateStr();
  const weekDays = getCurrentWeekDays();

  // Initial edit state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editCategory, setEditCategory] = useState(task.categoryId);
  const [editHorizon, setEditHorizon] = useState<Horizon>(task.horizon || 'todo');
  const [editScheduledDate, setEditScheduledDate] = useState<string>(
    task.scheduledDate || ((task.horizon || 'todo') === 'today' ? todayStr : '')
  );
  const [editDue, setEditDue] = useState(task.dueDate || '');
  const [editTime, setEditTime] = useState(task.estimatedTime || '');

  // Close day picker on click outside
  useEffect(() => {
    if (!isDayPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsDayPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDayPickerOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    if (task.cancelled) {
      // If task was cancelled, un-cancel it
      onUpdate(task.id, { cancelled: false });
      return;
    }

    if (!task.completed) {
      playTaskCompletionSound();

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 30,
        spread: 60,
        origin: { x, y },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'],
        disableForReducedMotion: true,
      });
    }
    onToggleComplete(task.id);
  };

  const handleToggleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.cancelled) {
      onUpdate(task.id, { cancelled: false });
    } else {
      onUpdate(task.id, { cancelled: true, completed: false });
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const newSub: SubTask = {
      id: 'st_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    onUpdate(task.id, { subtasks: [...subtasks, newSub] });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = subtasks.find((s) => s.id === subtaskId);
    const willBeDone = target ? !target.completed : false;

    if (willBeDone) {
      playTaskCompletionSound();
    }

    const updated = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onUpdate(task.id, { subtasks: updated });
  };

  const handleSelectDay = (dateStr?: string) => {
    setIsDayPickerOpen(false);
    if (!dateStr) {
      // Move to "Sans date"
      onUpdate(task.id, {
        horizon: 'todo',
        scheduledDate: undefined,
        todayOrder: undefined,
        suggestedTimeSlot: undefined,
        todayPhase: undefined,
        todayRationale: undefined,
        isFrog: false,
      });
      return;
    }

    if (dateStr === todayStr) {
      // Move to "Aujourd'hui"
      onUpdate(task.id, {
        horizon: 'today',
        scheduledDate: dateStr,
      });
    } else {
      // Move to another day in the week
      onUpdate(task.id, {
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

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    let targetHorizon: Horizon = editHorizon;
    let targetScheduledDate: string | undefined = editScheduledDate ? editScheduledDate : undefined;

    if (editScheduledDate === todayStr) {
      targetHorizon = 'today';
      targetScheduledDate = todayStr;
    } else if (editScheduledDate) {
      targetHorizon = 'todo';
    } else if (editHorizon === 'today') {
      targetScheduledDate = todayStr;
    }

    const updates: Partial<Task> = {
      title: editTitle.trim(),
      priority: editPriority,
      categoryId: editCategory,
      horizon: targetHorizon,
      scheduledDate: targetScheduledDate,
      dueDate: editDue.trim() || undefined,
      estimatedTime: editTime.trim() || undefined,
    };

    if (targetHorizon !== 'today') {
      updates.todayOrder = undefined;
      updates.suggestedTimeSlot = undefined;
      updates.todayPhase = undefined;
      updates.todayRationale = undefined;
      updates.isFrog = false;
    }

    onUpdate(task.id, updates);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditCategory(task.categoryId);
    setEditHorizon(task.horizon || 'todo');
    setEditScheduledDate(
      task.scheduledDate || ((task.horizon || 'todo') === 'today' ? todayStr : '')
    );
    setEditDue(task.dueDate || '');
    setEditTime(task.estimatedTime || '');
    setIsEditing(false);
  };

  const priorityColors = {
    high: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', label: 'Urgent' },
    medium: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d', label: 'Normal' },
    low: { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb', label: 'Basse' },
  };

  // Determine active day badge meta
  const isToday = isTaskOnDate(task, todayStr, todayStr);
  const isLife = (task.horizon || 'todo') === 'life';
  const isOtherDay = Boolean(task.scheduledDate && task.scheduledDate !== todayStr);

  let dayBadgeText = 'Sans date';
  let dayBadgeBg = '#eff6ff';
  let dayBadgeColor = '#1d4ed8';
  let dayBadgeBorder = '#bfdbfe';
  let DayIcon = ListTodo;

  if (isLife) {
    dayBadgeText = 'Tâche de vie';
    dayBadgeBg = '#ecfdf5';
    dayBadgeColor = '#047857';
    dayBadgeBorder = '#a7f3d0';
    DayIcon = Leaf;
  } else if (isToday) {
    dayBadgeText = "Aujourd'hui";
    dayBadgeBg = '#fffbeb';
    dayBadgeColor = '#b45309';
    dayBadgeBorder = '#fde68a';
    DayIcon = Sun;
  } else if (isOtherDay && task.scheduledDate) {
    dayBadgeText = formatDayLabel(task.scheduledDate);
    dayBadgeBg = '#f5f3ff';
    dayBadgeColor = '#6d28d9';
    dayBadgeBorder = '#ddd6fe';
    DayIcon = Calendar;
  }

  const isSportTask =
    task.categoryId === 'sport' ||
    task.title.toLowerCase().startsWith('séance sport') ||
    task.title.toLowerCase().startsWith('défi du jour') ||
    task.title.toLowerCase().startsWith('entraînement complet') ||
    Boolean(task.notes?.includes('espace Sport') || task.notes?.includes('Exercice :'));

  if (isEditing) {
    return (
      <form onSubmit={handleSaveEdit} className="task-card task-card-editing">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="edit-input-title"
          autoFocus
          placeholder="Titre de la tâche"
        />

        <div className="edit-meta-row">
          {/* Day / Schedule selector */}
          <select
            value={editScheduledDate}
            onChange={(e) => {
              const val = e.target.value;
              setEditScheduledDate(val);
              if (val === todayStr) {
                setEditHorizon('today');
              } else if (val) {
                setEditHorizon('todo');
              }
            }}
            className="edit-select"
          >
            <option value="">Sans date</option>
            {weekDays.map((d) => (
              <option key={d.dateStr} value={d.dateStr}>
                {d.isToday
                  ? `Aujourd'hui (${d.dayShort} ${d.dayNumber})`
                  : `${d.dayName} ${d.dayNumber} ${d.monthShort}`}
              </option>
            ))}
          </select>

          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="edit-select"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as Priority)}
            className="edit-select"
          >
            <option value="high">Urgent (Haute)</option>
            <option value="medium">Moyen</option>
            <option value="low">Basse</option>
          </select>

          <input
            type="text"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
            placeholder="Délai (ex: Demain)"
            className="edit-input-sm"
          />

          <input
            type="text"
            value={editTime}
            onChange={(e) => setEditTime(e.target.value)}
            placeholder="Durée (ex: 20 min)"
            className="edit-input-sm"
          />
        </div>

        <div className="edit-actions">
          <button type="submit" className="btn-save-sm font-alamain">
            <Save size={14} />
            <span>Valider</span>
          </button>
          <button type="button" className="btn-cancel-sm" onClick={handleCancelEdit}>
            <X size={14} />
            <span>Annuler</span>
          </button>
        </div>
      </form>
    );
  }

  const activeDateValue = task.scheduledDate || (isToday ? todayStr : '');

  return (
    <div
      className={`task-card ${task.completed ? 'task-completed' : ''} ${task.cancelled ? 'task-cancelled' : ''} ${isDayPickerOpen ? 'has-open-popover' : ''}`}
      style={{ '--item-index': index } as React.CSSProperties}
      onDoubleClick={() => setIsEditing(true)}
    >
      <div className="task-main-row">
        <button
          type="button"
          className={`task-checkbox ${task.completed ? 'checked' : ''} ${task.cancelled ? 'cancelled' : ''}`}
          onClick={handleToggle}
          aria-label={
            task.cancelled
              ? 'Rétablir la tâche'
              : task.completed
                ? 'Marquer comme non fait'
                : 'Marquer comme fait'
          }
          title={task.cancelled ? 'Cliquer pour rétablir' : undefined}
        >
          {task.completed && <Check size={14} className="check-icon" />}
          {task.cancelled && <Ban size={12} className="cancel-icon text-rose-500" />}
        </button>

        <div className="task-content">
          <span className="task-title">{task.title}</span>

          <div className="task-meta-tags">
            {/* Cancelled Badge */}
            {task.cancelled && (
              <span
                className="meta-tag task-cancelled-tag font-alamain"
                title="Tâche annulée"
              >
                <Ban size={11} className="inline mr-1 text-rose-500" />
                <span>Annulée</span>
              </span>
            )}

            {/* Clickable Day Selector Badge */}
            <div className="day-picker-container" ref={popoverRef}>
              <button
                type="button"
                className="meta-tag day-schedule-tag font-alamain"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDayPickerOpen((prev) => !prev);
                }}
                title="Cliquer pour déplacer sur un autre jour de la semaine"
                style={{
                  backgroundColor: dayBadgeBg,
                  color: dayBadgeColor,
                  borderColor: dayBadgeBorder,
                }}
              >
                <DayIcon size={11} />
                <span>{dayBadgeText}</span>
                <ChevronDown size={10} className="opacity-60 ml-0.5" />
              </button>

              {/* Day Selection Popover */}
              {isDayPickerOpen && (
                <div className="day-picker-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="day-picker-header font-alamain">
                    <span>Programmer la tâche</span>
                  </div>

                  <div className="day-picker-list">
                    <button
                      type="button"
                      className={`day-picker-option font-alamain ${!activeDateValue && !isLife ? 'selected' : ''}`}
                      onClick={() => handleSelectDay(undefined)}
                    >
                      <ListTodo size={13} className="text-blue-600" />
                      <span>Sans date</span>
                      {!activeDateValue && !isLife && <Check size={12} className="ml-auto text-blue-600" />}
                    </button>

                    <div className="day-picker-divider" />

                    {weekDays.map((d) => {
                      const isSelected = activeDateValue === d.dateStr;
                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          className={`day-picker-option font-alamain ${isSelected ? 'selected' : ''} ${d.isToday ? 'is-today' : ''}`}
                          onClick={() => handleSelectDay(d.dateStr)}
                        >
                          {d.isToday ? (
                            <Sun size={13} className="text-amber-600" />
                          ) : (
                            <Calendar size={13} className="text-purple-600" />
                          )}
                          <span className="day-option-name">{d.dayName}</span>
                          <span className="day-option-date">{d.dayNumber} {d.monthShort}</span>
                          {d.isToday && <span className="day-today-pill">Aujourd'hui</span>}
                          {isSelected && <Check size={12} className="ml-auto text-purple-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Today Schedule Order Badge (#1 • 09:00 - 10:30) */}
            {task.todayOrder !== undefined && isToday && !task.cancelled && (
              <span
                className="meta-tag task-schedule-badge font-alamain"
                title={task.todayRationale ? `${task.todayRationale}` : `Étape #${task.todayOrder}`}
              >
                <span className="task-schedule-num">#{task.todayOrder}</span>
                {task.suggestedTimeSlot && (
                  <span className="task-schedule-slot">
                    <Clock size={10} className="inline mr-0.5 opacity-75" />
                    {task.suggestedTimeSlot}
                  </span>
                )}
              </span>
            )}

            {/* Crapaud Pill if isFrog */}
            {task.isFrog && isToday && !task.cancelled && (
              <span
                className="meta-tag task-frog-tag font-alamain"
                title="Tâche prioritaire à faire en premier"
              >
                <Flame size={11} className="inline mr-1 text-amber-600" />
                <span>Crapaud</span>
              </span>
            )}

            {/* Sport & Défis Badge */}
            {isSportTask && (
              <span
                className="meta-tag task-sport-tag font-alamain"
                title="Exercice issu de Sport & Défis"
              >
                <Dumbbell size={11} className="inline mr-1 text-orange-600" />
                <span>{task.title.toLowerCase().startsWith('défi') ? 'Défi Sport' : 'Séance Sport'}</span>
              </span>
            )}

            {/* Priority badge */}
            <span
              className="meta-tag priority-tag font-alamain"
              title={`Priorité : ${priorityColors[task.priority].label} • Poids : ${getTaskWeight(task)} pts`}
              style={{
                backgroundColor: priorityColors[task.priority].bg,
                color: priorityColors[task.priority].text,
                borderColor: priorityColors[task.priority].border,
              }}
            >
              {task.priority === 'high' && <AlertCircle size={11} className="inline mr-1" />}
              {priorityColors[task.priority].label}
            </span>

            {/* Estimated time */}
            {task.estimatedTime && (
              <span className="meta-tag meta-time font-alamain">
                <Clock size={12} />
                <span>{task.estimatedTime}</span>
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span className="meta-tag meta-due font-alamain">
                <Calendar size={12} />
                <span>{task.dueDate}</span>
              </span>
            )}

            {/* Subtasks Count Badge */}
            {subtasksTotal > 0 && (
              <button
                type="button"
                className={`meta-tag subtasks-tag ${subtasksDone === subtasksTotal ? 'all-done' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSubtasksOpen((prev) => !prev);
                }}
                title="Afficher / masquer les sous-tâches"
              >
                <ListTree size={11} className="inline mr-0.5" />
                <span>{subtasksDone}/{subtasksTotal}</span>
                <ChevronDown size={10} className={`subtasks-chevron ${isSubtasksOpen ? 'open' : ''}`} />
              </button>
            )}
          </div>
        </div>

        <div className="task-hover-actions">
          <button
            type="button"
            className={`task-action-btn subtasks-btn ${isSubtasksOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsSubtasksOpen((prev) => !prev);
            }}
            title={isSubtasksOpen ? 'Masquer les sous-tâches' : 'Ajouter / Voir les sous-tâches'}
          >
            <ListTree size={14} />
          </button>
          <button
            type="button"
            className="task-action-btn"
            onClick={() => setIsEditing(true)}
            title="Modifier"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            className={`task-action-btn ${task.cancelled ? 'restore-btn' : 'cancel-btn'}`}
            onClick={handleToggleCancel}
            title={task.cancelled ? 'Rétablir la tâche' : 'Annuler la tâche'}
          >
            {task.cancelled ? <Undo2 size={14} /> : <Ban size={14} />}
          </button>
          <button
            type="button"
            className="task-action-btn delete-btn"
            onClick={() => setIsConfirmDeleteTask(true)}
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Subtasks Section */}
      {isSubtasksOpen && (
        <div className="subtasks-container" onClick={(e) => e.stopPropagation()}>
          {subtasks.length > 0 && (
            <div className="subtasks-list">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className={`subtask-item ${st.completed ? 'subtask-completed' : ''}`}
                >
                  <button
                    type="button"
                    className={`subtask-checkbox ${st.completed ? 'checked' : ''}`}
                    onClick={(e) => handleToggleSubtask(st.id, e)}
                    title={st.completed ? 'Marquer comme non fait' : 'Marquer comme fait'}
                  >
                    {st.completed && <Check size={10} className="check-icon" />}
                  </button>
                  <span className="subtask-title">{st.title}</span>
                  <button
                    type="button"
                    className="subtask-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubtaskToDelete(st);
                    }}
                    title="Supprimer la sous-tâche"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Add Subtask Form */}
          <form onSubmit={handleAddSubtask} className="subtask-add-form">
            <Plus size={13} className="subtask-add-icon" />
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Ajouter une sous-tâche..."
              className="subtask-add-input"
              autoFocus={subtasksTotal === 0}
            />
            {newSubtaskTitle.trim() && (
              <button type="submit" className="btn-subtask-add-submit">
                Ajouter
              </button>
            )}
          </form>
        </div>
      )}

      {/* Confirmation Modal for Task Deletion */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteTask}
        title="Supprimer la tâche"
        subtitle="Suppression définitive"
        message="Voulez-vous vraiment supprimer cette tâche ?"
        itemName={task.title}
        itemTypeLabel="Tâche"
        confirmLabel="Supprimer"
        onClose={() => setIsConfirmDeleteTask(false)}
        onConfirm={() => onDelete(task.id)}
      />

      {/* Confirmation Modal for Subtask Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(subtaskToDelete)}
        title="Supprimer la sous-tâche"
        subtitle="Suppression définitive"
        message="Voulez-vous vraiment supprimer cette sous-tâche ?"
        itemName={subtaskToDelete?.title}
        itemTypeLabel="Sous-tâche"
        confirmLabel="Supprimer"
        onClose={() => setSubtaskToDelete(null)}
        onConfirm={() => {
          if (subtaskToDelete) {
            const updated = subtasks.filter((s) => s.id !== subtaskToDelete.id);
            onUpdate(task.id, { subtasks: updated });
            setSubtaskToDelete(null);
          }
        }}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { X, Calendar, Search, Check, ListTodo, Clock } from 'lucide-react';
import type { Task, Category } from '../types';
import {
  getCurrentWeekDays,
  getTodayDateStr,
  formatShortDayLabel,
} from '../utils/dateUtils';
import confetti from 'canvas-confetti';

interface WeekTaskAssignModalProps {
  isOpen: boolean;
  tasks: Task[];
  categories: Category[];
  onClose: () => void;
  onAssignTaskToDate: (taskId: string, dateStr?: string) => void;
}

export const WeekTaskAssignModal: React.FC<WeekTaskAssignModalProps> = ({
  isOpen,
  tasks,
  categories,
  onClose,
  onAssignTaskToDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  if (!isOpen) return null;

  const todayStr = getTodayDateStr();
  const weekDays = getCurrentWeekDays();

  // Filter tasks that are candidates (uncompleted and non-cancelled tasks)
  const candidateTasks = tasks.filter((t) => {
    if (t.completed || t.cancelled) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const cat = categories.find((c) => c.id === t.categoryId);
      const matchCat = cat?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    if (selectedCatFilter !== 'all' && t.categoryId !== selectedCatFilter) {
      return false;
    }
    return true;
  });

  const handleAssign = (taskId: string, dateStr?: string) => {
    confetti({
      particleCount: 20,
      spread: 45,
      origin: { y: 0.65 },
      colors: ['#8b5cf6', '#3b82f6', '#10b981'],
      disableForReducedMotion: true,
    });
    onAssignTaskToDate(taskId, dateStr);
  };

  const categoriesWithTasks = categories.filter((cat) =>
    candidateTasks.some((t) => t.categoryId === cat.id)
  );

  const totalScheduledInWeek = tasks.filter(
    (t) => !t.completed && (t.scheduledDate || (t.horizon || 'todo') === 'today')
  ).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card week-assign-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div
              className="modal-icon-badge"
              style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">Planifier sur la Semaine</h2>
              <p className="modal-subtitle">
                Affectez vos tâches aux jours de la semaine
              </p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search & Category Filter */}
        <div className="picker-toolbar">
          <div className="search-wrap-minimal picker-search-wrap">
            <Search size={14} className="search-icon-minimal" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-minimal font-alamain"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-minimal"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="picker-cat-scroll">
            <button
              type="button"
              className={`picker-cat-pill font-alamain ${selectedCatFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCatFilter('all')}
            >
              Toutes ({candidateTasks.length})
            </button>
            {categories.map((cat) => {
              const count = candidateTasks.filter((t) => t.categoryId === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`picker-cat-pill font-alamain ${selectedCatFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCatFilter(cat.id)}
                  style={{
                    borderColor: selectedCatFilter === cat.id ? cat.color : undefined,
                  }}
                >
                  <span className="picker-cat-dot" style={{ background: cat.color }} />
                  <span>{cat.name}</span>
                  <span className="picker-cat-badge">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body List */}
        <div className="modal-body week-assign-body-list">
          {candidateTasks.length === 0 ? (
            <div className="picker-empty-state font-alamain">
              <ListTodo size={32} style={{ color: '#94a3b8' }} />
              <p>Aucune tâche trouvée.</p>
            </div>
          ) : (
            categoriesWithTasks.map((cat) => {
              const catTasks = candidateTasks.filter((t) => t.categoryId === cat.id);
              if (catTasks.length === 0) return null;

              return (
                <div key={cat.id} className="picker-category-group">
                  <div className="picker-group-header font-alamain" style={{ color: cat.color }}>
                    <span className="picker-cat-dot" style={{ background: cat.color }} />
                    <span>{cat.name}</span>
                    <span className="picker-group-count">({catTasks.length})</span>
                  </div>

                  <div className="week-assign-items-list">
                    {catTasks.map((task) => {
                      const taskDate =
                        task.scheduledDate ||
                        ((task.horizon || 'todo') === 'today' ? todayStr : undefined);

                      return (
                        <div key={task.id} className="week-assign-task-row">
                          <div className="week-assign-task-info">
                            <span className="week-assign-task-title">{task.title}</span>
                            <div className="week-assign-task-meta">
                              {taskDate ? (
                                <span className="week-assign-current-tag font-alamain">
                                  {taskDate === todayStr ? "Aujourd'hui" : formatShortDayLabel(taskDate)}
                                </span>
                              ) : (
                                <span className="week-assign-unscheduled-tag font-alamain">
                                  Sans date
                                </span>
                              )}
                              {task.estimatedTime && (
                                <span className="picker-meta-pill">
                                  <Clock size={11} />
                                  <span>{task.estimatedTime}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Day Selector Buttons */}
                          <div className="week-assign-buttons-bar font-alamain">
                            <button
                              type="button"
                              className={`btn-assign-day ${!taskDate ? 'active-unscheduled' : ''}`}
                              onClick={() => handleAssign(task.id, undefined)}
                              title="Retirer la date (Sans date)"
                            >
                              <span>Sans date</span>
                            </button>

                            {weekDays.map((d) => {
                              const isSelected = taskDate === d.dateStr;
                              return (
                                <button
                                  key={d.dateStr}
                                  type="button"
                                  className={`btn-assign-day ${isSelected ? 'active-day' : ''} ${d.isToday ? 'is-today-btn' : ''}`}
                                  onClick={() => handleAssign(task.id, d.dateStr)}
                                  title={`${d.dayName} ${d.dayNumber} ${d.monthShort}`}
                                >
                                  <span>{d.dayShort}</span>
                                  <span className="day-num-sub">{d.dayNumber}</span>
                                  {isSelected && <Check size={10} className="assign-check-icon" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer picker-footer">
          <div className="picker-footer-summary font-alamain">
            <span>
              <strong>{totalScheduledInWeek}</strong> tâche(s) planifiée(s) cette semaine
            </span>
          </div>

          <button
            type="button"
            className="btn-save-modal font-alamain"
            onClick={onClose}
          >
            <span>Fermer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeekTaskAssignModal;

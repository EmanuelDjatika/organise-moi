import React, { useState } from 'react';
import { X, Sun, Search, Plus, Check, ListTodo, Clock } from 'lucide-react';
import type { Task, Category } from '../types';
import { getTodayDateStr, isTaskOnDate } from '../utils/dateUtils';
import confetti from 'canvas-confetti';

interface TodayTaskPickerModalProps {
  isOpen: boolean;
  tasks: Task[];
  categories: Category[];
  onClose: () => void;
  onMoveToToday: (taskId: string) => void;
  onRemoveFromToday: (taskId: string) => void;
}

export const TodayTaskPickerModal: React.FC<TodayTaskPickerModalProps> = ({
  isOpen,
  tasks,
  categories,
  onClose,
  onMoveToToday,
  onRemoveFromToday,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const todayStr = getTodayDateStr();

  if (!isOpen) return null;

  // Filter tasks that are in 'todo' horizon or active tasks
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

  const todayTasks = candidateTasks.filter((t) => isTaskOnDate(t, todayStr, todayStr));

  const handleToggle = (task: Task) => {
    const isToday = isTaskOnDate(task, todayStr, todayStr);
    if (isToday) {
      onRemoveFromToday(task.id);
    } else {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6'],
      });
      onMoveToToday(task.id);
    }
  };

  // Group candidate tasks by category
  const categoriesWithTasks = categories.filter((cat) =>
    candidateTasks.some((t) => t.categoryId === cat.id)
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card picker-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge" style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>
              <Sun size={20} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">Choisir pour Ma Journée</h2>
              <p className="modal-subtitle">
                Sélectionnez les tâches à accomplir aujourd'hui
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
        <div className="modal-body picker-body-list">
          {candidateTasks.length === 0 ? (
            <div className="picker-empty-state font-alamain">
              <ListTodo size={32} style={{ color: '#94a3b8' }} />
              <p>Aucune tâche sans date.</p>
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

                    <div className="picker-items-grid">
                      {catTasks.map((task) => {
                        const isToday = isTaskOnDate(task, todayStr, todayStr);

                        return (
                        <div
                          key={task.id}
                          className={`picker-task-card ${isToday ? 'is-today-selected' : ''}`}
                          onClick={() => handleToggle(task)}
                        >
                          <div className="picker-task-info">
                            <span className="picker-task-title">{task.title}</span>
                            <div className="picker-task-meta">
                              {task.estimatedTime && (
                                <span className="picker-meta-pill">
                                  <Clock size={11} />
                                  <span>{task.estimatedTime}</span>
                                </span>
                              )}
                              {task.priority === 'high' && (
                                <span className="picker-priority-high">Urgent</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`btn-picker-action font-alamain ${isToday ? 'btn-picker-added' : 'btn-picker-add'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(task);
                            }}
                          >
                            {isToday ? (
                              <>
                                <Check size={14} />
                                <span>Aujourd'hui</span>
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span>Ajouter</span>
                              </>
                            )}
                          </button>
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
              <strong>{todayTasks.length}</strong> tâche(s) sélectionnée(s)
            </span>
          </div>

          <button
            type="button"
            className="btn-save-modal font-alamain"
            onClick={onClose}
          >
            <span>Valider</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodayTaskPickerModal;

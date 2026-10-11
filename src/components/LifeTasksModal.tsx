import React, { useState } from 'react';
import { X, Leaf, Plus, Search } from 'lucide-react';
import type { Task, Category } from '../types';
import { sortTasksWithCompletedFirst } from '../utils/taskWeightUtils';
import { TaskItem } from './TaskItem';

interface LifeTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  categories: Category[];
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddTask: (title: string, categoryId: string) => void;
}

export const LifeTasksModal: React.FC<LifeTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  categories,
  onToggleComplete,
  onDeleteTask,
  onUpdateTask,
  onAddTask,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>(() => {
    return categories.find((c) => c.id === 'personal' || c.id === 'shopping' || c.id === 'health')?.id || categories[0]?.id || 'personal';
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  if (!isOpen) return null;

  const lifeTasks = tasks.filter((t) => (t.horizon || 'todo') === 'life');
  const activeCount = lifeTasks.filter((t) => !t.completed && !t.cancelled).length;
  const completedCount = lifeTasks.filter((t) => t.completed && !t.cancelled).length;
  const cancelledCount = lifeTasks.filter((t) => Boolean(t.cancelled)).length;

  const filteredLifeTasks = sortTasksWithCompletedFirst(
    lifeTasks.filter((t) => {
      if (filter === 'active' && (t.completed || t.cancelled)) return false;
      if (filter === 'completed' && (!t.completed || t.cancelled)) return false;
      if (filter === 'cancelled' && !t.cancelled) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === t.categoryId);
        const matchCat = cat?.name.toLowerCase().includes(q);
        return Boolean(matchTitle || matchNotes || matchCat);
      }
      return true;
    })
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddTask(quickTitle.trim(), selectedCatId);
    setQuickTitle('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-life-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderColor: '#dcfce7', backgroundColor: '#f0fdf4' }}>
          <div className="modal-title-wrap">
            <div
              className="modal-icon-badge"
              style={{ backgroundColor: '#ffffff', color: '#047857', border: '1px solid #a7f3d0' }}
            >
              <Leaf size={18} />
            </div>
            <div>
              <h2 className="modal-title font-alamain" style={{ color: '#047857' }}>
                Tâches de Vie
              </h2>
              <p className="modal-subtitle">
                Habitudes, quotidien et équilibre personnel
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="category-count-minimal"
              style={{
                backgroundColor: '#ffffff',
                color: '#047857',
                border: '1px solid #a7f3d0',
                padding: '3px 10px',
                fontSize: '13px',
              }}
            >
              {completedCount}/{activeCount + completedCount}
            </span>
            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleAddSubmit} className="life-quick-add-form">
          <input
            type="text"
            placeholder="Nouvelle tâche (ex: Plantes, pharmacie...)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="life-quick-input"
            autoFocus
          />
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="life-cat-select"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-life-add font-alamain">
            <Plus size={14} />
            <span>Ajouter</span>
          </button>
        </form>

        {/* Filters & Search */}
        <div className="life-filters-bar">
          <div className="search-wrap-minimal picker-search-wrap" style={{ flex: '1 1 180px' }}>
            <Search size={14} className="search-icon-minimal" />
            <input
              type="text"
              placeholder="Rechercher une tâche de vie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-minimal font-alamain"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-minimal"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="filter-group-minimal">
            <button
              type="button"
              className={`filter-btn-minimal ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Toutes ({lifeTasks.length})
            </button>
            <button
              type="button"
              className={`filter-btn-minimal ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              En cours ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-btn-minimal ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Faites ({completedCount})
            </button>
            {cancelledCount > 0 && (
              <button
                type="button"
                className={`filter-btn-minimal filter-btn-cancelled ${filter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setFilter('cancelled')}
              >
                Annulées ({cancelledCount})
              </button>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="modal-body life-modal-body">
          {filteredLifeTasks.length === 0 ? (
            <div className="empty-favorites-box">
              <Leaf size={32} className="empty-favorites-icon" style={{ color: '#047857' }} />
              <p className="empty-favorites-text font-alamain">
                {lifeTasks.length === 0
                  ? 'Aucune tâche de vie.'
                  : 'Aucune tâche dans ce filtre.'}
              </p>
            </div>
          ) : (
            <div className="task-list-minimal">
              {filteredLifeTasks.map((task, idx) => (
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel font-alamain" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

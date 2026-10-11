import React, { useState, useRef, useEffect } from 'react';
import {
  Tag,
  CheckCircle2,
  Circle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  ListTodo,
  Leaf,
  Layers,
  Plus,
  Move,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { Task, Category, Horizon } from '../types';
import { useMindmapCanvas } from '../hooks/useMindmapCanvas';

interface OrgMindmapViewProps {
  tasks: Task[];
  categories: Category[];
  onToggleComplete: (id: string) => void;
  onAddTaskToCategory?: (categoryId: string, title: string, horizon?: Horizon) => void;
}

interface OrgConnection {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  isCurvedLeft: boolean;
}

export const OrgMindmapView: React.FC<OrgMindmapViewProps> = ({
  tasks,
  categories,
  onToggleComplete,
  onAddTaskToCategory,
}) => {
  const {
    zoom,
    pan,
    isDragging,
    isFullscreen,
    toggleFullscreen,
    resetView,
    zoomIn,
    zoomOut,
    viewportRef,
    worldRef,
    handleMouseDown,
    handleDoubleClick,
  } = useMindmapCanvas({ minZoom: 0.3, maxZoom: 2.5 });

  const [collapsedCategories, setCollapsedCategories] = useState<{ [catId: string]: boolean }>({});
  const [horizonFilter, setHorizonFilter] = useState<'all' | 'today' | 'todo' | 'life'>('all');
  const [quickAddCatId, setQuickAddCatId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [connections, setConnections] = useState<OrgConnection[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const centerNodeRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [id: string]: HTMLElement | null }>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const expandAll = () => setCollapsedCategories({});
  const collapseAll = () => {
    const allCollapsed: { [key: string]: boolean } = {};
    categories.forEach((c) => (allCollapsed[c.id] = true));
    setCollapsedCategories(allCollapsed);
  };

  const handleQuickAdd = (catId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim() || !onAddTaskToCategory) return;
    const horizon: Horizon = horizonFilter === 'all' ? 'todo' : horizonFilter;
    onAddTaskToCategory(catId, quickAddTitle.trim(), horizon);
    setQuickAddTitle('');
    setQuickAddCatId(null);
  };

  // Filter tasks according to horizon filter
  const filteredTasks = tasks.filter((t) => {
    if (horizonFilter === 'today' && (t.horizon || 'todo') !== 'today') return false;
    if (horizonFilter === 'todo' && (t.horizon || 'todo') !== 'todo') return false;
    if (horizonFilter === 'life' && (t.horizon || 'todo') !== 'life') return false;
    return true;
  });

  const totalCompleted = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((totalCompleted / tasks.length) * 100) : 0;

  // Split categories evenly between Left and Right
  const halfIdx = Math.ceil(categories.length / 2);
  const leftCategories = categories.slice(0, halfIdx);
  const rightCategories = categories.slice(halfIdx);

  // Compute SVG dynamic curves
  useEffect(() => {
    const updateConnections = () => {
      if (!worldRef.current || !centerNodeRef.current) return;
      const containerRect = worldRef.current.getBoundingClientRect();
      const centerRect = centerNodeRef.current.getBoundingClientRect();

      const centerCenterY = (centerRect.top + centerRect.height / 2 - containerRect.top) / zoom;
      const centerLeftX = (centerRect.left - containerRect.left) / zoom;
      const centerRightX = (centerRect.right - containerRect.left) / zoom;

      const newConnections: OrgConnection[] = [];

      // Left Categories
      leftCategories.forEach((cat) => {
        const catEl = nodeRefs.current[`cat-${cat.id}`];
        if (!catEl) return;
        const bRect = catEl.getBoundingClientRect();
        const catRightX = (bRect.right - containerRect.left) / zoom;
        const catLeftX = (bRect.left - containerRect.left) / zoom;
        const catCenterY = (bRect.top + bRect.height / 2 - containerRect.top) / zoom;
        const branchColor = cat.color || '#3b82f6';

        // Center -> Category (Level 0 -> Level 1)
        newConnections.push({
          id: `center-to-${cat.id}`,
          startX: centerLeftX,
          startY: centerCenterY,
          endX: catRightX,
          endY: catCenterY,
          color: branchColor,
          isCurvedLeft: true,
        });

        // Category -> Tasks (Level 1 -> Level 2 step further to the left)
        if (!collapsedCategories[cat.id]) {
          const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id);
          catTasks.forEach((task) => {
            const taskEl = nodeRefs.current[`task-${task.id}`];
            if (!taskEl) return;
            const tRect = taskEl.getBoundingClientRect();
            const taskRightX = (tRect.right - containerRect.left) / zoom;
            const taskCenterY = (tRect.top + tRect.height / 2 - containerRect.top) / zoom;

            newConnections.push({
              id: `${cat.id}-to-${task.id}`,
              startX: catLeftX,
              startY: catCenterY,
              endX: taskRightX,
              endY: taskCenterY,
              color: branchColor,
              isCurvedLeft: true,
            });
          });
        }
      });

      // Right Categories
      rightCategories.forEach((cat) => {
        const catEl = nodeRefs.current[`cat-${cat.id}`];
        if (!catEl) return;
        const bRect = catEl.getBoundingClientRect();
        const catLeftX = (bRect.left - containerRect.left) / zoom;
        const catRightX = (bRect.right - containerRect.left) / zoom;
        const catCenterY = (bRect.top + bRect.height / 2 - containerRect.top) / zoom;
        const branchColor = cat.color || '#3b82f6';

        // Center -> Category (Level 0 -> Level 1)
        newConnections.push({
          id: `center-to-${cat.id}`,
          startX: centerRightX,
          startY: centerCenterY,
          endX: catLeftX,
          endY: catCenterY,
          color: branchColor,
          isCurvedLeft: false,
        });

        // Category -> Tasks (Level 1 -> Level 2 step further to the right)
        if (!collapsedCategories[cat.id]) {
          const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id);
          catTasks.forEach((task) => {
            const taskEl = nodeRefs.current[`task-${task.id}`];
            if (!taskEl) return;
            const tRect = taskEl.getBoundingClientRect();
            const taskLeftX = (tRect.left - containerRect.left) / zoom;
            const taskCenterY = (tRect.top + tRect.height / 2 - containerRect.top) / zoom;

            newConnections.push({
              id: `${cat.id}-to-${task.id}`,
              startX: catRightX,
              startY: catCenterY,
              endX: taskLeftX,
              endY: taskCenterY,
              color: branchColor,
              isCurvedLeft: false,
            });
          });
        }
      });

      setConnections(newConnections);
    };

    const timer = setTimeout(updateConnections, 50);
    window.addEventListener('resize', updateConnections);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateConnections);
    };
  }, [tasks, categories, zoom, pan, collapsedCategories, horizonFilter, isFullscreen]);

  return (
    <div
      ref={rootRef}
      className={`mm-root-container font-sans ${isFullscreen ? 'mm-fullscreen-active' : ''}`}
    >
      {/* Top Controls Toolbar */}
      <div className="mm-top-toolbar">
        <div className="mm-toolbar-left">
          <div className="horizon-filter-pill-group font-sans">
            <button
              type="button"
              className={`filter-btn ${horizonFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setHorizonFilter('all')}
            >
              <Layers size={13} />
              <span>Toutes</span>
              <span className="filter-count-badge">{tasks.length}</span>
            </button>
            <button
              type="button"
              className={`filter-btn ${horizonFilter === 'today' ? 'is-active' : ''}`}
              onClick={() => setHorizonFilter('today')}
            >
              <Sun size={13} style={{ color: '#d97706' }} />
              <span>Journée</span>
              <span className="filter-count-badge">
                {tasks.filter((t) => (t.horizon || 'todo') === 'today').length}
              </span>
            </button>
            <button
              type="button"
              className={`filter-btn ${horizonFilter === 'todo' ? 'is-active' : ''}`}
              onClick={() => setHorizonFilter('todo')}
            >
              <ListTodo size={13} style={{ color: '#2563eb' }} />
              <span>Sans date</span>
              <span className="filter-count-badge">
                {tasks.filter((t) => (t.horizon || 'todo') === 'todo').length}
              </span>
            </button>
            <button
              type="button"
              className={`filter-btn ${horizonFilter === 'life' ? 'is-active' : ''}`}
              onClick={() => setHorizonFilter('life')}
            >
              <Leaf size={13} style={{ color: '#059669' }} />
              <span>Vie</span>
              <span className="filter-count-badge">
                {tasks.filter((t) => (t.horizon || 'todo') === 'life').length}
              </span>
            </button>
          </div>
        </div>

        <div className="mm-toolbar-right">
          <button type="button" className="mm-btn-text" onClick={expandAll}>
            Déplier tout
          </button>
          <button type="button" className="mm-btn-text" onClick={collapseAll}>
            Replier tout
          </button>

          <div className="mm-zoom-box">
            <button
              type="button"
              className="mm-btn-tool"
              onClick={zoomOut}
              title="Dézoomer (-)"
            >
              <ZoomOut size={14} />
            </button>
            <span
              className="mm-zoom-label"
              onClick={resetView}
              style={{ cursor: 'pointer' }}
              title="Cliquer pour réinitialiser le zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="mm-btn-tool"
              onClick={zoomIn}
              title="Zoomer (+)"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="mm-btn-tool"
              onClick={resetView}
              title="Recentrer (0)"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <button
            type="button"
            className={`mm-btn-tool mm-btn-fullscreen ${isFullscreen ? 'is-active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Mindmap Canvas Area */}
      <div
        ref={viewportRef}
        className={`mm-canvas-viewport ${isDragging ? 'is-dragging' : ''} ${isFullscreen ? 'mm-viewport-fullscreen' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div
          ref={worldRef}
          className="mm-canvas-world"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connecting Curves */}
          <svg className="mm-svg-layer" width="100%" height="100%">
            {connections.map((conn) => {
              const dx = Math.abs(conn.endX - conn.startX) * 0.5;
              const pathD = conn.isCurvedLeft
                ? `M ${conn.startX} ${conn.startY} C ${conn.startX - dx} ${conn.startY}, ${conn.endX + dx} ${conn.endY}, ${conn.endX} ${conn.endY}`
                : `M ${conn.startX} ${conn.startY} C ${conn.startX + dx} ${conn.startY}, ${conn.endX - dx} ${conn.endY}, ${conn.endX} ${conn.endY}`;

              return (
                <g key={conn.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={conn.color}
                    strokeWidth="1.8"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                  />
                  <circle cx={conn.endX} cy={conn.endY} r="2.5" fill={conn.color} opacity="0.6" />
                </g>
              );
            })}
          </svg>

          {/* 2-Sided Radial Layout with Level 1 & Level 2 Distinct Columns */}
          <div className="mm-radial-grid">
            {/* LEFT CATEGORIES */}
            <div className="mm-side-branches mm-left-side">
              {leftCategories.map((cat) => {
                const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id);
                const isCollapsed = Boolean(collapsedCategories[cat.id]);
                const completedCatCount = catTasks.filter((t) => t.completed).length;

                return (
                  <div key={cat.id} className="mm-branch-row-cluster mm-cluster-left">
                    {/* Level 2 Sub-tasks (Leftmost) */}
                    {!isCollapsed && (
                      <div className="mm-leaf-column mm-leaf-col-left">
                        {catTasks.length === 0 ? (
                          <div className="mm-leaf-empty">
                            <span>Aucune tâche</span>
                          </div>
                        ) : (
                          catTasks.map((task) => (
                            <div
                              key={task.id}
                              ref={(el) => {
                                nodeRefs.current[`task-${task.id}`] = el;
                              }}
                              className={`mm-task-leaf node-interactive ${task.completed ? 'is-completed' : ''}`}
                            >
                              <button
                                type="button"
                                className="mm-btn-check"
                                onClick={() => onToggleComplete(task.id)}
                              >
                                {task.completed ? (
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : (
                                  <Circle size={14} className="text-slate-400" />
                                )}
                              </button>
                              <span className="mm-task-title">{task.title}</span>
                              {task.priority && task.priority !== 'medium' && (
                                <span className={`mm-prio-badge prio-${task.priority}`}>
                                  {task.priority === 'high' ? 'Haut' : 'Bas'}
                                </span>
                              )}
                            </div>
                          ))
                        )}

                        {/* Quick Add Form */}
                        {onAddTaskToCategory && (
                          <div className="mm-quickadd-wrap node-interactive">
                            {quickAddCatId === cat.id ? (
                              <form
                                onSubmit={(e) => handleQuickAdd(cat.id, e)}
                                className="mm-quickadd-form"
                              >
                                <input
                                  type="text"
                                  className="mm-quickadd-input"
                                  placeholder="Nouvelle tâche..."
                                  value={quickAddTitle}
                                  onChange={(e) => setQuickAddTitle(e.target.value)}
                                  autoFocus
                                />
                                <button type="submit" className="mm-quickadd-btn">
                                  +
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="mm-btn-add-leaf"
                                onClick={() => setQuickAddCatId(cat.id)}
                              >
                                <Plus size={11} />
                                <span>Ajouter</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Level 1 Category Hub Node (Inner Left) */}
                    <div
                      ref={(el) => {
                        nodeRefs.current[`cat-${cat.id}`] = el;
                      }}
                      className={`mm-node-hub ${isCollapsed ? 'is-collapsed' : ''}`}
                      style={{
                        background: `${cat.color}0d`,
                        borderColor: `${cat.color}50`,
                        color: '#0f172a',
                      }}
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <Tag size={13} style={{ color: cat.color }} />
                      <span className="mm-hub-title">{cat.name}</span>
                      <span
                        className="mm-hub-count"
                        style={{
                          background: `${cat.color}1c`,
                          color: cat.color,
                          borderColor: `${cat.color}40`,
                        }}
                      >
                        {completedCatCount}/{catTasks.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CENTER HUB (Level 0) */}
            <div className="mm-center-column">
              <div ref={centerNodeRef} className="mm-center-core-card">
                <span className="mm-center-badge">Genèse 32:27</span>
                <h2 className="mm-center-title">Organisation</h2>
                <div className="center-progress-wrap">
                  <div className="center-progress-bar">
                    <div
                      className="center-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="center-progress-text">
                    {totalCompleted}/{tasks.length} complétées ({progressPercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT CATEGORIES */}
            <div className="mm-side-branches mm-right-side">
              {rightCategories.map((cat) => {
                const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id);
                const isCollapsed = Boolean(collapsedCategories[cat.id]);
                const completedCatCount = catTasks.filter((t) => t.completed).length;

                return (
                  <div key={cat.id} className="mm-branch-row-cluster mm-cluster-right">
                    {/* Level 1 Category Hub Node (Inner Right) */}
                    <div
                      ref={(el) => {
                        nodeRefs.current[`cat-${cat.id}`] = el;
                      }}
                      className={`mm-node-hub ${isCollapsed ? 'is-collapsed' : ''}`}
                      style={{
                        background: `${cat.color}0d`,
                        borderColor: `${cat.color}50`,
                        color: '#0f172a',
                      }}
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <Tag size={13} style={{ color: cat.color }} />
                      <span className="mm-hub-title">{cat.name}</span>
                      <span
                        className="mm-hub-count"
                        style={{
                          background: `${cat.color}1c`,
                          color: cat.color,
                          borderColor: `${cat.color}40`,
                        }}
                      >
                        {completedCatCount}/{catTasks.length}
                      </span>
                    </div>

                    {/* Level 2 Sub-tasks (Rightmost) */}
                    {!isCollapsed && (
                      <div className="mm-leaf-column mm-leaf-col-right">
                        {catTasks.length === 0 ? (
                          <div className="mm-leaf-empty">
                            <span>Aucune tâche</span>
                          </div>
                        ) : (
                          catTasks.map((task) => (
                            <div
                              key={task.id}
                              ref={(el) => {
                                nodeRefs.current[`task-${task.id}`] = el;
                              }}
                              className={`mm-task-leaf node-interactive ${task.completed ? 'is-completed' : ''}`}
                            >
                              <button
                                type="button"
                                className="mm-btn-check"
                                onClick={() => onToggleComplete(task.id)}
                              >
                                {task.completed ? (
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                ) : (
                                  <Circle size={14} className="text-slate-400" />
                                )}
                              </button>
                              <span className="mm-task-title">{task.title}</span>
                              {task.priority && task.priority !== 'medium' && (
                                <span className={`mm-prio-badge prio-${task.priority}`}>
                                  {task.priority === 'high' ? 'Haut' : 'Bas'}
                                </span>
                              )}
                            </div>
                          ))
                        )}

                        {/* Quick Add Form */}
                        {onAddTaskToCategory && (
                          <div className="mm-quickadd-wrap node-interactive">
                            {quickAddCatId === cat.id ? (
                              <form
                                onSubmit={(e) => handleQuickAdd(cat.id, e)}
                                className="mm-quickadd-form"
                              >
                                <input
                                  type="text"
                                  className="mm-quickadd-input"
                                  placeholder="Nouvelle tâche..."
                                  value={quickAddTitle}
                                  onChange={(e) => setQuickAddTitle(e.target.value)}
                                  autoFocus
                                />
                                <button type="submit" className="mm-quickadd-btn">
                                  +
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                className="mm-btn-add-leaf"
                                onClick={() => setQuickAddCatId(cat.id)}
                              >
                                <Plus size={11} />
                                <span>Ajouter</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Miro-style Floating Canvas Controls */}
        <div className="mm-floating-controls font-sans">
          <button
            type="button"
            className="mm-floating-btn"
            onClick={zoomOut}
            title="Dézoomer (-)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="mm-floating-zoom-btn"
            onClick={resetView}
            title="Cliquer pour réinitialiser le zoom à 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="mm-floating-btn"
            onClick={zoomIn}
            title="Zoomer (+)"
          >
            <ZoomIn size={14} />
          </button>

          <div className="mm-floating-divider" />

          <button
            type="button"
            className="mm-floating-btn"
            onClick={resetView}
            title="Recentrer la vue"
          >
            <RotateCcw size={13} />
          </button>

          <button
            type="button"
            className={`mm-floating-btn ${isFullscreen ? 'is-active' : ''}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Quitter le plein écran (Échap)' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>

        {/* Miro-style Gesture Hint */}
        <div className="mm-floating-hint font-sans">
          <Move size={12} className="text-slate-500" />
          <span>Défiler 4D • Pincer pour zoomer</span>
        </div>
      </div>
    </div>
  );
};

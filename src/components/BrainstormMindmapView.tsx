import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Layers,
  Milestone,
  CheckSquare,
  AlertTriangle,
  Plus,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Move,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { BrainstormAnalysis, Category, Horizon, Priority } from '../types';
import { useMindmapCanvas } from '../hooks/useMindmapCanvas';

interface BrainstormMindmapViewProps {
  analysis: BrainstormAnalysis;
  categories: Category[];
  onAddTaskToBoard: (title: string, categoryId: string, horizon?: Horizon, priority?: Priority) => void;
}

interface NodeConnection {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  isCurvedLeft: boolean;
}

export const BrainstormMindmapView: React.FC<BrainstormMindmapViewProps> = ({
  analysis,
  categories,
  onAddTaskToBoard,
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

  const [collapsedBranches, setCollapsedBranches] = useState<{ [branchKey: string]: boolean }>({});
  const [addedActionIds, setAddedActionIds] = useState<{ [actionId: string]: boolean }>({});
  const [connections, setConnections] = useState<NodeConnection[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const centerNodeRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [id: string]: HTMLElement | null }>({});

  const toggleBranch = (key: string) => {
    setCollapsedBranches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddAction = (act: {
    id: string;
    title: string;
    categoryName?: string;
    horizon?: Horizon;
    priority?: Priority;
  }) => {
    const matchedCategory =
      categories.find((c) => c.name.toLowerCase() === (act.categoryName || '').toLowerCase()) ||
      categories.find((c) => c.id === 'ideas') ||
      categories[0];

    onAddTaskToBoard(
      act.title,
      matchedCategory?.id || 'work',
      act.horizon || 'todo',
      act.priority || 'medium'
    );

    setAddedActionIds((prev) => ({ ...prev, [act.id]: true }));
  };

  // Re-calculate SVG Bezier connection lines
  useEffect(() => {
    const updateConnections = () => {
      if (!worldRef.current || !centerNodeRef.current) return;
      const containerRect = worldRef.current.getBoundingClientRect();
      const centerRect = centerNodeRef.current.getBoundingClientRect();

      const centerCenterY = (centerRect.top + centerRect.height / 2 - containerRect.top) / zoom;
      const centerLeftX = (centerRect.left - containerRect.left) / zoom;
      const centerRightX = (centerRect.right - containerRect.left) / zoom;

      const newConnections: NodeConnection[] = [];

      // Left Branches
      const leftBranchKeys = [
        { key: 'vision', color: '#0284c7', children: analysis.strategicDirections?.map((_, i) => `dir-${i}`) || [] },
        { key: 'milestones', color: '#059669', children: analysis.milestones?.map((m) => m.id) || [] },
        { key: 'risks', color: '#d97706', children: analysis.keyRisksOrConsiderations?.map((_, i) => `risk-${i}`) || [] },
      ];

      // Right Branches
      const rightBranchKeys = [
        { key: 'pillars', color: '#6366f1', children: analysis.pillars?.map((p) => p.id) || [] },
        { key: 'actions', color: '#e11d48', children: analysis.immediateActions?.map((a) => a.id) || [] },
        { key: 'next_steps', color: '#7c3aed', children: analysis.suggestedNextSteps?.map((_, i) => `step-${i}`) || [] },
      ];

      // Compute Left Connections
      leftBranchKeys.forEach(({ key, color, children }) => {
        const branchEl = nodeRefs.current[`branch-${key}`];
        if (!branchEl) return;
        const bRect = branchEl.getBoundingClientRect();
        const branchRightX = (bRect.right - containerRect.left) / zoom;
        const branchLeftX = (bRect.left - containerRect.left) / zoom;
        const branchCenterY = (bRect.top + bRect.height / 2 - containerRect.top) / zoom;

        // Center -> Branch
        newConnections.push({
          id: `center-to-${key}`,
          startX: centerLeftX,
          startY: centerCenterY,
          endX: branchRightX,
          endY: branchCenterY,
          color,
          isCurvedLeft: true,
        });

        // Branch -> Children (Step outward to the Left)
        if (!collapsedBranches[key]) {
          children.forEach((childId) => {
            const childEl = nodeRefs.current[`child-${childId}`];
            if (!childEl) return;
            const cRect = childEl.getBoundingClientRect();
            const childRightX = (cRect.right - containerRect.left) / zoom;
            const childCenterY = (cRect.top + cRect.height / 2 - containerRect.top) / zoom;

            newConnections.push({
              id: `${key}-to-${childId}`,
              startX: branchLeftX,
              startY: branchCenterY,
              endX: childRightX,
              endY: childCenterY,
              color,
              isCurvedLeft: true,
            });
          });
        }
      });

      // Compute Right Connections
      rightBranchKeys.forEach(({ key, color, children }) => {
        const branchEl = nodeRefs.current[`branch-${key}`];
        if (!branchEl) return;
        const bRect = branchEl.getBoundingClientRect();
        const branchLeftX = (bRect.left - containerRect.left) / zoom;
        const branchRightX = (bRect.right - containerRect.left) / zoom;
        const branchCenterY = (bRect.top + bRect.height / 2 - containerRect.top) / zoom;

        // Center -> Branch
        newConnections.push({
          id: `center-to-${key}`,
          startX: centerRightX,
          startY: centerCenterY,
          endX: branchLeftX,
          endY: branchCenterY,
          color,
          isCurvedLeft: false,
        });

        // Branch -> Children (Step outward to the Right)
        if (!collapsedBranches[key]) {
          children.forEach((childId) => {
            const childEl = nodeRefs.current[`child-${childId}`];
            if (!childEl) return;
            const cRect = childEl.getBoundingClientRect();
            const childLeftX = (cRect.left - containerRect.left) / zoom;
            const childCenterY = (cRect.top + cRect.height / 2 - containerRect.top) / zoom;

            newConnections.push({
              id: `${key}-to-${childId}`,
              startX: branchRightX,
              startY: branchCenterY,
              endX: childLeftX,
              endY: childCenterY,
              color,
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
  }, [analysis, zoom, pan, collapsedBranches, isFullscreen]);

  return (
    <div
      ref={rootRef}
      className={`mm-root-container font-sans ${isFullscreen ? 'mm-fullscreen-active' : ''}`}
    >
      {/* Mindmap Toolbar */}
      <div className="mm-top-toolbar">
        <div className="mm-toolbar-left">
          <div className="mm-badge-pill">
            <Compass size={14} className="text-slate-700" />
            <span>Mindmap Stratégique</span>
          </div>
          <span className="mm-drag-hint">
            <Move size={12} />
            <span>Navigation libre 4D • Pincer pour zoomer</span>
          </span>
        </div>

        <div className="mm-toolbar-right">
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
            onClick={() => {
              resetView();
              setCollapsedBranches({});
            }}
            title="Recentrer la vue"
          >
            <RotateCcw size={14} />
          </button>

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

      {/* Infinite Canvas */}
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
          {/* SVG Connector Curves */}
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

          {/* Radial 2-Sided Layout with Separate Columns for Level 1 & Level 2 */}
          <div className="mm-radial-grid">
            {/* LEFT BRANCHES (Level 1 + Level 2 further to the Left) */}
            <div className="mm-side-branches mm-left-side">
              {/* Branch: Vision */}
              <div className="mm-branch-row-cluster mm-cluster-left">
                {/* Level 2 Sub-elements (Leftmost) */}
                {!collapsedBranches['vision'] && (
                  <div className="mm-leaf-column mm-leaf-col-left">
                    <div
                      ref={(el) => {
                        nodeRefs.current['child-dir-vision'] = el;
                      }}
                      className="mm-leaf-node mm-leaf-blue"
                    >
                      <span className="mm-leaf-text font-medium">{analysis.vision}</span>
                    </div>
                    {analysis.strategicDirections?.map((dir, idx) => (
                      <div
                        key={idx}
                        ref={(el) => {
                          nodeRefs.current[`child-dir-${idx}`] = el;
                        }}
                        className="mm-leaf-node mm-leaf-blue"
                      >
                        <span className="mm-leaf-bullet">•</span>
                        <span className="mm-leaf-text">{dir}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Level 1 Branch Hub (Inner Left) */}
                <div
                  ref={(el) => {
                    nodeRefs.current['branch-vision'] = el;
                  }}
                  className={`mm-node-hub mm-hub-blue ${collapsedBranches['vision'] ? 'is-collapsed' : ''}`}
                  onClick={() => toggleBranch('vision')}
                >
                  <Compass size={14} className="text-slate-700" />
                  <span className="mm-hub-title">Vision & Cap</span>
                  <span className="mm-hub-count">{analysis.strategicDirections?.length || 1}</span>
                </div>
              </div>

              {/* Branch: Milestones */}
              {analysis.milestones?.length > 0 && (
                <div className="mm-branch-row-cluster mm-cluster-left">
                  {/* Level 2 Sub-elements (Leftmost) */}
                  {!collapsedBranches['milestones'] && (
                    <div className="mm-leaf-column mm-leaf-col-left">
                      {analysis.milestones.map((ms, idx) => (
                        <div
                          key={ms.id}
                          ref={(el) => {
                            nodeRefs.current[`child-${ms.id}`] = el;
                          }}
                          className="mm-leaf-node mm-leaf-emerald"
                        >
                          <div className="mm-leaf-header">
                            <span className="mm-step-tag">Jalon {idx + 1}</span>
                            {ms.timeline && <span className="mm-time-tag">{ms.timeline}</span>}
                          </div>
                          <span className="mm-leaf-title">{ms.phase}</span>
                          {ms.objectives?.length > 0 && (
                            <span className="mm-leaf-subtext">{ms.objectives.join(' • ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Level 1 Branch Hub */}
                  <div
                    ref={(el) => {
                      nodeRefs.current['branch-milestones'] = el;
                    }}
                    className={`mm-node-hub mm-hub-emerald ${collapsedBranches['milestones'] ? 'is-collapsed' : ''}`}
                    onClick={() => toggleBranch('milestones')}
                  >
                    <Milestone size={14} className="text-slate-700" />
                    <span className="mm-hub-title">Jalons</span>
                    <span className="mm-hub-count">{analysis.milestones.length}</span>
                  </div>
                </div>
              )}

              {/* Branch: Risks */}
              {analysis.keyRisksOrConsiderations?.length > 0 && (
                <div className="mm-branch-row-cluster mm-cluster-left">
                  {/* Level 2 Sub-elements */}
                  {!collapsedBranches['risks'] && (
                    <div className="mm-leaf-column mm-leaf-col-left">
                      {analysis.keyRisksOrConsiderations.map((risk, idx) => (
                        <div
                          key={idx}
                          ref={(el) => {
                            nodeRefs.current[`child-risk-${idx}`] = el;
                          }}
                          className="mm-leaf-node mm-leaf-amber"
                        >
                          <span className="mm-leaf-bullet text-slate-400">•</span>
                          <span className="mm-leaf-text">{risk}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Level 1 Branch Hub */}
                  <div
                    ref={(el) => {
                      nodeRefs.current['branch-risks'] = el;
                    }}
                    className={`mm-node-hub mm-hub-amber ${collapsedBranches['risks'] ? 'is-collapsed' : ''}`}
                    onClick={() => toggleBranch('risks')}
                  >
                    <AlertTriangle size={14} className="text-slate-700" />
                    <span className="mm-hub-title">Vigilance</span>
                    <span className="mm-hub-count">{analysis.keyRisksOrConsiderations.length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* CENTER ROOT CORE (Level 0) */}
            <div className="mm-center-column">
              <div ref={centerNodeRef} className="mm-center-core-card">
                <span className="mm-center-badge">Projet Clé</span>
                <h2 className="mm-center-title">{analysis.projectTitle}</h2>
                <p className="mm-center-tagline">{analysis.tagline}</p>
              </div>
            </div>

            {/* RIGHT BRANCHES (Level 1 + Level 2 further to the Right) */}
            <div className="mm-side-branches mm-right-side">
              {/* Branch: Pillars */}
              {analysis.pillars?.length > 0 && (
                <div className="mm-branch-row-cluster mm-cluster-right">
                  {/* Level 1 Branch Hub (Inner Right) */}
                  <div
                    ref={(el) => {
                      nodeRefs.current['branch-pillars'] = el;
                    }}
                    className={`mm-node-hub mm-hub-indigo ${collapsedBranches['pillars'] ? 'is-collapsed' : ''}`}
                    onClick={() => toggleBranch('pillars')}
                  >
                    <Layers size={14} className="text-slate-700" />
                    <span className="mm-hub-title">Piliers</span>
                    <span className="mm-hub-count">{analysis.pillars.length}</span>
                  </div>

                  {/* Level 2 Sub-elements (Rightmost) */}
                  {!collapsedBranches['pillars'] && (
                    <div className="mm-leaf-column mm-leaf-col-right">
                      {analysis.pillars.map((pillar) => (
                        <div
                          key={pillar.id}
                          ref={(el) => {
                            nodeRefs.current[`child-${pillar.id}`] = el;
                          }}
                          className="mm-leaf-node mm-leaf-indigo"
                        >
                          <span className="mm-leaf-title">{pillar.title}</span>
                          {pillar.description && (
                            <span className="mm-leaf-desc">{pillar.description}</span>
                          )}
                          {pillar.keyPoints?.length > 0 && (
                            <div className="mm-leaf-tags">
                              {pillar.keyPoints.map((kp, kIdx) => (
                                <span key={kIdx} className="mm-micro-tag">
                                  {kp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Branch: Actions */}
              {analysis.immediateActions?.length > 0 && (
                <div className="mm-branch-row-cluster mm-cluster-right">
                  {/* Level 1 Branch Hub */}
                  <div
                    ref={(el) => {
                      nodeRefs.current['branch-actions'] = el;
                    }}
                    className={`mm-node-hub mm-hub-pink ${collapsedBranches['actions'] ? 'is-collapsed' : ''}`}
                    onClick={() => toggleBranch('actions')}
                  >
                    <CheckSquare size={14} className="text-slate-700" />
                    <span className="mm-hub-title">Actions</span>
                    <span className="mm-hub-count">{analysis.immediateActions.length}</span>
                  </div>

                  {/* Level 2 Sub-elements (Rightmost) */}
                  {!collapsedBranches['actions'] && (
                    <div className="mm-leaf-column mm-leaf-col-right">
                      {analysis.immediateActions.map((act) => {
                        const isAdded = Boolean(addedActionIds[act.id]);
                        return (
                          <div
                            key={act.id}
                            ref={(el) => {
                              nodeRefs.current[`child-${act.id}`] = el;
                            }}
                            className="mm-leaf-node mm-leaf-pink node-interactive"
                          >
                            <div className="mm-action-row">
                              <span className="mm-leaf-title">{act.title}</span>
                              <button
                                type="button"
                                className={`mm-btn-add-action ${isAdded ? 'is-added' : ''}`}
                                onClick={() => handleAddAction(act)}
                                disabled={isAdded}
                                title="Ajouter à l'organisation"
                              >
                                {isAdded ? <Check size={11} /> : <Plus size={11} />}
                                <span>{isAdded ? 'Ajouté' : 'Ajouter'}</span>
                              </button>
                            </div>
                            <div className="mm-leaf-tags">
                              {act.estimatedTime && (
                                <span className="mm-micro-tag">{act.estimatedTime}</span>
                              )}
                              {act.categoryName && (
                                <span className="mm-micro-tag mm-tag-cat">{act.categoryName}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Branch: Next Steps */}
              {analysis.suggestedNextSteps?.length > 0 && (
                <div className="mm-branch-row-cluster mm-cluster-right">
                  {/* Level 1 Branch Hub */}
                  <div
                    ref={(el) => {
                      nodeRefs.current['branch-next_steps'] = el;
                    }}
                    className={`mm-node-hub mm-hub-cyan ${collapsedBranches['next_steps'] ? 'is-collapsed' : ''}`}
                    onClick={() => toggleBranch('next_steps')}
                  >
                    <Sparkles size={14} className="text-slate-700" />
                    <span className="mm-hub-title">Prochaines Étapes</span>
                    <span className="mm-hub-count">{analysis.suggestedNextSteps.length}</span>
                  </div>

                  {/* Level 2 Sub-elements (Rightmost) */}
                  {!collapsedBranches['next_steps'] && (
                    <div className="mm-leaf-column mm-leaf-col-right">
                      {analysis.suggestedNextSteps.map((step, idx) => (
                        <div
                          key={idx}
                          ref={(el) => {
                            nodeRefs.current[`child-step-${idx}`] = el;
                          }}
                          className="mm-leaf-node mm-leaf-cyan"
                        >
                          <span className="mm-leaf-bullet text-slate-400">•</span>
                          <span className="mm-leaf-text">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

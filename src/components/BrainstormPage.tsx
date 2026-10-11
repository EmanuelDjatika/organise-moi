import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Copy,
  Check,
  Search,
  Compass,
  Layers,
  Milestone,
  CheckSquare,
  AlertTriangle,
  Lightbulb,
  Send,
  Sparkles,
  FolderPlus,
} from 'lucide-react';
import { BrainstormMindmapView } from './BrainstormMindmapView';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import type {
  BrainstormSession,
  BrainstormAnalysis,
  BrainstormMode,
  Category,
  Horizon,
  Priority,
} from '../types';
import { analyzeBrainstormSession } from '../services/aiBrainstormer';
import confetti from 'canvas-confetti';

interface BrainstormPageProps {
  sessions: BrainstormSession[];
  categories: Category[];
  onSaveSession: (session: BrainstormSession) => void;
  onDeleteSession: (id: string) => void;
  onAddTaskToBoard: (title: string, categoryId: string, horizon?: Horizon, priority?: Priority) => void;
  onBackToBoard: () => void;
  apiKey: string;
  model: string;
}

const BRAINSTORM_MODES: Array<{ id: BrainstormMode; label: string; icon: React.FC<{ size?: number; className?: string }>; desc: string }> = [
  {
    id: 'structure',
    label: 'Structurer un projet',
    icon: Layers,
    desc: 'Vision, piliers majeurs, jalons et plan d\'exécution.',
  },
  {
    id: 'ideation',
    label: 'Explorer & Idéer',
    icon: Lightbulb,
    desc: 'Explorer de nouveaux angles, déclinaisons et opportunités.',
  },
  {
    id: 'roadmap',
    label: 'Feuille de route',
    icon: Milestone,
    desc: 'Ordonnancer les étapes chronologiques et jalons clés.',
  },
  {
    id: 'action_plan',
    label: 'Découpage en actions',
    icon: CheckSquare,
    desc: 'Extraire des tâches nettes prêtes à être exécutées.',
  },
];

export const BrainstormPage: React.FC<BrainstormPageProps> = ({
  sessions,
  categories,
  onSaveSession,
  onDeleteSession,
  onAddTaskToBoard,
  onBackToBoard,
  apiKey,
  model,
}) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return sessions.length > 0 ? sessions[0].id : null;
  });
  const [selectedMode, setSelectedMode] = useState<BrainstormMode>('structure');
  const [displayMode, setDisplayMode] = useState<'structured' | 'mindmap'>('structured');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [addedActions, setAddedActions] = useState<{ [key: string]: boolean }>({});
  const [selectedCategoryMap, setSelectedCategoryMap] = useState<{ [actionId: string]: string }>({});
  const [sessionToDelete, setSessionToDelete] = useState<BrainstormSession | null>(null);
  const recognitionRef = useRef<any>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Create a brand new brainstorm session
  const handleCreateNewSession = () => {
    const newSession: BrainstormSession = {
      id: `bs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: 'Nouveau projet',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    onSaveSession(newSession);
    setActiveSessionId(newSession.id);
    setInputText('');
  };

  // Launch AI Brainstorm Analysis
  const handleRunBrainstorm = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToUse = (customPrompt || inputText).trim();
    if (!promptToUse || isLoading) return;

    setIsLoading(true);

    let currentSession = activeSession;
    if (!currentSession) {
      currentSession = {
        id: `bs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: promptToUse.slice(0, 30) || 'Nouveau projet',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setActiveSessionId(currentSession.id);
    }

    try {
      const contextHistory = currentSession.lastAnalysis
        ? `Titre : ${currentSession.lastAnalysis.projectTitle}\nVision : ${currentSession.lastAnalysis.vision}`
        : '';

      const analysis = await analyzeBrainstormSession(
        promptToUse,
        selectedMode,
        contextHistory,
        apiKey,
        model,
        categories
      );

      const userMsg = {
        id: `msg-${Date.now()}-user`,
        role: 'user' as const,
        content: promptToUse,
        timestamp: Date.now(),
        mode: selectedMode,
      };

      const aiMsg = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant' as const,
        content: analysis.tagline || analysis.vision,
        timestamp: Date.now(),
        mode: selectedMode,
        analysis,
      };

      const updatedSession: BrainstormSession = {
        ...currentSession,
        title: analysis.projectTitle || currentSession.title,
        updatedAt: Date.now(),
        messages: [...currentSession.messages, userMsg, aiMsg],
        lastAnalysis: analysis,
      };

      onSaveSession(updatedSession);
      setInputText('');

      confetti({
        particleCount: 25,
        spread: 55,
        origin: { y: 0.65 },
        colors: ['#2563eb', '#10b981', '#f59e0b'],
      });
    } catch (err) {
      console.error('Erreur brainstorming IA:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch Action directly to Task Board
  const handleSendActionToBoard = (action: { id: string; title: string; categoryName?: string; horizon?: Horizon; priority?: Priority }) => {
    // Find matching category ID or fallback to first
    const chosenCatName = action.categoryName || '';
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === chosenCatName.toLowerCase()
    ) || categories.find((c) => c.id === 'ideas') || categories[0];

    const categoryId = selectedCategoryMap[action.id] || matchedCategory?.id || 'work';

    onAddTaskToBoard(
      action.title,
      categoryId,
      action.horizon || 'todo',
      action.priority || 'medium'
    );

    setAddedActions((prev) => ({ ...prev, [action.id]: true }));

    confetti({
      particleCount: 20,
      spread: 45,
      origin: { y: 0.75 },
    });
  };

  // Copy full project summary to clipboard
  const handleCopyMarkdown = (analysis: BrainstormAnalysis) => {
    const md = `# ${analysis.projectTitle}
> ${analysis.tagline}

## Vision & Orientation
${analysis.vision}

## Piliers Stratégiques
${analysis.pillars.map((p) => `### ${p.title}\n${p.description}\n${p.keyPoints.map((k) => `- ${k}`).join('\n')}`).join('\n\n')}

## Jalons & Feuille de Route
${analysis.milestones.map((m) => `- **${m.phase}** (${m.timeline || 'À planifier'}) : ${m.objectives.join(', ')}`).join('\n')}

## Actions Immédiates
${analysis.immediateActions.map((a) => `- [ ] ${a.title} (${a.estimatedTime || '45m'})`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Speech to text toggle
  const toggleSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript) {
          setInputText((prev) => (prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim()));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.lastAnalysis?.vision.toLowerCase().includes(q);
  });

  const latestAnalysis = activeSession?.lastAnalysis;

  return (
    <div className="brainstorm-page-container font-sans">
      {/* Top Header */}
      <header className="brainstorm-header">
        <div className="brainstorm-header-left">
          <button
            type="button"
            className="btn-back-board"
            onClick={onBackToBoard}
            title="Revenir au tableau d'organisation"
          >
            <ArrowLeft size={16} />
            <span>Tableau d'organisation</span>
          </button>
        </div>

        <div className="brainstorm-header-center">
          <h1 className="brainstorm-main-title">Espace Brainstorming & Projets</h1>
          <p className="brainstorm-sub-title">
            Structurez vos idées, projets et trajectoires avec l'aide de l'IA.
          </p>
        </div>

        <div className="brainstorm-header-right">
          <button
            type="button"
            className="btn-new-brainstorm"
            onClick={handleCreateNewSession}
            title="Nouveau projet / session"
          >
            <Plus size={15} />
            <span>Nouveau projet</span>
          </button>
        </div>
      </header>

      {/* Main Studio Grid: Sidebar + Canvas */}
      <div className="brainstorm-studio-grid">
        {/* Left Sidebar: Sessions history */}
        <aside className="brainstorm-sidebar">
          <div className="sidebar-top-bar">
            <div className="search-wrap-minimal flex-1">
              <Search size={14} className="search-icon-minimal" />
              <input
                type="text"
                placeholder="Chercher un projet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-minimal"
              />
            </div>
            <button
              type="button"
              className="btn-sidebar-add"
              onClick={handleCreateNewSession}
              title="Ajouter un projet"
            >
              <Plus size={15} />
            </button>
          </div>

          <div className="sessions-list">
            {filteredSessions.length === 0 ? (
              <div className="empty-sidebar-box">
                <FolderPlus size={24} className="opacity-40 mb-1" />
                <p>Aucun projet enregistré.</p>
                <button
                  type="button"
                  className="btn-link-action mt-2"
                  onClick={handleCreateNewSession}
                >
                  Créer un projet
                </button>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    className={`session-item-row ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <div className="session-item-content">
                      <h4 className="session-item-title">{s.title || 'Projet sans titre'}</h4>
                      <div className="session-item-meta">
                        <span>
                          {new Date(s.updatedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {s.lastAnalysis?.immediateActions?.length ? (
                          <span className="actions-badge">
                            {s.lastAnalysis.immediateActions.length} action{s.lastAnalysis.immediateActions.length > 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-delete-session"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(s);
                      }}
                      title="Supprimer ce projet"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Canvas: Active Brainstorm Studio */}
        <main className="brainstorm-canvas">
          {/* Mode Selector Tabs */}
          <div className="brainstorm-mode-tabs">
            {BRAINSTORM_MODES.map((m) => {
              const IconComp = m.icon;
              const isSelected = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mode-tab-btn ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMode(m.id)}
                  title={m.desc}
                >
                  <IconComp size={15} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Smart Input Box */}
          <section className="brainstorm-input-card">
            <form onSubmit={handleRunBrainstorm} className="brainstorm-input-form">
              <textarea
                className="brainstorm-textarea"
                placeholder={
                  selectedMode === 'structure'
                    ? "Décrivez votre idée, projet ou activité (ex: Je veux lancer une offre d'accompagnement pour les freelances sur 3 mois...)"
                    : selectedMode === 'ideation'
                    ? "Sur quel thème souhaitez-vous brainstormer des idées créatives ?"
                    : selectedMode === 'roadmap'
                    ? "Quelles sont les étapes clés ou directions que vous souhaitez ordonnancer ?"
                    : "Quels sont les objectifs que vous voulez découper en tâches d'action immédiate ?"
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={3}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRunBrainstorm();
                  }
                }}
              />

              <div className="brainstorm-input-footer">
                <div className="input-footer-left">
                  <button
                    type="button"
                    className={`btn-icon-minimal ${isListening ? 'listening' : ''}`}
                    onClick={toggleSpeech}
                    title={isListening ? 'Arrêter la dictée' : 'Dicter'}
                  >
                    {isListening ? <MicOff size={15} className="text-red-500" /> : <Mic size={15} />}
                    <span>{isListening ? 'Écoute...' : 'Dicter'}</span>
                  </button>
                  <span className="helper-shortcut">(Ctrl + Entrée)</span>
                </div>

                <button
                  type="submit"
                  className="btn-run-brainstorm"
                  disabled={isLoading || !inputText.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-loader-sm" />
                      <span>Analyse IA en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Brainstormer avec l'IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* View mode switcher: Structured Cards vs Mindmap */}
          {latestAnalysis && (
            <div className="brainstorm-view-switcher">
              <div className="view-switcher-pills font-alamain">
                <button
                  type="button"
                  className={`view-pill-btn font-alamain ${displayMode === 'structured' ? 'active' : ''}`}
                  onClick={() => setDisplayMode('structured')}
                >
                  <Layers size={14} />
                  <span>Cartes Structurées</span>
                </button>
                <button
                  type="button"
                  className={`view-pill-btn font-alamain ${displayMode === 'mindmap' ? 'active' : ''}`}
                  onClick={() => setDisplayMode('mindmap')}
                >
                  <Compass size={14} />
                  <span>Vue Mindmap</span>
                </button>
              </div>
            </div>
          )}

          {/* Structured Brainstorm Results Canvas or Mindmap View */}
          {latestAnalysis ? (
            displayMode === 'mindmap' ? (
              <BrainstormMindmapView
                analysis={latestAnalysis}
                categories={categories}
                onAddTaskToBoard={onAddTaskToBoard}
              />
            ) : (
              <div className="brainstorm-results-space">
                {/* Vision & Tagline Card */}
                <section className="analysis-card vision-hero-card">
                <div className="card-header-actions">
                  <div className="hero-badge">
                    <Compass size={14} className="text-slate-700" />
                    <span>Vision & Cap</span>
                  </div>
                  <div className="header-action-buttons">
                    <button
                      type="button"
                      className="btn-action-tool"
                      onClick={() => handleCopyMarkdown(latestAnalysis)}
                      title="Copier la synthèse en Markdown"
                    >
                      {copiedText ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                      <span>{copiedText ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <h2 className="vision-project-title">{latestAnalysis.projectTitle}</h2>
                <p className="vision-tagline">{latestAnalysis.tagline}</p>
                <div className="vision-body-box">
                  <p className="vision-description">{latestAnalysis.vision}</p>
                </div>

                {latestAnalysis.strategicDirections?.length > 0 && (
                  <div className="strategic-directions-bar">
                    <span className="directions-label">Axes :</span>
                    <div className="directions-pills">
                      {latestAnalysis.strategicDirections.map((dir, idx) => (
                        <span key={idx} className="direction-pill">
                          {dir}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Pillars Grid */}
              {latestAnalysis.pillars?.length > 0 && (
                <section className="analysis-card pillars-section">
                  <div className="section-title-wrap">
                    <Layers size={14} className="text-slate-700" />
                    <h3 className="section-title">Piliers</h3>
                  </div>

                  <div className="pillars-grid">
                    {latestAnalysis.pillars.map((pillar) => (
                      <div key={pillar.id} className="pillar-card">
                        <h4 className="pillar-title">{pillar.title}</h4>
                        <p className="pillar-desc">{pillar.description}</p>
                        {pillar.keyPoints?.length > 0 && (
                          <ul className="pillar-points-list">
                            {pillar.keyPoints.map((point, pIdx) => (
                              <li key={pIdx}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Milestones / Roadmap Timeline */}
              {latestAnalysis.milestones?.length > 0 && (
                <section className="analysis-card milestones-section">
                  <div className="section-title-wrap">
                    <Milestone size={14} className="text-slate-700" />
                    <h3 className="section-title">Jalons</h3>
                  </div>

                  <div className="milestones-timeline">
                    {latestAnalysis.milestones.map((ms, idx) => (
                      <div key={ms.id} className="milestone-item">
                        <div className="milestone-step-badge">{idx + 1}</div>
                        <div className="milestone-content">
                          <div className="milestone-head">
                            <h4 className="milestone-phase-title">{ms.phase}</h4>
                            {ms.timeline && <span className="milestone-time-pill">{ms.timeline}</span>}
                          </div>
                          {ms.objectives?.length > 0 && (
                            <ul className="milestone-obj-list">
                              {ms.objectives.map((obj, oIdx) => (
                                <li key={oIdx}>{obj}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Immediate Action Plan with 1-Click Dispatch to Board */}
              {latestAnalysis.immediateActions?.length > 0 && (
                <section className="analysis-card actions-dispatch-section">
                  <div className="section-title-wrap flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-slate-700" />
                      <h3 className="section-title">Actions Immédiates</h3>
                    </div>
                  </div>

                  <div className="actions-dispatch-list">
                    {latestAnalysis.immediateActions.map((act) => {
                      const isAdded = addedActions[act.id];
                      return (
                        <div key={act.id} className={`action-dispatch-row ${isAdded ? 'is-added' : ''}`}>
                          <div className="action-row-left">
                            <span className="action-title-text">{act.title}</span>
                            <div className="action-meta-badges">
                              {act.estimatedTime && (
                                <span className="badge-time">{act.estimatedTime}</span>
                              )}
                              {act.priority && (
                                <span className={`badge-priority priority-${act.priority}`}>
                                  {act.priority === 'high' ? 'Prioritaire' : act.priority === 'low' ? 'Secondaire' : 'Moyen'}
                                </span>
                              )}
                              {act.rationale && (
                                <span className="badge-rationale">{act.rationale}</span>
                              )}
                            </div>
                          </div>

                          <div className="action-row-right">
                            <select
                              className="select-category-action"
                              value={selectedCategoryMap[act.id] || ''}
                              onChange={(e) =>
                                setSelectedCategoryMap((prev) => ({ ...prev, [act.id]: e.target.value }))
                              }
                              title="Catégorie de destination"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className={`btn-add-action-board ${isAdded ? 'added' : ''}`}
                              onClick={() => handleSendActionToBoard(act)}
                              disabled={isAdded}
                              title="Ajouter cette tâche à votre tableau"
                            >
                              {isAdded ? (
                                <>
                                  <Check size={12} />
                                  <span>Ajoutée</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={12} />
                                  <span>Ajouter</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Risks & Key Considerations */}
              {latestAnalysis.keyRisksOrConsiderations?.length > 0 && (
                <section className="analysis-card risks-section">
                  <div className="section-title-wrap">
                    <AlertTriangle size={14} className="text-slate-700" />
                    <h3 className="section-title">Points de Vigilance</h3>
                  </div>
                  <ul className="risks-list">
                    {latestAnalysis.keyRisksOrConsiderations.map((risk, rIdx) => (
                      <li key={rIdx}>{risk}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Recommended Next Steps */}
              {latestAnalysis.suggestedNextSteps?.length > 0 && (
                <section className="analysis-card next-steps-section">
                  <div className="section-title-wrap">
                    <Sparkles size={14} className="text-slate-700" />
                    <h3 className="section-title">Prochaines Étapes</h3>
                  </div>
                  <ul className="next-steps-list">
                    {latestAnalysis.suggestedNextSteps.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            )
          ) : (
            <div className="empty-canvas-placeholder">
              <div className="empty-canvas-icon-box">
                <Compass size={36} className="text-blue-500" />
              </div>
              <h3>Votre espace de réflexion et de cadrage</h3>
              <p>
                Tapez une idée ou un projet ci-dessus pour que l'IA vous aide à en définir la vision, les piliers stratégiques, les jalons clés et les actions immédiates.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal for Brainstorm Session Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(sessionToDelete)}
        title="Supprimer le projet"
        subtitle="Brainstorming & Cadrage"
        message="Voulez-vous vraiment supprimer définitivement ce projet de brainstorming ainsi que toutes ses idées associées ?"
        itemName={sessionToDelete?.title}
        itemTypeLabel="Projet"
        confirmLabel="Supprimer le projet"
        isDangerHigh={true}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) {
            const idToDelete = sessionToDelete.id;
            onDeleteSession(idToDelete);
            if (activeSessionId === idToDelete) {
              const remaining = sessions.filter((sess) => sess.id !== idToDelete);
              setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
            }
            setSessionToDelete(null);
          }
        }}
      />
    </div>
  );
};

export default BrainstormPage;

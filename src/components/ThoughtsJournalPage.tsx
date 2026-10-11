import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Brain,
  Save,
  Trash2,
  Mic,
  MicOff,
  Search,
  Check,
  Plus,
  HelpCircle,
  Clock,
  Heart,
  Lightbulb,
  Copy,
  Layers,
} from 'lucide-react';
import type { ThoughtEntry, AIThoughtAnalysis, Category, Horizon } from '../types';
import { analyzeThoughtContent } from '../services/aiThoughtAnalyzer';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import confetti from 'canvas-confetti';

interface ThoughtsJournalPageProps {
  thoughts: ThoughtEntry[];
  categories: Category[];
  onSaveThought: (content: string, tag?: string) => Promise<ThoughtEntry>;
  onDeleteThought: (id: string) => void;
  onUpdateThoughtAnalysis: (id: string, analysis: AIThoughtAnalysis) => void;
  onAddTaskFromThought: (title: string, categoryName: string, horizon?: Horizon) => void;
  onBackToBoard: () => void;
  apiKey: string;
  model: string;
}

export const ThoughtsJournalPage: React.FC<ThoughtsJournalPageProps> = ({
  thoughts,
  categories,
  onSaveThought,
  onDeleteThought,
  onUpdateThoughtAnalysis,
  onAddTaskFromThought,
  onBackToBoard,
  apiKey,
  model,
}) => {
  const [inputText, setInputText] = useState('');
  const [analyzingIds, setAnalyzingIds] = useState<{ [id: string]: boolean }>({});
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedTasks, setAddedTasks] = useState<{ [key: string]: boolean }>({});
  const [thoughtToDelete, setThoughtToDelete] = useState<ThoughtEntry | null>(null);
  const recognitionRef = useRef<any>(null);

  // Trigger background AI reflection for a specific thought
  const runThoughtReflection = async (id: string, text: string) => {
    if (analyzingIds[id]) return;
    setAnalyzingIds((prev) => ({ ...prev, [id]: true }));

    try {
      const analysis = await analyzeThoughtContent(text, apiKey, model, categories);
      onUpdateThoughtAnalysis(id, analysis);
      confetti({
        particleCount: 20,
        spread: 45,
        origin: { y: 0.65 },
        colors: ['#10b981', '#6366f1', '#f59e0b'],
      });
    } catch (err) {
      console.error('Erreur réflexion IA:', err);
    } finally {
      setAnalyzingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // Simple save: records thought and immediately starts background reflection
  const handleSaveAndReflect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSave = inputText.trim();
    if (!textToSave) return;

    setInputText('');

    try {
      const newThought = await onSaveThought(textToSave);
      // Auto-expand so the user can see the AI reflection unfold
      setExpandedAnalysisId(newThought.id);
      // Start AI reflection in the background
      runThoughtReflection(newThought.id, textToSave);
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
    }
  };

  const handleCardClick = (thought: ThoughtEntry) => {
    if (expandedAnalysisId === thought.id) {
      setExpandedAnalysisId(null);
    } else {
      setExpandedAnalysisId(thought.id);
      // If not yet analyzed and not currently analyzing, launch reflection
      if (!thought.analysis && !analyzingIds[thought.id]) {
        runThoughtReflection(thought.id, thought.content);
      }
    }
  };

  const handleAddTask = (title: string, categoryName: string, keyId: string) => {
    onAddTaskFromThought(title, categoryName, 'todo');
    setAddedTasks((prev) => ({ ...prev, [keyId]: true }));
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.7 },
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeechRecognition = () => {
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

  const filteredThoughts = thoughts.filter((t) => {
    if (tagFilter !== 'all' && t.tag !== tagFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchContent = t.content.toLowerCase().includes(q);
      const matchTag = t.tag?.toLowerCase().includes(q);
      const matchSummary = t.analysis?.summary.toLowerCase().includes(q);
      return matchContent || matchTag || matchSummary;
    }
    return true;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const availableTags = Array.from(new Set(thoughts.map((t) => t.tag).filter(Boolean))) as string[];

  return (
    <div className="thoughts-page-container">
      {/* Top Bar Navigation */}
      <header className="thoughts-header">
        <div className="thoughts-header-left">
          <button
            type="button"
            className="btn-back-board font-alamain"
            onClick={onBackToBoard}
            title="Revenir au tableau d'organisation"
          >
            <ArrowLeft size={16} />
            <span>Tableau d'organisation</span>
          </button>
        </div>

        <div className="thoughts-header-center">
          <div className="thoughts-title-wrap">
            <h1 className="thoughts-main-title font-alamain">
              Journal de Pensées
            </h1>
            <p className="thoughts-sub-title">
              Déposez vos pensées et consultez les réflexions de l'IA.
            </p>
          </div>
        </div>

        <div className="thoughts-header-right">
          <span className="thoughts-count-badge font-alamain">
            {thoughts.length} pensée{thoughts.length > 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <main className="thoughts-content-layout">
        {/* Simple Composer Card */}
        <section className="thought-composer-card">
          <div className="composer-header">
            <span className="composer-tagline font-alamain">
              Nouvelle pensée
            </span>
            <span className="composer-ai-badge font-alamain">
              <Brain size={13} style={{ color: '#059669', display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              <span>Réflexion IA</span>
            </span>
          </div>

          <textarea
            className="thought-textarea"
            placeholder="Écrivez vos pensées, réflexions ou idées..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveAndReflect();
              }
            }}
            rows={4}
            autoFocus
          />

          <div className="composer-footer">
            <div className="composer-footer-left">
              <button
                type="button"
                className={`btn-icon-minimal ${isListening ? 'listening' : ''}`}
                onClick={toggleSpeechRecognition}
                title={isListening ? 'Arrêter la dictée' : 'Dicter'}
              >
                {isListening ? <MicOff size={16} className="text-red-500" /> : <Mic size={16} />}
                <span>{isListening ? 'Écoute...' : 'Micro'}</span>
              </button>
              <span className="composer-helper-hint font-alamain">
                (ou Ctrl + Entrée)
              </span>
            </div>

            <div className="composer-footer-actions">
              <button
                type="button"
                className="btn-save-thought-primary font-alamain"
                onClick={() => handleSaveAndReflect()}
                disabled={!inputText.trim()}
                title="Enregistrer"
              >
                <Save size={15} />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </section>

        {/* Past Thoughts History */}
        <section className="thoughts-history-section">
          <div className="history-bar">
            <h2 className="history-title font-alamain">
              Historique ({filteredThoughts.length})
            </h2>

            <div className="history-filters">
              <div className="search-wrap-minimal">
                <Search size={14} className="search-icon-minimal" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-minimal"
                />
              </div>

              {availableTags.length > 0 && (
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="history-tag-select font-alamain"
                >
                  <option value="all">Tous ({thoughts.length})</option>
                  {availableTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {filteredThoughts.length === 0 ? (
            <div className="empty-thoughts-box">
              <Lightbulb size={36} className="empty-icon-minimal" />
              <p className="empty-text font-alamain">
                {thoughts.length === 0
                  ? 'Aucune pensée enregistrée.'
                  : 'Aucun résultat trouvé.'}
              </p>
            </div>
          ) : (
            <div className="thoughts-timeline">
              {filteredThoughts.map((thought) => {
                const isExpanded = expandedAnalysisId === thought.id;
                const isAnalyzingThis = Boolean(analyzingIds[thought.id]);
                const hasAnalysis = Boolean(thought.analysis);

                return (
                  <article
                    key={thought.id}
                    className={`thought-card ${isExpanded ? 'is-expanded' : ''}`}
                    onClick={() => handleCardClick(thought)}
                  >
                    <div className="thought-card-top">
                      <div className="thought-card-meta">
                        {thought.tag && (
                          <span className="thought-tag-badge font-alamain">
                            {thought.tag}
                          </span>
                        )}
                        <span className="thought-date">
                          <Clock size={12} className="inline mr-1" />
                          {formatDate(thought.createdAt)}
                        </span>

                        {/* Status / Toggle Pill */}
                        {isAnalyzingThis ? (
                          <span className="thought-status-pill analyzing font-alamain">
                            <span className="spinner-loader-xs" />
                            <span>Réflexion...</span>
                          </span>
                        ) : hasAnalysis ? (
                          <span className="thought-status-pill ready font-alamain">
                            <Brain size={12} style={{ color: '#059669' }} />
                            <span>{isExpanded ? 'Masquer' : 'Voir réflexion'}</span>
                          </span>
                        ) : (
                          <span className="thought-status-pill pending font-alamain">
                            <Brain size={12} />
                            <span>Analyser</span>
                          </span>
                        )}
                      </div>

                      <div className="thought-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="tool-btn-minimal"
                          onClick={() => handleCopy(thought.content, thought.id)}
                          title="Copier"
                        >
                          {copiedId === thought.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                        <button
                          type="button"
                          className="tool-btn-minimal text-red-500"
                          onClick={() => setThoughtToDelete(thought)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="thought-card-content font-alamain">
                      {thought.content}
                    </p>

                    {/* Expandable AI Reflection Section */}
                    {isExpanded && (
                      <div
                        className="thought-reflection-container"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isAnalyzingThis ? (
                          <div className="thought-analyzing-card font-alamain">
                            <span className="spinner-loader-sm" />
                            <p>Réflexion en cours...</p>
                          </div>
                        ) : hasAnalysis && thought.analysis ? (
                          <div className="thought-reflection-body">
                            {/* Summary / Core Reflection */}
                            <div className="reflection-summary-box">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Brain size={15} style={{ color: '#059669' }} />
                                <span className="reflection-box-label font-alamain">Éclairage</span>
                              </div>
                              <p className="analysis-summary-text font-alamain">
                                {thought.analysis.summary}
                              </p>
                            </div>

                            {/* Clarity & Insights */}
                            <div className="analysis-grid-details">
                              {thought.analysis.clarityInsights?.length > 0 && (
                                <div className="analysis-block">
                                  <h5 className="analysis-block-title font-alamain">
                                    <Lightbulb size={13} className="text-amber-600" />
                                    <span>Prises de recul</span>
                                  </h5>
                                  <ul className="analysis-list">
                                    {thought.analysis.clarityInsights.map((i, idx) => (
                                      <li key={idx} className="analysis-list-item text-xs">
                                        {i}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {thought.analysis.actionableSteps?.length > 0 && (
                                <div className="analysis-block">
                                  <h5 className="analysis-block-title font-alamain">
                                    <Layers size={13} className="text-blue-600" />
                                    <span>Pistes d'action</span>
                                  </h5>
                                  <ul className="analysis-list">
                                    {thought.analysis.actionableSteps.map((s, idx) => (
                                      <li key={idx} className="analysis-list-item text-xs">
                                        {s}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Extracted Tasks with 1-click Transfer */}
                            {thought.analysis.extractedTasks && thought.analysis.extractedTasks.length > 0 && (
                              <div className="analysis-extracted-tasks-box mt-3">
                                <h5 className="analysis-block-title font-alamain">
                                  <Plus size={13} className="text-emerald-600" />
                                  <span>Actions suggérées :</span>
                                </h5>
                                <div className="extracted-tasks-list">
                                  {thought.analysis.extractedTasks.map((t, idx) => {
                                    const taskKey = `${thought.id}_${idx}`;
                                    const isAdded = addedTasks[taskKey];
                                    return (
                                      <div key={idx} className="extracted-task-row">
                                        <span className="extracted-task-title">{t.title}</span>
                                        <button
                                          type="button"
                                          className={`btn-add-to-board font-alamain ${isAdded ? 'added' : ''}`}
                                          disabled={isAdded}
                                          onClick={() => handleAddTask(t.title, t.categoryName, taskKey)}
                                        >
                                          {isAdded ? <Check size={12} /> : <Plus size={12} />}
                                          <span>{isAdded ? 'Ajoutée' : 'Ajouter'}</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Reflection Question & Encouragement */}
                            {thought.analysis.reflectionQuestion && (
                              <div className="analysis-quote-box mt-3">
                                <div className="quote-sub-box">
                                  <HelpCircle size={14} className="text-indigo-600 flex-shrink-0" />
                                  <p className="quote-text font-alamain text-xs">
                                    {thought.analysis.reflectionQuestion}
                                  </p>
                                </div>
                                {thought.analysis.encouragement && (
                                  <div className="encouragement-sub-box">
                                    <Heart size={13} className="text-pink-600 flex-shrink-0" />
                                    <span className="encouragement-text text-xs">
                                      {thought.analysis.encouragement}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Confirmation Modal for Thought Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(thoughtToDelete)}
        title="Supprimer la pensée"
        subtitle="Journal personnel"
        message="Voulez-vous vraiment supprimer cette pensée de votre journal ?"
        itemName={thoughtToDelete?.content}
        itemTypeLabel={thoughtToDelete?.tag || 'Pensée'}
        confirmLabel="Supprimer"
        onClose={() => setThoughtToDelete(null)}
        onConfirm={() => {
          if (thoughtToDelete) {
            onDeleteThought(thoughtToDelete.id);
            setThoughtToDelete(null);
          }
        }}
      />
    </div>
  );
};

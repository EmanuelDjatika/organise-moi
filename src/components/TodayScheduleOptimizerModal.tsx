import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Clock,
  Check,
  Copy,
  RotateCw,
  Sun,
  Flame,
  ArrowRight,
  Coffee,
  Sunset,
  AlertCircle,
} from 'lucide-react';
import type { Task, Category, TodayOptimizationResult, OptimizedScheduleTask } from '../types';
import { optimizeTodaySchedule, localFallbackOptimizer } from '../services/aiScheduleOptimizer';
import { getTodayDateStr, isTaskOnDate } from '../utils/dateUtils';
import confetti from 'canvas-confetti';

interface TodayScheduleOptimizerModalProps {
  isOpen: boolean;
  tasks: Task[];
  categories: Category[];
  apiKey?: string;
  model?: string;
  onClose: () => void;
  onApplyOrder: (orderedTasks: OptimizedScheduleTask[], result: TodayOptimizationResult) => void;
}

export const TodayScheduleOptimizerModal: React.FC<TodayScheduleOptimizerModalProps> = ({
  isOpen,
  tasks,
  categories,
  apiKey,
  model,
  onClose,
  onApplyOrder,
}) => {
  const [result, setResult] = useState<TodayOptimizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const todayStr = getTodayDateStr();
  const todayTasks = tasks.filter((t) => isTaskOnDate(t, todayStr, todayStr) && !t.completed && !t.cancelled);

  const loadOptimization = async () => {
    if (todayTasks.length === 0) {
      setResult({
        scheduleSummary: "Aucune tâche active pour aujourd'hui.",
        energyAdvice: "Ajoutez ou piochez des tâches sans date pour composer votre journée.",
        orderedTasks: [],
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await optimizeTodaySchedule(todayTasks, categories, apiKey, model);
      setResult(res);
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1'],
      });
    } catch (err) {
      console.error('Erreur optimisation planning:', err);
      const fallback = localFallbackOptimizer(todayTasks, categories);
      setResult(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOptimization();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!result || result.orderedTasks.length === 0) return;
    onApplyOrder(result.orderedTasks, result);
    onClose();
  };

  const handleCopySchedule = () => {
    if (!result) return;
    const lines = [
      `📅 PLANNING DU JOUR OPTIMISÉ (Avaler le crapaud & Pics d'énergie)`,
      `--------------------------------------------------`,
      `🐸 TÂCHE CRUCIALE (LE CRAPAUD) : ${result.frogTaskTitle || 'Non définie'}`,
      `💡 RAISON : ${result.frogRationale || ''}`,
      `⚡ CONSEIL D'ÉNERGIE : ${result.energyAdvice}`,
      ``,
      `CHRONOLOGIE PROPOSÉE :`,
      ...result.orderedTasks.map(
        (t) =>
          `[${t.order}] ${t.suggestedTimeSlot} - ${t.taskTitle} (${t.phaseLabel})\n    ↳ ${t.rationale}`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'morning_frog':
        return <Flame size={16} className="text-amber-600" />;
      case 'morning_focus':
        return <Sun size={16} className="text-yellow-600" />;
      case 'afternoon_low':
        return <Coffee size={16} className="text-stone-500" />;
      case 'afternoon_peak':
        return <Zap size={16} className="text-indigo-600" />;
      case 'evening_wrap':
        return <Sunset size={16} className="text-purple-600" />;
      default:
        return <Clock size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-schedule-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div
              className="modal-icon-badge"
              style={{ backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">
                Ordre de la journée
              </h2>
              <p className="modal-subtitle">
                Organisation selon vos cycles d'énergie
              </p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} title="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body schedule-modal-body">
          {isLoading ? (
            <div className="schedule-loading-state">
              <div className="spinner-loader-sm" />
              <h4 className="font-alamain">Optimisation de votre planning...</h4>
              <p className="schedule-loading-desc">
                Calcul des créneaux optimaux selon l'effort cognitif.
              </p>
            </div>
          ) : !result || todayTasks.length === 0 ? (
            <div className="empty-schedule-state">
              <AlertCircle size={32} style={{ color: '#94a3b8' }} />
              <p className="font-alamain">Aucune tâche pour aujourd'hui.</p>
              <span className="text-xs text-slate-500">
                Ajoutez des tâches dans Ma Journée pour générer l'ordre.
              </span>
            </div>
          ) : (
            <div className="schedule-content-wrap">
              {/* Frog Banner */}
              {result.frogTaskTitle && (
                <div className="schedule-frog-card">
                  <div className="frog-card-header">
                    <div className="frog-badge font-alamain">
                      <Flame size={13} />
                      <span>Le Crapaud du Jour</span>
                    </div>
                    <span className="frog-subtitle-tag font-alamain">Priorité #1</span>
                  </div>
                  <h3 className="frog-task-title font-alamain">{result.frogTaskTitle}</h3>
                  {result.frogRationale && (
                    <p className="frog-rationale">{result.frogRationale}</p>
                  )}
                </div>
              )}

              {/* Energy Advice Pill Card */}
              {result.energyAdvice && (
                <div className="schedule-energy-card">
                  <div className="energy-card-icon">
                    <Sun size={16} />
                  </div>
                  <div className="energy-card-body">
                    <span className="energy-card-title font-alamain">Conseil d'énergie</span>
                    <p className="energy-card-text">{result.energyAdvice}</p>
                  </div>
                </div>
              )}

              {/* Chronological Timeline */}
              <div className="schedule-timeline-section">
                <div className="schedule-timeline-header font-alamain">
                  <span className="timeline-section-title">
                    Planning proposé ({result.orderedTasks.length})
                  </span>
                  <button
                    type="button"
                    className="btn-refresh-schedule font-alamain"
                    onClick={loadOptimization}
                    disabled={isLoading}
                    title="Recalculer"
                  >
                    <RotateCw size={12} />
                    <span>Régénérer</span>
                  </button>
                </div>

                <div className="schedule-tasks-list">
                  {result.orderedTasks.map((item) => {
                    const originalTask = tasks.find((t) => t.id === item.taskId);
                    const cat = originalTask
                      ? categories.find((c) => c.id === originalTask.categoryId)
                      : null;

                    return (
                      <div
                        key={item.taskId}
                        className={`schedule-task-item ${item.isFrog ? 'is-frog-item' : ''}`}
                      >
                        {/* Left order & slot indicator */}
                        <div className="schedule-item-time-col">
                          <div className="schedule-order-circle font-alamain">
                            {item.order}
                          </div>
                          <div className="schedule-time-pill font-alamain">
                            <Clock size={11} />
                            <span>{item.suggestedTimeSlot}</span>
                          </div>
                        </div>

                        {/* Middle Task Details */}
                        <div className="schedule-item-main">
                          <div className="schedule-item-top-row">
                            <div className="schedule-item-phase-badge font-alamain">
                              {getPhaseIcon(item.phase)}
                              <span>{item.phaseLabel}</span>
                            </div>

                            {cat && (
                              <span
                                className="schedule-item-cat-tag font-alamain"
                                style={{
                                  backgroundColor: cat.bgColor || '#f1f5f9',
                                  color: cat.color,
                                  borderColor: cat.borderColor || '#cbd5e1',
                                }}
                              >
                                {cat.name}
                              </span>
                            )}

                            {item.isFrog && (
                              <span className="schedule-frog-pill font-alamain">
                                Crapaud
                              </span>
                            )}
                          </div>

                          <h4 className="schedule-item-title font-alamain">
                            {item.taskTitle}
                          </h4>

                          <p className="schedule-item-rationale">
                            <ArrowRight size={12} className="inline mr-1 text-slate-400" />
                            {item.rationale}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer schedule-footer">
          <div className="schedule-footer-left">
            {result && (
              <button
                type="button"
                className="btn-copy-schedule font-alamain"
                onClick={handleCopySchedule}
                title="Copier le planning"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>
            )}
          </div>

          <div className="schedule-footer-actions">
            <button
              type="button"
              className="btn-cancel font-alamain"
              onClick={onClose}
            >
              Fermer
            </button>

            {result && result.orderedTasks.length > 0 && (
              <button
                type="button"
                className="btn-apply-schedule font-alamain"
                onClick={handleApply}
                title="Appliquer l'ordre proposé"
              >
                <Zap size={14} />
                <span>Appliquer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayScheduleOptimizerModal;

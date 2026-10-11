import React, { useState, useEffect } from 'react';
import { X, KeyRound, Check, AlertCircle, ExternalLink, HelpCircle, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import type { GroqSettings } from '../types';
import { GROQ_MODELS } from '../constants/defaultCategories';
import { fetchAvailableGroqModels } from '../services/aiCategorizer';

interface ApiKeyModalProps {
  isOpen: boolean;
  settings: GroqSettings;
  onClose: () => void;
  onSave: (newSettings: GroqSettings) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState(settings.model || 'llama-3.1-70b-versatile');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Auto-fetch models if apiKey is present
  useEffect(() => {
    if (isOpen && apiKey && apiKey.trim().length > 5) {
      loadLiveModels(apiKey.trim());
    }
  }, [isOpen]);

  const loadLiveModels = async (key: string) => {
    setIsLoadingModels(true);
    const models = await fetchAvailableGroqModels(key);
    if (models.length > 0) {
      setAvailableModels(models);
      // If current model is not in the list, auto-select the best available
      if (!models.includes(model)) {
        const preferred = models.find((m) => m.includes('70b') || m.includes('8b')) || models[0];
        setModel(preferred);
      }
    }
    setIsLoadingModels(false);
  };

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Veuillez renseigner une clé API.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // First fetch models
      const models = await fetchAvailableGroqModels(apiKey.trim());
      if (models.length > 0) {
        setAvailableModels(models);
      }

      const activeModelToTest = model || (models.length > 0 ? models[0] : 'llama-3.1-8b-instant');

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: activeModelToTest,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        setTestResult({
          success: true,
          message: `Connexion réussie à Groq avec le modèle ${activeModelToTest} (${models.length} modèles détectés).`,
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setTestResult({
          success: false,
          message: data?.error?.message || `Erreur de connexion (${res.status})`,
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Impossible de joindre l\'API Groq (vérifiez votre connexion).',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      apiKey: apiKey.trim(),
      model,
    });
    onClose();
  };

  // Combine default preset and live fetched models
  const modelOptions = availableModels.length > 0
    ? availableModels.map((m) => ({ id: m, name: m }))
    : GROQ_MODELS;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">Clé API Groq</h2>
              <p className="modal-subtitle">Configuration du modèle et de l'accès IA</p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="modal-body">
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label font-alamain" style={{ margin: 0 }}>
                Clé API Groq (gsk_...)
              </label>
              {import.meta.env.VITE_GROQ_API_KEY && apiKey === import.meta.env.VITE_GROQ_API_KEY && (
                <span
                  className="font-alamain"
                  style={{
                    fontSize: '12px',
                    color: '#16a34a',
                    background: '#dcfce7',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 600,
                  }}
                >
                  ✓ Fichier .env
                </span>
              )}
            </div>
            <div className="input-with-eye-wrap">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="form-input form-input-with-eye"
                value={apiKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setApiKey(val);
                  if (val.trim().length > 15) {
                    loadLiveModels(val.trim());
                  }
                }}
                placeholder="gsk_..."
                autoFocus
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Masquer' : 'Afficher'}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="field-helper">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>
                {import.meta.env.VITE_GROQ_API_KEY && apiKey === import.meta.env.VITE_GROQ_API_KEY
                  ? 'Clé issue de la configuration .env'
                  : 'Stockée localement dans votre navigateur.'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label font-alamain">Modèle IA</label>
              {apiKey.trim().length > 5 && (
                <button
                  type="button"
                  onClick={() => loadLiveModels(apiKey.trim())}
                  className="btn-pill-action font-alamain"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  title="Actualiser la liste des modèles"
                >
                  <RefreshCw size={11} className={isLoadingModels ? 'animate-spin' : ''} />
                  <span>{isLoadingModels ? 'Chargement...' : 'Actualiser'}</span>
                </button>
              )}
            </div>
            <select
              className="form-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {testResult && (
            <div
              className={`test-result-alert ${
                testResult.success ? 'test-success' : 'test-error'
              }`}
            >
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="groq-help-box">
            <HelpCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="groq-help-text">
              <strong>Obtenir une clé API gratuite :</strong>
              <p>
                Créez votre clé en quelques secondes sur le portail Groq Cloud.
              </p>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="groq-link"
              >
                <span>Console Groq</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-test-key font-alamain"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
            >
              {isTesting ? 'Test...' : 'Tester'}
            </button>

            <div className="modal-submit-group">
              <button type="button" className="btn-cancel font-alamain" onClick={onClose}>
                Annuler
              </button>
              <button type="submit" className="btn-save-modal font-alamain">
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

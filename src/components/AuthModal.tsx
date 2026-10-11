import React, { useState } from 'react';
import { X, LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../services/supabaseService';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { user, error } = await signInWithEmail(email, password);
        if (error) {
          if (error.includes('Invalid login credentials')) {
            setErrorMsg('Email ou mot de passe incorrect.');
          } else {
            setErrorMsg(error);
          }
        } else if (user) {
          setSuccessMsg('Connexion réussie !');
          setTimeout(() => {
            onAuthSuccess(user);
            onClose();
          }, 600);
        }
      } else {
        const { user, error, needsEmailConfirmation } = await signUpWithEmail(email, password);
        if (error) {
          if (error.includes('already registered')) {
            setErrorMsg('Un compte existe déjà avec cette adresse email.');
          } else {
            setErrorMsg(error);
          }
        } else if (user) {
          if (needsEmailConfirmation) {
            setSuccessMsg('Compte créé ! Veuillez vérifier votre boîte mail pour confirmer votre inscription.');
          } else {
            setSuccessMsg('Compte créé et connecté avec succès !');
            setTimeout(() => {
              onAuthSuccess(user);
              onClose();
            }, 800);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="modal-backdrop font-sans" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2 className="modal-title">
              {mode === 'signin' ? 'Connexion' : 'Inscription'}
            </h2>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            <LogIn size={14} />
            <span>Se connecter</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            <UserPlus size={14} />
            <span>S'inscrire</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body auth-modal-body">
          {errorMsg && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert auth-alert-success">
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon-wrap">
              <Mail size={15} className="input-prefix-icon" />
              <input
                type="email"
                className="form-input form-input-with-prefix"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div className="input-with-icon-wrap">
              <Lock size={15} className="input-prefix-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input form-input-with-prefix form-input-with-eye"
                placeholder="6 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-privacy-notice">
            <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
            <span>Données privées et synchronisation chiffrée.</span>
          </div>

          <div className="modal-footer" style={{ marginTop: '16px', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Fermer
            </button>

            <button
              type="submit"
              className="btn-save-modal"
              disabled={isLoading || !email.trim() || !password}
              style={{ minWidth: '130px' }}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="spinner-loader-sm" />
                  <span>Chargement...</span>
                </span>
              ) : mode === 'signin' ? (
                <>
                  <LogIn size={15} />
                  <span>Connexion</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>S'inscrire</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;

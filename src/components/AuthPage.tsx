import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '../services/supabaseService';
import type { User } from '@supabase/supabase-js';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
          }, 500);
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
            }, 700);
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
    <div className="auth-page-container font-sans">
      <div className="auth-page-card">
        {/* Brand Header */}
        <div className="auth-page-brand">
          <h1 className="auth-page-title">Organise moi avant de partir</h1>
          <p className="auth-page-subtitle">
            {mode === 'signin' ? 'Connectez-vous pour retrouver vos tâches et pensées.' : 'Créez votre compte pour synchroniser vos données en toute sécurité.'}
          </p>
        </div>

        {/* Tab Switcher */}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-page-form">
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

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading || !email.trim() || !password}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="spinner-loader-sm" />
                <span>Chargement...</span>
              </span>
            ) : mode === 'signin' ? (
              <>
                <LogIn size={15} />
                <span>Se connecter</span>
              </>
            ) : (
              <>
                <UserPlus size={15} />
                <span>Créer mon compte</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;

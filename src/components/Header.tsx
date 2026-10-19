import { Cpu, User as UserIcon, Bookmark, LayoutGrid, Compass, Brain, Dumbbell } from 'lucide-react';
import { GROQ_MODELS } from '../constants/defaultCategories';
import type { User } from '@supabase/supabase-js';
import type { AppPage } from '../types';

interface HeaderProps {
  hasApiKey?: boolean;
  currentUser?: User | null;
  currentModel?: string;
  availableModels?: string[];
  favoriteQuotesCount?: number;
  currentPage?: AppPage;
  onNavigatePage?: (page: AppPage) => void;
  onOpenFavoritesModal?: () => void;
  onSelectModel?: (model: string) => void;
  onOpenApiKeyModal?: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser = null,
  currentModel = 'llama-3.1-8b-instant',
  availableModels = [],
  favoriteQuotesCount = 0,
  currentPage = 'board',
  onNavigatePage,
  onOpenFavoritesModal,
  onSelectModel,
  onOpenAuthModal,
  onSignOut,
}) => {
  // Combine custom available models if fetched, else standard GROQ_MODELS
  const modelsList = availableModels.length > 0
    ? availableModels.map((m) => {
        const found = GROQ_MODELS.find((gm) => gm.id === m);
        return { id: m, name: found ? found.name : m };
      })
    : GROQ_MODELS;

  return (
    <header className="app-header-minimal">
      <div className="header-minimal-container">
        <div className="header-minimal-brand">
          <h1 className="app-main-title font-alamain">Genèse 32:27</h1>

          {/* Navigation switchers */}
          {onNavigatePage && (
            <nav className="header-nav-pills font-sans">
              <button
                type="button"
                className={`header-nav-btn ${currentPage === 'board' ? 'is-active' : ''}`}
                onClick={() => onNavigatePage('board')}
                title="Tableau des tâches et journées"
              >
                <LayoutGrid size={13} />
                <span>Tableau</span>
              </button>
              <button
                type="button"
                className={`header-nav-btn ${currentPage === 'brainstorm' ? 'is-active' : ''}`}
                onClick={() => onNavigatePage('brainstorm')}
                title="Espace Brainstorming, Projets et Idées IA"
              >
                <Compass size={13} />
                <span>Brainstorming</span>
              </button>
              <button
                type="button"
                className={`header-nav-btn ${currentPage === 'thoughts' ? 'is-active' : ''}`}
                onClick={() => onNavigatePage('thoughts')}
                title="Journal de Pensées"
              >
                <Brain size={13} />
                <span>Pensées</span>
              </button>
              <button
                type="button"
                className={`header-nav-btn ${currentPage === 'fitness' ? 'is-active' : ''}`}
                onClick={() => onNavigatePage('fitness')}
                title="Espace Sport, Exercices et Défis Quotidiens"
              >
                <Dumbbell size={13} />
                <span>Sport & Défis</span>
              </button>
            </nav>
          )}
        </div>

        <div className="header-minimal-controls">
          {/* User Profile / Auth Button */}
          {currentUser ? (
            <button
              type="button"
              className="header-user-btn is-logged-in"
              onClick={onSignOut}
              title={`Connecté : ${currentUser.email || 'Compte'} • Cliquer pour se déconnecter`}
            >
              <UserIcon size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="header-user-btn"
              onClick={onOpenAuthModal}
              title="Connexion"
            >
              <UserIcon size={16} />
            </button>
          )}

          {/* Favorite Quotes Shortcut */}
          {onOpenFavoritesModal && (
            <button
              type="button"
              className="btn-header-quote font-alamain"
              onClick={onOpenFavoritesModal}
              title="Citations favorites"
            >
              <Bookmark size={13} style={{ color: '#b45309' }} />
              <span>Citations {favoriteQuotesCount > 0 ? `(${favoriteQuotesCount})` : ''}</span>
            </button>
          )}

          {/* Model Selector directly in Navbar */}
          <div className="header-model-pill" title="Modèle IA">
            <Cpu size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
            <select
              className="header-model-select font-alamain"
              value={currentModel}
              onChange={(e) => onSelectModel?.(e.target.value)}
              title="Modèle IA"
            >
              {modelsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;




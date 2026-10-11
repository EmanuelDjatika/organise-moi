import React from 'react';
import { X, Quote, RotateCw, Bookmark } from 'lucide-react';

interface AIBannerProps {
  tip: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenFavorites: () => void;
  favoritesCount: number;
  onDismiss: () => void;
  onRefresh?: () => void;
}

export const AIBanner: React.FC<AIBannerProps> = ({
  tip,
  isFavorite,
  onToggleFavorite,
  onOpenFavorites,
  favoritesCount,
  onDismiss,
  onRefresh,
}) => {
  if (!tip) return null;

  // Extract quote and author if formatted as « Quote » — Author or "Quote" - Author
  const parseTip = (raw: string) => {
    const trimmed = raw.trim();
    const match = trimmed.match(/^([«"“]?)(.*?)([»"”]?)\s*[—–-]\s*(.*)$/);
    if (match) {
      return {
        quoteText: match[2].trim(),
        author: match[4].trim(),
      };
    }
    return {
      quoteText: trimmed.replace(/^[«"“]/, '').replace(/[»"”]$/, '').trim(),
      author: '',
    };
  };

  const { quoteText, author } = parseTip(tip);

  return (
    <div className="ai-advice-banner font-sans">
      <Quote size={14} className="ai-quote-icon" style={{ color: '#0f172a' }} />

      <div className="ai-advice-body">
        <span className="ai-quote-text">« {quoteText} »</span>
        {author && <span className="ai-quote-author">— {author}</span>}
      </div>

      <div className="banner-actions-group">
        {favoritesCount > 0 && (
          <button
            type="button"
            className="btn-favorites-counter font-sans"
            onClick={onOpenFavorites}
            title="Voir mes citations favorites"
          >
            <Bookmark size={11} className="inline mr-1" stroke="#0f172a" color="#0f172a" />
            <span style={{ color: '#0f172a' }}>{favoritesCount}</span>
          </button>
        )}

        <button
          type="button"
          className={`btn-banner-action ${isFavorite ? 'favorite-active' : ''}`}
          onClick={onToggleFavorite}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Bookmark
            size={14}
            fill={isFavorite ? '#0f172a' : 'none'}
            stroke="#0f172a"
            color="#0f172a"
          />
        </button>

        {onRefresh && (
          <button
            type="button"
            className="btn-banner-action btn-refresh-quote"
            onClick={onRefresh}
            title="Autre citation"
          >
            <RotateCw size={13} stroke="#0f172a" color="#0f172a" />
          </button>
        )}

        <button
          type="button"
          className="btn-banner-action btn-dismiss-quote"
          onClick={onDismiss}
          title="Masquer"
        >
          <X size={14} stroke="#0f172a" color="#0f172a" />
        </button>
      </div>
    </div>
  );
};


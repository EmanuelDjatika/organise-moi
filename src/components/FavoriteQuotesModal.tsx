import React from 'react';
import { X, Quote, Trash2, Copy, Check, Bookmark, Eye } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface FavoriteQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  onRemoveFavorite: (quote: string) => void;
  onSelectQuote?: (quote: string) => void;
}

export const FavoriteQuotesModal: React.FC<FavoriteQuotesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onSelectQuote,
}) => {
  const [copiedQuote, setCopiedQuote] = React.useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (quote: string) => {
    navigator.clipboard.writeText(quote);
    setCopiedQuote(quote);
    setTimeout(() => {
      setCopiedQuote(null);
    }, 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-favorites-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div
              className="modal-icon-badge"
              style={{ backgroundColor: '#fffbeb', color: '#b45309' }}
            >
              <Bookmark size={18} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">Citations favorites</h2>
              <p className="modal-subtitle">
                {favorites.length} citation{favorites.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body favorites-modal-body">
          {favorites.length === 0 ? (
            <div className="empty-favorites-box">
              <Quote size={32} className="empty-favorites-icon" style={{ color: '#0f172a' }} />
              <p className="empty-favorites-text font-alamain">
                Aucune citation enregistrée.
              </p>
            </div>
          ) : (
            <div className="favorites-list">
              {favorites.map((quote, idx) => (
                <div key={idx} className="favorite-quote-item">
                  <div className="quote-item-content">
                    <Quote size={14} className="quote-item-mark" style={{ color: '#0f172a' }} />
                    <p className="quote-item-text font-alamain">{quote}</p>
                  </div>

                  <div className="quote-item-actions">
                    {onSelectQuote && (
                      <button
                        type="button"
                        className="btn-quote-action"
                        onClick={() => {
                          onSelectQuote(quote);
                          onClose();
                        }}
                        title="Afficher"
                      >
                        <Eye size={13} style={{ color: '#0f172a' }} />
                        <span>Afficher</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-quote-action"
                      onClick={() => handleCopy(quote)}
                      title="Copier"
                    >
                      {copiedQuote === quote ? (
                        <>
                          <Check size={13} style={{ color: '#16a34a' }} />
                          <span style={{ color: '#16a34a' }}>Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} style={{ color: '#0f172a' }} />
                          <span>Copier</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn-quote-action delete-quote-btn"
                      onClick={() => setQuoteToDelete(quote)}
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel font-alamain" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Removing Favorite Quote */}
      <ConfirmDeleteModal
        isOpen={Boolean(quoteToDelete)}
        title="Retirer des favoris"
        subtitle="Citations inspirantes"
        message="Voulez-vous vraiment retirer cette citation de vos favoris ?"
        itemName={quoteToDelete || undefined}
        itemTypeLabel="Citation"
        confirmLabel="Retirer"
        onClose={() => setQuoteToDelete(null)}
        onConfirm={() => {
          if (quoteToDelete) {
            onRemoveFavorite(quoteToDelete);
            setQuoteToDelete(null);
          }
        }}
      />
    </div>
  );
};

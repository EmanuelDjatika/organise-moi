import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  message?: string;
  itemName?: string;
  itemTypeLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerHigh?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title = 'Confirmer la suppression',
  subtitle = 'Action irréversible',
  message = 'Êtes-vous sûr de vouloir supprimer cet élément ?',
  itemName,
  itemTypeLabel,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  isDangerHigh = false,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-confirm-delete-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div
              className="modal-icon-badge"
              style={{
                backgroundColor: isDangerHigh ? '#fef2f2' : '#fff1f2',
                color: '#dc2626',
              }}
            >
              {isDangerHigh ? <AlertTriangle size={18} /> : <Trash2 size={18} />}
            </div>
            <div>
              <h2 className="modal-title font-alamain">{title}</h2>
              <p className="modal-subtitle">{subtitle}</p>
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

        <div className="modal-body confirm-delete-modal-body">
          <p className="confirm-delete-message font-alamain">{message}</p>

          {itemName && (
            <div className="confirm-delete-item-preview font-alamain">
              {itemTypeLabel && (
                <span className="confirm-preview-badge">{itemTypeLabel}</span>
              )}
              <div className="confirm-preview-text">
                &ldquo;{itemName.length > 180 ? itemName.substring(0, 180) + '...' : itemName}&rdquo;
              </div>
            </div>
          )}

          {isDangerHigh && (
            <div className="confirm-delete-warning-box font-alamain">
              <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <span>
                Attention : Toutes les données associées seront effacées définitivement de manière irréversible.
              </span>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '20px', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn-cancel font-alamain"
              onClick={onClose}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              className="btn-danger-confirm font-alamain"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              autoFocus
            >
              <Trash2 size={14} />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;

import React from 'react';
import { LogOut, X, ShieldCheck } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  userEmail?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  userEmail,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <LogOut size={20} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">Déconnexion</h2>
              <p className="modal-subtitle">Fermer votre session</p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
            Voulez-vous vous déconnecter
            {userEmail ? (
              <> ({userEmail}) ?</>
            ) : (
              ' ?'
            )}
          </p>

          <div
            className="auth-privacy-notice font-alamain"
            style={{ marginTop: '14px', background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}
          >
            <ShieldCheck size={16} style={{ color: '#059669', flexShrink: 0 }} />
            <span>Vos données restent sauvegardées et synchronisées.</span>
          </div>

          <div className="modal-footer" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="btn-cancel font-alamain"
              onClick={onClose}
            >
              Annuler
            </button>

            <button
              type="button"
              className="btn-save-modal font-alamain"
              style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#ffffff' }}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              <LogOut size={15} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;

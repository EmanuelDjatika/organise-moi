import React, { useState } from 'react';
import { X, Copy, Check, FileText, Download } from 'lucide-react';
import type { Task, Category } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  tasks: Task[];
  categories: Category[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  tasks,
  categories,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'markdown' | 'text' | 'json'>('markdown');

  if (!isOpen) return null;

  const generateExportText = () => {
    if (format === 'json') {
      return JSON.stringify({ tasks, categories }, null, 2);
    }

    let text = `# Mon Organisation (${new Date().toLocaleDateString('fr-FR')})\n\n`;

    categories.forEach((cat) => {
      const catTasks = tasks.filter((t) => t.categoryId === cat.id);
      if (catTasks.length === 0) return;

      text += `## ${cat.name}\n`;
      catTasks.forEach((t) => {
        const check = t.cancelled ? '[-]' : t.completed ? '[x]' : '[ ]';
        const cancelTag = t.cancelled ? ' [ANNULÉE]' : '';
        const priorityTag = t.priority === 'high' ? ' [URGENT]' : '';
        const dueTag = t.dueDate ? ` (Date: ${t.dueDate})` : '';
        const timeTag = t.estimatedTime ? ` (Duree: ${t.estimatedTime})` : '';
        text += `- ${check} ${t.title}${cancelTag}${priorityTag}${dueTag}${timeTag}\n`;
        if (t.subtasks && t.subtasks.length > 0) {
          t.subtasks.forEach((st) => {
            const stCheck = st.completed ? '[x]' : '[ ]';
            text += `  - ${stCheck} ${st.title}\n`;
          });
        }
      });
      text += '\n';
    });

    return text;
  };

  const exportContent = generateExportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organisation-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-export-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="modal-title font-alamain">Exporter</h2>
              <p className="modal-subtitle">Télécharger ou copier vos données</p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="format-picker font-alamain">
            <button
              type="button"
              className={`format-btn ${format === 'markdown' ? 'active' : ''}`}
              onClick={() => setFormat('markdown')}
            >
              Markdown (.md)
            </button>
            <button
              type="button"
              className={`format-btn ${format === 'text' ? 'active' : ''}`}
              onClick={() => setFormat('text')}
            >
              Texte (.txt)
            </button>
            <button
              type="button"
              className={`format-btn ${format === 'json' ? 'active' : ''}`}
              onClick={() => setFormat('json')}
            >
              JSON
            </button>
          </div>

          <div className="export-preview-box">
            <pre>{exportContent}</pre>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary font-alamain" onClick={handleDownload}>
              <Download size={16} />
              <span>Télécharger</span>
            </button>

            <button type="button" className="btn-save-modal font-alamain" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-300" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

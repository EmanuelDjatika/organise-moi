import React, { useState, useRef } from 'react';
import { RotateCcw, Mic, MicOff, ArrowRight } from 'lucide-react';

interface BrainDumpInputProps {
  onOrganize: (rawText: string, mode: 'append' | 'replace') => Promise<void>;
  isLoading: boolean;
  hasApiKey: boolean;
  model?: string;
}

export const BrainDumpInput: React.FC<BrainDumpInputProps> = ({
  onOrganize,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    await onOrganize(inputText, 'append');
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift + Enter (or Ctrl+Enter / Cmd+Enter) to submit
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setInputText('');
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + '\n';
          }
        }
        if (finalTranscript) {
          setInputText((prev) => (prev ? prev + '\n' + finalTranscript.trim() : finalTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <section className="braindump-section-minimal" id="brain-dump-input">
      <form onSubmit={handleSubmit} className="braindump-box-minimal">
        <textarea
          className="braindump-textarea-minimal"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez vos tâches en vrac (Shift + Entrée pour classer)..."
          rows={3}
          disabled={isLoading}
          autoFocus
        />

        <div className="braindump-bar-minimal">
          <div className="braindump-bar-left">
            <button
              type="button"
              className={`btn-icon-minimal ${isListening ? 'listening' : ''}`}
              onClick={toggleSpeechRecognition}
              title={isListening ? 'Arrêter la dictée' : 'Dicter'}
            >
              {isListening ? <MicOff size={16} className="text-red-500" /> : <Mic size={16} />}
              <span>{isListening ? 'Écoute...' : 'Micro'}</span>
            </button>

            {inputText && (
              <button
                type="button"
                className="btn-icon-minimal text-muted"
                onClick={handleClear}
                title="Effacer"
              >
                <RotateCcw size={14} />
                <span>Effacer</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="btn-organize-minimal font-alamain"
            disabled={!inputText.trim() || isLoading}
            title="Organiser (Shift + Entrée)"
          >
            {isLoading ? (
              <>
                <span className="spinner-loader-sm" />
                <span>Organisation...</span>
              </>
            ) : (
              <>
                <span>Organiser</span>
                <span className="shortcut-tag font-sans">Shift + ↵</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

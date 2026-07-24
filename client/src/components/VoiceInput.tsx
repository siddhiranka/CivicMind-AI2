import React, { useState, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface VoiceInputProps {
  onResult: (text: string) => void;
  isListening?: boolean;
  onListeningChange?: (isListening: boolean) => void;
  className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onResult, 
  isListening: externalIsListening, 
  onListeningChange,
  className = ""
}) => {
  const [internalIsListening, setInternalIsListening] = useState(false);
  const { i18n } = useTranslation();
  
  const isListening = externalIsListening !== undefined ? externalIsListening : internalIsListening;

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser.");
    }
  }, []);

  const handleToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      if (onListeningChange) onListeningChange(false);
      setInternalIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      const langMap: Record<string, string> = {
        en: 'en-IN',
        hi: 'hi-IN',
        mr: 'mr-IN'
      };
      const activeLang = langMap[i18n.language] || 'en-IN';
      recognition.lang = activeLang;

      recognition.onstart = () => {
        if (onListeningChange) onListeningChange(true);
        setInternalIsListening(true);
        toast.info(`Voice input listening (${activeLang})...`);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
          toast.success('Speech recognized!');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (onListeningChange) onListeningChange(false);
        setInternalIsListening(false);
      };

      recognition.onend = () => {
        if (onListeningChange) onListeningChange(false);
        setInternalIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      if (onListeningChange) onListeningChange(false);
      setInternalIsListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`p-2 rounded-full transition-all flex items-center justify-center shrink-0 border border-border ${
        isListening ? 'bg-destructive text-destructive-foreground animate-pulse border-destructive' : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-primary'
      } ${className}`}
      title="Voice Input (Microphone)"
    >
      <Mic size={18} />
    </button>
  );
};

export default VoiceInput;

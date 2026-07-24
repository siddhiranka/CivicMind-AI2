import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import VoiceInput from './VoiceInput';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const defaultMessages: Message[] = [
    { role: 'ai', content: t('chat.defaultMsg', "Hello! I'm CivicMind AI. Ask me about live community issues, priority recommendations, or predictive trends.") }
  ];
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    t('chat.suggestions.urgent'),
    t('chat.suggestions.report'),
    t('chat.suggestions.unresolved'),
    t('chat.suggestions.predict')
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleClear = () => {
    setMessages(defaultMessages);
  };

  const handleSend = async (overrideMsg?: string) => {
    const msgToSend = overrideMsg || input;
    if (!msgToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: msgToSend.trim() }]);
    if (!overrideMsg) setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgToSend.trim(), language: i18n.language })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I'm having trouble connecting to the network right now." }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragConstraints={{ top: -500, left: -800, right: 0, bottom: 0 }}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-24 w-auto sm:w-[440px] h-[80vh] sm:h-[600px] bg-background/90 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl flex flex-col overflow-hidden z-50 cursor-default"
        >
          {/* Header */}
          <div className="p-4 bg-primary text-primary-foreground flex justify-between items-center cursor-grab active:cursor-grabbing border-b border-primary-foreground/20">
            <div className="flex items-center gap-2">
              <Bot size={24} />
              <h3 className="font-bold tracking-wide">CivicMind AI</h3>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClear} className="hover:bg-primary-foreground/20 p-2 rounded-full transition-colors" title={t('chat.clearChat')}>
                <Trash2 size={18} />
              </button>
              <button onClick={onClose} className="hover:bg-primary-foreground/20 p-2 rounded-full transition-colors" title={t('common.close')}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-sm shadow-md' : 'bg-secondary/60 backdrop-blur-md text-foreground rounded-bl-sm shadow-sm border border-white/5'}`}>
                  {msg.role === 'ai' ? (
                     <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-background/50 prose-strong:text-primary">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                     </div>
                  ) : (
                     <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start">
                <div className="bg-secondary/60 backdrop-blur-md text-foreground p-4 rounded-3xl rounded-bl-sm border border-white/5 shadow-sm flex gap-1.5 items-center">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-foreground/50 rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-foreground/50 rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-foreground/50 rounded-full" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Suggestions */}
          {messages.length === 1 && !isTyping && (
             <div className="px-4 pb-2 flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                   <button 
                      key={i} 
                      onClick={() => handleSend(s)}
                      className="text-xs bg-secondary hover:bg-secondary/80 text-foreground border border-border px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                   >
                      <Sparkles size={12} className="text-primary"/> {s}
                   </button>
                ))}
             </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t('chat.placeholder')}
              className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <VoiceInput onResult={(text) => setInput(prev => prev ? `${prev} ${text}` : text)} />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatBot;

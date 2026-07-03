'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './chat.module.css';
import { Plus, Clock, ChevronDown, ArrowUp, Edit3, GraduationCap, Code, Home, Flower2 } from 'lucide-react';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const submitMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessages([...newMessages, { role: 'model', content: data.text }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(input);
    setInput('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const renderInputBox = () => (
    <div className={styles.inputContainer}>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="How can I help you today?"
        className={styles.textarea}
        disabled={isLoading}
        rows={1}
      />
      <div className={styles.inputBottomRow}>
        <div className={styles.leftIcons}>
          <button className={styles.iconButton} type="button" title="Upload file (not active)"><Plus size={18} /></button>
          <button className={styles.iconButton} type="button" title="Chat history"><Clock size={18} /></button>
        </div>
        <div className={styles.rightControls}>
          <div className={styles.modelSelect}>
            Book Tutor <ChevronDown size={16} />
          </div>
          <button 
            type="submit" 
            onClick={handleSubmit}
            className={styles.sendButton} 
            disabled={isLoading || !input.trim()}
            title="Send Message"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );

  if (messages.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.landing}>
          <div className={styles.logo}>
            <Flower2 size={48} strokeWidth={1.5} />
          </div>
          <h1 className={styles.greeting}>
            Good morning, <span className={styles.name}>Saify<span className={styles.underline}></span></span>
          </h1>
          
          {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
          
          <form style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            {renderInputBox()}
          </form>
          
          <div className={styles.disclaimer}>
            AI can make mistakes. Please check important information.
          </div>
          
          <div className={styles.suggestions}>
            <button type="button" className={styles.suggestionPill} onClick={() => submitMessage("Can you summarize the first chapter?")}>
              <Edit3 size={16} /> Write
            </button>
            <button type="button" className={styles.suggestionPill} onClick={() => submitMessage("Teach me an important concept from the book.")}>
              <GraduationCap size={16} /> Learn
            </button>
            <button type="button" className={styles.suggestionPill} onClick={() => submitMessage("What are the important questions for the exam?")}>
              <Code size={16} /> Code
            </button>
            <button type="button" className={styles.suggestionPill} onClick={() => submitMessage("Explain the main theme of the story.")}>
              <Home size={16} /> Life stuff
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.chatHeader}>
        <div className={styles.headerLogo}>
          <Flower2 size={24} color="#d97757" />
          Book Tutor
        </div>
      </header>

      <div className={styles.chatHistory}>
        {messages.map((msg, idx) => (
          <div key={idx} className={styles.messageRow}>
            <div className={styles.messageContent}>
              {msg.role === 'model' && (
                <div className={styles.modelAvatar}>
                  <Flower2 size={20} />
                </div>
              )}
              <div className={msg.role === 'user' ? styles.userContent : styles.modelContent}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={styles.messageRow}>
            <div className={styles.messageContent}>
              <div className={styles.modelAvatar}>
                <Flower2 size={20} />
              </div>
              <div className={styles.modelContent} style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontStyle: 'italic', color: '#a1a1aa' }}>Searching Knowledge Base (OKF)...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className={styles.inputFooter}>
        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        <div className={styles.chatInputContainer}>
          {renderInputBox()}
        </div>
        <div className={styles.disclaimer}>
            AI can make mistakes. Please check important information.
        </div>
      </div>
    </div>
  );
}

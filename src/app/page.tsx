'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './chat.module.css';
import { Plus, Clock, ChevronDown, ArrowUp, Edit3, GraduationCap, Code, Home, Flower2, MessageSquare, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type Message = {
  role: 'user' | 'model';
  content: string;
};

type ChatHistory = {
  id: string;
  title: string;
  created_at: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth & History State
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Chats when user changes
  useEffect(() => {
    if (user) {
      loadChats();
    } else {
      setChats([]);
      setCurrentChatId(null);
      setMessages([]);
    }
  }, [user]);

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('id, title, created_at')
      .order('created_at', { ascending: false });
    
    if (data) setChats(data);
  };

  const loadMessages = async (chatId: string) => {
    setCurrentChatId(chatId);
    const { data, error } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data as Message[]);
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) setError(error.message);
      else {
        alert('Check your email for the confirmation link or you might be logged in directly if email confirmation is off.');
        setShowAuthModal(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setError(error.message);
      else setShowAuthModal(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
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
    
    let activeChatId = currentChatId;

    try {
      // 1. Create chat if needed
      if (user && !activeChatId) {
        const { data, error: chatError } = await supabase
          .from('chats')
          .insert({ user_id: user.id, title: text.substring(0, 30) || 'New Chat' })
          .select()
          .single();
        
        if (data) {
          activeChatId = data.id;
          setCurrentChatId(activeChatId);
          setChats(prev => [data, ...prev]);
        }
      }

      // 2. Save user message
      if (user && activeChatId) {
        await supabase.from('messages').insert({ chat_id: activeChatId, role: 'user', content: text });
      }

      // 3. Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      const modelMessage = data.content || data.text; // Support both structures
      setMessages([...newMessages, { role: 'model', content: modelMessage }]);

      // 4. Save model message
      if (user && activeChatId) {
        await supabase.from('messages').insert({ chat_id: activeChatId, role: 'model', content: modelMessage });
      }

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
          <button className={styles.iconButton} type="button" title="Upload file"><Plus size={18} /></button>
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

  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <div className={styles.sidebar}>
        <button className={styles.newChatBtn} onClick={startNewChat}>
          <Plus size={18} /> New Chat
        </button>
        
        <div className={styles.historyList}>
          {chats.map(chat => (
            <div 
              key={chat.id} 
              className={`${styles.historyItem} ${currentChatId === chat.id ? styles.historyItemActive : ''}`}
              onClick={() => loadMessages(chat.id)}
            >
              <MessageSquare size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}/>
              {chat.title}
            </div>
          ))}
        </div>

        <div className={styles.authSection}>
          {user ? (
            <div>
              <div className={styles.userEmail}>{user.email}</div>
              <button className={styles.authButton} onClick={handleLogout} style={{ background: 'transparent', color: '#a1a1aa', border: '1px solid #e4e4e7' }}>
                <LogOut size={16} style={{ display: 'inline', marginRight: '6px' }}/> Logout
              </button>
            </div>
          ) : (
            <button className={styles.authButton} onClick={() => setShowAuthModal(true)}>
              Login to save history
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={styles.mainContent}>
        {messages.length === 0 ? (
          <div className={styles.landing}>
            <div className={styles.logo}>
              <Flower2 size={48} strokeWidth={1.5} />
            </div>
            <h1 className={styles.greeting}>
              Good morning<span className={styles.name}><span className={styles.underline}></span></span>
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
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
            <form onSubmit={handleAuth} className={styles.authForm}>
              <input 
                type="email" 
                placeholder="Email address" 
                className={styles.authInput}
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className={styles.authInput}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
              />
              <button type="submit" className={styles.authButton}>
                {isSignUp ? 'Sign Up' : 'Log In'}
              </button>
            </form>
            
            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.9rem', color: '#71717a' }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', color: '#d97757', cursor: 'pointer', fontWeight: 500 }}
              >
                {isSignUp ? 'Log In' : 'Sign Up'}
              </button>
            </div>

            <button className={styles.modalClose} onClick={() => setShowAuthModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

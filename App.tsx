
import React, { useState, useRef, useEffect } from 'react';
import { Message, Attachment, ModelName } from './types';
import { GeminiChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const STORAGE_KEYS = { MESSAGES: 'winterai_messages_v2' };

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [isKeySelected, setIsKeySelected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } else {
        setIsKeySelected(true);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleConnect = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setIsKeySelected(true);
      } catch (err) {
        console.error('Key selection failed:', err);
      }
    }
  };

  const handleSend = async (text: string, attachments: Attachment[]) => {
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      attachments,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = `a-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }]);

    try {
      const history = [...messages, userMsg].filter(m => !m.isStreaming);
      const chatSession = new GeminiChatSession(ModelName.FLASH, history);

      let accumulatedContent = '';
      const stream = chatSession.sendMessageStream(
        text,
        attachments.map(a => ({ mimeType: a.mimeType, data: a.data }))
      );

      for await (const chunk of stream) {
        accumulatedContent += chunk;
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId ? { ...msg, content: accumulatedContent } : msg
        ));
      }

      setMessages(prev => prev.map(msg =>
        msg.id === assistantId ? { ...msg, isStreaming: false } : msg
      ));
    } catch (error: any) {
      let errorMsg = error.message || 'An unexpected interruption occurred.';
      if (errorMsg.includes('API key must be set') || errorMsg.includes('ENVIRONMENT_KEY_MISSING') ||
        errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('Requested entity was not found')) {
        setIsKeySelected(false);
        errorMsg = 'Interface disconnected. Please re-link your API key.';
      }
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, content: `**Error:** ${errorMsg}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isKeySelected === null) {
    return (
      <div style={{ height: '100dvh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // No API key — connect screen
  if (!isKeySelected) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        <div className="fade-up" style={{ maxWidth: 420, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
            <span style={{ fontSize: 38 }}>❄️</span>
          </div>

          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 'clamp(2rem,8vw,3.2rem)', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
            Winter<span className="grad-text">AI</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.65, margin: '0 0 36px' }}>
            Your intelligent neural interface — fast, free, and powered by Gemini.
          </p>

          <button
            onClick={handleConnect}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 16, border: 'none', borderRadius: 14, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 6px 28px rgba(99,102,241,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'none'; }}
          >
            Connect API Key
          </button>

          <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(107,114,128,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Powered by Winer async function name(params:type) {

            } · End-to-end secure
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', width: '100%', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>

      {/* Sidebar overlay (mobile) */}
      {isSidebarOpen && (
        <div className="overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div style={{ padding: '22px 16px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingLeft: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>❄️</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
                Winter<span className="grad-text">AI</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>Free to Ask</div>
            </div>
          </div>

          {/* New Chat */}
          <div className="nav-item active" style={{ marginBottom: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Current Session
            <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f1' }}></span>
          </div>

          {/* Message count */}
          <div style={{ flex: 1 }} />

          {/* Model badge */}
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Active Model</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f1', display: 'inline-block' }}></span>
              Winter AI Model
            </div>
          </div>

          {/* Clear */}
          <div
            className="clear-btn"
            onClick={() => { if (confirm('Clear all messages?')) { setMessages([]); setIsSidebarOpen(false); } }}
          >
            🗑 Clear Conversation
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Mobile top bar */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 30 }}
          className="md-header"
        >
          {/* Menu button (mobile only) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{ padding: 8, background: 'none', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="menu-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
            Winter<span className="grad-text">AI</span>
          </div>

          {/* Status dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px #6366f1', display: 'inline-block' }}></span>
            Online
          </div>
        </header>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="scrollbar"
          style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.35, gap: 16 }}>
              <div style={{ fontSize: 56 }}>❄️</div>
              <div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', marginBottom: 6 }}>Ask WinterAI anything</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Powered by Winter AI · Free · Fast</div>
              </div>
            </div>
          ) : (
            messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>

      <style>{`
        @media (min-width: 769px) {
          .menu-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;

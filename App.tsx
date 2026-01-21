
import React, { useState, useRef, useEffect } from 'react';
import { Message, Attachment, ModelName } from './types';
import { GeminiChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

/**
 * Interface representing the AIStudio global object for API key management.
 * Defining it here allows merging with potential existing global declarations.
 */
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

const STORAGE_KEYS = {
  MESSAGES: 'winterai_v1_messages',
  MODEL: 'winterai_v1_model'
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [modelName, setModelName] = useState<ModelName>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODEL);
    return (saved as ModelName) || ModelName.FLASH;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      // If process.env.API_KEY is already set, we might be in a dev/env-configured mode
      if (process.env.API_KEY && process.env.API_KEY !== '') {
        setIsAuthenticated(true);
        return;
      }

      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsAuthenticated(hasKey);
      } else {
        // Fallback for non-aistudio environments
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, []);

  const handleAuth = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions to mitigate race conditions
      setIsAuthenticated(true);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODEL, modelName);
  }, [modelName]);

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
    const initialAssistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    try {
      // Re-create session with full history to maintain context
      const history = [...messages, userMsg].filter(m => !m.isStreaming);
      const chatSession = new GeminiChatSession(modelName, history);
      
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
      if (error.message === "AUTH_REQUIRED") {
        setIsAuthenticated(false);
      }
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { ...msg, content: "Neural link interrupted. Please verify your authentication status.", isStreaming: false } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm('Erase all local neural cache?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      setIsSidebarOpen(false);
    }
  };

  // Loading or Auth Screen
  if (isAuthenticated === null) {
    return <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
    </div>;
  }

  if (isAuthenticated === false) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md animate-winter-in">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 className="text-3xl font-black frost-text mb-4 uppercase tracking-tighter">Authentication Required</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            WinterAI requires a secure neural uplink. Please connect using a paid API key from a billing-enabled project.
          </p>
          <button 
            onClick={handleAuth}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all active:scale-95 mb-4"
          >
            ESTABLISH SECURE LINK
          </button>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-sky-500/50 hover:text-sky-400 font-bold uppercase tracking-widest transition-colors"
          >
            Billing Documentation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-winter-950">
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-40 lg:hidden"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Drawer */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 glass-card border-r border-gray-800
        transform transition-all duration-300 ease-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-1">
            <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="16" x2="16" y1="16" y2="16"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight frost-text">WinterAI</h2>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">v1.2.0 Stable</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-1">
            <div className="px-3 py-2 text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Memory Nodes</div>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-20 text-sm font-semibold text-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Active Session
            </button>
            <div className="p-8 text-center opacity-30">
              <p className="text-xs text-gray-400 italic">Cache restricted.</p>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-800 space-y-4">
             <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-widest block mb-2 px-1">Neural Engine</label>
                <select 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value as ModelName)}
                  className="w-full bg-gray-900 text-gray-300 text-sm font-bold px-3 py-2.5 rounded-xl border border-gray-800 outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value={ModelName.FLASH}>Arctic Light (Fast)</option>
                  <option value={ModelName.PRO}>Glacier Ultra (Deep)</option>
                </select>
             </div>
            <button 
              onClick={clearChat}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-gray-400 hover:text-red-400 hover:bg-red-400 hover:bg-opacity-10 rounded-xl transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Flush Cache
            </button>
          </div>
        </div>
      </aside>

      {/* Main Terminal */}
      <div className="flex-1 flex flex-col min-w-0 bg-winter-950 relative">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 glass-card z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-400 hover:text-blue-400 lg:hidden transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold uppercase tracking-widest frost-text lg:hidden">WinterAI</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest hidden sm:inline">Secure Neural Link</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 text-xs text-blue-400 font-bold uppercase tracking-widest">
              {modelName === ModelName.FLASH ? 'Arctic' : 'Glacier'}
            </div>
          </div>
        </header>

        <main 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative"
        >
          <div className="max-w-4xl mx-auto p-6 md:p-12 min-h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 animate-winter-in">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 blur-3xl rounded-full"></div>
                  <div className="relative w-24 h-24 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center shadow-2xl transition-all hover:scale-105">
                     <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/></svg>
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 frost-text uppercase tracking-tight">Interface Online</h2>
                <p className="text-gray-400 text-sm md:text-lg max-w-md mb-12 leading-relaxed">Secure environment ready for computation. WinterAI is online for high-order reasoning and analysis.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                  {[
                    { label: "Engineering", q: "Refactor this logic for O(n) complexity." },
                    { label: "Synthesis", q: "Analyze the security of RSA encryption." }
                  ].map((item, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSend(item.q, [])}
                      className="group p-5 bg-gray-900 bg-opacity-40 border border-gray-800 rounded-2xl text-left hover:border-blue-500 hover:border-opacity-40 transition-all"
                    >
                      <div className="text-blue-500 font-bold text-xs mb-2 uppercase tracking-widest">{item.label}</div>
                      <div className="text-gray-300 text-sm font-medium group-hover:text-white line-clamp-2 leading-snug">{item.q}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8">
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
              </div>
            )}
          </div>
        </main>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
};

export default App;

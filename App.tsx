
import React, { useState, useRef, useEffect } from 'react';
import { Message, Attachment, ModelName } from './types';
import { GeminiChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const STORAGE_KEYS = {
  MESSAGES: 'nexus_chat_history_v1',
  MODEL: 'nexus_selected_model_v1'
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [modelName, setModelName] = useState<ModelName>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MODEL);
    return (saved as ModelName) || ModelName.FLASH;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<GeminiChatSession | null>(null);

  useEffect(() => {
    const history = messages.filter(m => !m.isStreaming);
    chatSessionRef.current = new GeminiChatSession(modelName, history);
  }, [modelName]);

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
    if (!chatSessionRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      attachments,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    try {
      let fullContent = '';
      const stream = chatSessionRef.current.sendMessageStream(
        text, 
        attachments.map(a => ({ mimeType: a.mimeType, data: a.data }))
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMsgId 
            ? { ...msg, content: fullContent } 
            : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId 
          ? { ...msg, isStreaming: false } 
          : msg
      ));

    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please check your connection and try again.', isStreaming: false } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the entire chat history?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      chatSessionRef.current = new GeminiChatSession(modelName, []);
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar / History Drawer */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Nexus</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            <button 
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Current Session
            </button>
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">History (Local Only)</p>
              <p className="mt-2 text-sm text-slate-600 italic">No previous sessions saved.</p>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-800 pt-4 space-y-2">
             <div className="px-2 mb-2">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Compute Core</label>
                <select 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value as ModelName)}
                  className="w-full bg-slate-800 text-slate-300 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={ModelName.FLASH}>Nexus Core (Fast)</option>
                  <option value={ModelName.PRO}>Nexus Ultra (Smart)</option>
                </select>
             </div>
            <button 
              onClick={clearChat}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Clear Workspace
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white lg:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <h1 className="text-base md:text-lg font-bold tracking-tight lg:hidden">Nexus</h1>
            <div className="hidden lg:flex items-center gap-2">
              <span className="flex w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Workspace Syncing</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Model Badge for desktop */}
            <div className="hidden sm:flex px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-bold uppercase">
              {modelName === ModelName.FLASH ? 'Core' : 'Ultra'}
            </div>
          </div>
        </header>

        <main 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth"
        >
          <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-700">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800 shadow-2xl rotate-3 hover:rotate-0 transition-transform">
                   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                </div>
                <h2 className="text-xl md:text-3xl font-extrabold text-white mb-3">Initialize Workspace</h2>
                <p className="text-slate-400 text-sm md:text-base max-w-sm mb-10 leading-relaxed">Secure environment ready. Upload logic, analyze visual patterns, or start a neural query.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  <button 
                    onClick={() => handleSend("Explain quantum decoherence.", [])}
                    className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-left hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all group active:scale-[0.98]"
                  >
                    <div className="text-indigo-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Physics</div>
                    <div className="text-slate-300 text-sm group-hover:text-white line-clamp-1">Explain quantum decoherence.</div>
                  </button>
                  <button 
                    onClick={() => handleSend("Design a micro-service architecture.", [])}
                    className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-left hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all group active:scale-[0.98]"
                  >
                    <div className="text-indigo-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Systems</div>
                    <div className="text-slate-300 text-sm group-hover:text-white line-clamp-1">Design a micro-service architecture.</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
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

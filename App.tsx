
import React, { useState, useRef, useEffect } from 'react';
import { Message, Attachment, ModelName } from './types';
import { GeminiChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const STORAGE_KEYS = {
  MESSAGES: 'winterai_chat_history_v1',
  MODEL: 'winterai_selected_model_v1'
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
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" x2="8" y1="16" y2="16"/><line x1="8" x2="8" y1="20" y2="20"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="12" x2="12" y1="22" y2="22"/><line x1="16" x2="16" y1="16" y2="16"/><line x1="16" x2="16" y1="20" y2="20"/></svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-sky-50">WinterAI</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            <button 
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Current Session
            </button>
            <div className="px-3 py-6 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Encrypted Archive</p>
              <p className="mt-2 text-sm text-slate-600 italic">No previous sessions cached.</p>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-800 pt-4 space-y-2">
             <div className="px-2 mb-2">
                <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Processor Node</label>
                <select 
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value as ModelName)}
                  className="w-full bg-slate-800 text-slate-300 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-sky-500 transition-colors"
                >
                  <option value={ModelName.FLASH}>Arctic v1.0 (Fast)</option>
                  <option value={ModelName.PRO}>Glacier v1.0 (Advanced)</option>
                </select>
             </div>
            <button 
              onClick={clearChat}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Clear Environment
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/40 backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white lg:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <h1 className="text-base md:text-lg font-bold tracking-tight lg:hidden">WinterAI</h1>
            <div className="hidden lg:flex items-center gap-2">
              <span className="flex w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Environment Synced</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-400 font-bold uppercase">
              {modelName === ModelName.FLASH ? 'Arctic' : 'Glacier'}
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
                <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800 shadow-2xl transition-all hover:border-sky-500/50">
                   <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><path d="m10 20-1.25-2.5L6.25 16.25 5 15l1.25-1.25L8.75 12.5 10 10l1.25 2.5 2.5 1.25L15 15l-1.25 1.25-2.5 1.25z"/><path d="m19 13-1.5-3-3-1.5L13 7l1.5-1.5 3-1.5L19 1l1.5 3 3 1.5L25 7l-1.5 1.5-3 1.5z"/><path d="M15 21 6 12l9-9"/></svg>
                </div>
                <h2 className="text-xl md:text-3xl font-extrabold text-white mb-3">Welcome to WinterAI</h2>
                <p className="text-slate-400 text-sm md:text-base max-w-sm mb-10 leading-relaxed">Your intelligent, secure, and blazing fast AI assistant. How can I help you today?</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  <button 
                    onClick={() => handleSend("Explain climate change in the Arctic.", [])}
                    className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-left hover:border-sky-500/40 hover:bg-slate-900/60 transition-all group active:scale-[0.98]"
                  >
                    <div className="text-sky-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Environment</div>
                    <div className="text-slate-300 text-sm group-hover:text-white line-clamp-1">Explain climate change in the Arctic.</div>
                  </button>
                  <button 
                    onClick={() => handleSend("Write a Python script for data encryption.", [])}
                    className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-left hover:border-sky-500/40 hover:bg-slate-900/60 transition-all group active:scale-[0.98]"
                  >
                    <div className="text-sky-500 font-bold text-[10px] mb-1 uppercase tracking-widest">Security</div>
                    <div className="text-slate-300 text-sm group-hover:text-white line-clamp-1">Write a Python script for encryption.</div>
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

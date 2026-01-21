import React, { useState, useRef, useEffect } from 'react';
import { Message, Attachment, ModelName } from './types';
import { GeminiChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const STORAGE_KEYS = {
  MESSAGES: 'winterai_free_messages',
  MODEL: 'winterai_free_model'
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [modelName, setModelName] = useState<ModelName>(ModelName.FLASH);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleLinkKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setShowSetup(false);
      // Logic assumes selection success as per guidelines to avoid race conditions
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
      if (error.message === "FREE_KEY_MISSING") {
        setShowSetup(true);
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { 
              ...msg, 
              content: `Setup needed: To use WinterAI for free, please click the setup button to link your API key.`, 
              isStreaming: false 
            } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  if (showSetup) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md animate-winter-in">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778z"/><path d="M12 2l.5 5h5l-4.5 3.5L15 15l-4.5-3.5L6 15l2-4.5L3.5 7h5L9 2z"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">WinterAI Free Setup</h1>
          <p className="text-slate-400 mb-8">Establish a connection to the free Gemini engine to start chatting.</p>
          <button 
            onClick={handleLinkKey}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg"
          >
            LINK FREE INTERFACE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-winter-950">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 glass-card border-r border-gray-800 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <div>
              <h2 className="text-lg font-bold frost-text">WinterAI</h2>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Free Edition</p>
            </div>
          </div>
          <div className="flex-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-200 text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              Current Session
            </button>
          </div>
          <button 
            onClick={() => { setMessages([]); setIsSidebarOpen(false); }}
            className="mt-auto w-full py-3 text-xs font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
          >
            Reset Memory
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-winter-950">
        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between glass-card">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </button>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">WinterAI Free Interface</span>
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-winter-in py-12">
                <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mb-6 border border-gray-800 shadow-2xl">
                  <span className="text-3xl">❄️</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Hello</h1>
                <p className="text-slate-400 max-w-sm mb-8">WinterAI is ready for your questions. Type below to start a free session.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                   {["Explain quantum physics", "Write a short story"].map(q => (
                     <button key={q} onClick={() => handleSend(q, [])} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl text-sm text-slate-300 hover:border-blue-500/50 text-left transition-all">
                       {q}
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
              </div>
            )}
          </div>
        </main>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};

export default App;

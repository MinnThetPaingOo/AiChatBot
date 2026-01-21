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
      console.error("Chat Error:", error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { 
              ...msg, 
              content: `**Interface Error**: ${error.message || "Connection to the free API failed. Please ensure your environment is correctly configured."}`, 
              isStreaming: false 
            } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-winter-950">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 glass-card border-r border-gray-800 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <div>
              <h2 className="text-lg font-bold frost-text">WinterAI</h2>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Free Interface</p>
            </div>
          </div>
          <div className="flex-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-200 text-sm font-medium border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              Active Session
            </button>
          </div>
          <div className="mt-auto space-y-4">
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
              <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">Model</p>
              <p className="text-xs text-blue-300 font-medium">Gemini 3 Flash</p>
            </div>
            <button 
              onClick={() => { if(confirm('Clear history?')) setMessages([]); setIsSidebarOpen(false); }}
              className="w-full py-3 text-xs font-bold text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
            >
              Reset Memory
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-winter-950">
        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between glass-card z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </button>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Global Neural Interface</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest hidden sm:inline">Active</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-winter-in py-12">
                <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mb-6 border border-gray-800 shadow-2xl">
                  <span className="text-3xl">❄️</span>
                </div>
                <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">WinterAI <span className="text-blue-500">Free</span></h1>
                <p className="text-slate-400 max-w-sm mb-12 text-lg">Your high-performance gateway to open intelligence.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                   {[
                     { label: "Logic", q: "Analyze the benefits of functional programming." },
                     { label: "Creative", q: "Write a haiku about a winter storm." },
                     { label: "Code", q: "Explain how to use React hooks effectively." },
                     { label: "Data", q: "What are the latest trends in renewable energy?" }
                   ].map(item => (
                     <button 
                       key={item.q} 
                       onClick={() => handleSend(item.q, [])} 
                       className="p-5 bg-gray-900/40 border border-gray-800 rounded-2xl text-left hover:border-blue-500/30 hover:bg-gray-900/60 transition-all group"
                     >
                       <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">{item.label}</div>
                       <div className="text-sm text-slate-300 group-hover:text-white transition-colors">{item.q}</div>
                     </button>
                   ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-10">
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
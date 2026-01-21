
import React, { useState, useRef, useEffect } from 'react';
import { Message, Attachment, ModelName } from './types';
import { GeminiChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';

const STORAGE_KEYS = {
  MESSAGES: 'winterai_free_messages',
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
  
  const [isKeySelected, setIsKeySelected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } else {
        // Fallback if not in AI Studio environment, assume env key is handled
        setIsKeySelected(true);
      }
    };
    checkKey();
  }, []);

  // Persist messages and handle auto-scroll
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleConnect = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Guideline: Assume successful selection after calling openSelectKey
        setIsKeySelected(true);
      } catch (err) {
        console.error("Key selection failed:", err);
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
      console.error("Neural Interface Error:", error);
      
      let errorMsg = error.message || "An unexpected interruption occurred.";
      
      // Fixed: Handle key-related errors including "Requested entity was not found" per guidelines
      if (errorMsg.includes("API key must be set") || 
          errorMsg.includes("ENVIRONMENT_KEY_MISSING") || 
          errorMsg.includes("API_KEY_INVALID") || 
          errorMsg.includes("Requested entity was not found")) {
        setIsKeySelected(false);
        errorMsg = "Interface disconnected. Please re-link your API key using the button on the main screen.";
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { 
              ...msg, 
              content: `**Interface Error**: ${errorMsg}`, 
              isStreaming: false 
            } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // While checking key state
  if (isKeySelected === null) {
    return (
      <div className="h-screen w-full bg-winter-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no key is selected, show the landing/connect page
  if (!isKeySelected) {
    return (
      <div className="h-screen w-full bg-winter-950 flex items-center justify-center p-6 overflow-hidden relative">
        {/* Background Frost Bloom */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full"></div>
        
        <div className="relative z-10 max-w-xl w-full text-center animate-winter-in">
          <div className="w-24 h-24 bg-gray-900 border border-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl transition-transform hover:scale-110">
            <span className="text-5xl">❄️</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
            WinterAI <span className="frost-text">Free</span>
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl mb-12 leading-relaxed">
            Initialize your free neural interface to start exploring high-performance intelligence. 
            Select an API key to establish a secure link.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleConnect}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-[0_0_40px_rgba(37,99,235,0.3)] text-lg uppercase tracking-widest"
            >
              Connect Free Interface
            </button>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
              Powered by Gemini 3 Flash • Secure Session Environment
            </p>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-800/50 flex justify-center gap-8 opacity-40">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Research Logic</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Neural Streams</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Arctic Core</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-winter-950">
      {/* Sidebar - Desktop & Mobile */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 glass-card border-r border-gray-800
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-black text-xl">W</span>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight frost-text uppercase italic">Winter</h2>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Free Interface</p>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest px-2 mb-4">Neural Buffer</p>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-100 text-sm font-bold border border-blue-500/20 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              Live Session
            </button>
          </div>

          <div className="mt-auto space-y-4 pt-6">
            <div className="p-4 bg-gray-900/60 rounded-2xl border border-gray-800/50">
              <p className="text-[10px] text-gray-500 font-black uppercase mb-2 tracking-widest">Core Engine</p>
              <p className="text-xs text-blue-400 font-black flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Arctic Flash 3.0
              </p>
            </div>
            
            <button 
              onClick={() => { if(confirm('Clear neural history?')) setMessages([]); setIsSidebarOpen(false); }}
              className="w-full py-4 text-[10px] font-black text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest border border-gray-800/50 rounded-xl"
            >
              Clear Buffer
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-winter-950/80 backdrop-blur-md sticky top-0 z-40">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
           </button>
           <h1 className="text-sm font-black text-white uppercase tracking-tighter italic">WinterAI</h1>
           <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
        </header>

        {/* Scrollable Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
               <div className="text-6xl mb-4">❄️</div>
               <p className="text-sm font-bold uppercase tracking-[0.3em] text-white">Neural Stream Idle</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
             <div className="flex gap-2 items-center text-blue-500/50 text-[10px] font-bold uppercase tracking-widest p-4">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                Processing Stream...
             </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>

      {/* Sidebar Backdrop (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

// Fixed: Added missing default export to resolve "Module has no default export" error in index.tsx
export default App;

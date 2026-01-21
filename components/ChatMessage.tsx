
import React from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={`flex max-w-[95%] sm:max-w-[85%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 md:gap-4`}>
        {/* Avatar Plate */}
        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs tracking-tighter shadow-xl ${
          isUser 
            ? 'bg-sky-600 text-white' 
            : 'bg-slate-800 text-sky-400 border border-slate-700/50'
        }`}>
          {isUser ? 'USR' : 'WAI'}
        </div>

        {/* Neural Signal Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
          <div className={`px-4 py-3 md:px-6 md:py-4 rounded-3xl shadow-2xl transition-all ${
            isUser 
              ? 'bg-sky-600 text-white rounded-tr-none' 
              : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none ring-1 ring-white/5'
          }`}>
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {message.attachments.map((att, idx) => (
                  <img 
                    key={idx} 
                    src={att.url} 
                    alt="attachment" 
                    className="max-h-60 md:max-h-96 w-auto rounded-2xl border border-white/10 hover:opacity-90 transition-opacity cursor-zoom-in"
                  />
                ))}
              </div>
            )}
            
            <div className="text-[15px] md:text-[16px] leading-relaxed font-medium">
              <MarkdownRenderer content={message.content} />
            </div>
            
            {message.isStreaming && (
              <div className="mt-2 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2 px-1">
             <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest tabular-nums">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
             {!isUser && !message.isStreaming && (
               <span className="text-[9px] text-sky-500/50 font-black uppercase tracking-widest">Verified Signal</span>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

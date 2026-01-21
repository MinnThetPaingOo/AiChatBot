
import React from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-4 md:mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      <div className={`flex max-w-[92%] sm:max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2 md:gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs uppercase tracking-tighter ${
          isUser 
            ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/10' 
            : 'bg-slate-800 text-sky-400 border border-slate-700/50 shadow-md'
        }`}>
          {isUser ? 'ME' : 'WA'}
        </div>

        {/* Bubble Group */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
          <div className={`px-3.5 py-2.5 md:px-5 md:py-3.5 rounded-2xl md:rounded-3xl shadow-sm ${
            isUser 
              ? 'bg-sky-600 text-white rounded-tr-none' 
              : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none ring-1 ring-slate-800/50'
          }`}>
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.attachments.map((att, idx) => (
                  <img 
                    key={idx} 
                    src={att.url} 
                    alt="attachment" 
                    className="max-h-56 md:max-h-80 w-auto rounded-xl border border-white/5 hover:scale-[1.02] transition-transform cursor-zoom-in shadow-2xl"
                  />
                ))}
              </div>
            )}
            
            <div className="text-sm md:text-[15px] leading-relaxed overflow-hidden">
              <MarkdownRenderer content={message.content} />
            </div>
            
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1.5 bg-sky-400/80 animate-pulse rounded-full align-middle"></span>
            )}
          </div>
          
          <span className="text-[9px] md:text-[10px] mt-1.5 text-slate-600 px-1 font-bold uppercase tracking-wider tabular-nums">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

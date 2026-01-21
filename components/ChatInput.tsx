
import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((text.trim() || attachments.length > 0) && !disabled) {
      onSend(text, attachments);
      setText('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      newAttachments.push({
        mimeType: file.type,
        data: base64,
        url: URL.createObjectURL(file)
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  return (
    <div className="relative w-full bg-slate-900/60 backdrop-blur-2xl border-t border-slate-800 px-3 pt-3 pb-6 md:pb-5">
      <div className="max-w-4xl mx-auto">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 px-1">
            {attachments.map((att, i) => (
              <div key={i} className="relative group shrink-0">
                <img src={att.url} alt="upload" className="w-14 h-14 md:w-20 md:h-20 object-cover rounded-xl border border-slate-700 shadow-lg" />
                <button 
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-xl ring-2 ring-slate-900"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-1 md:gap-3 bg-slate-800/80 rounded-2xl border border-slate-700/50 p-2 shadow-inner focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
          <button 
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 md:p-2 text-slate-400 hover:text-sky-400 disabled:opacity-50 transition-colors shrink-0"
            title="Upload Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            multiple 
            className="hidden" 
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Query WinterAI..."
            className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 resize-none max-h-48 py-2.5 px-1 outline-none custom-scrollbar text-sm md:text-base"
          />

          <button 
            onClick={handleSend}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            className="p-3 bg-sky-600 text-white rounded-xl disabled:opacity-30 disabled:grayscale transition-all hover:bg-sky-500 active:scale-90 shadow-xl shadow-sky-600/10 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
        
        <p className="hidden md:block text-[9px] text-center text-slate-600 mt-2 uppercase tracking-[0.2em] font-bold">
          WinterAI Encryption Standard v1.2
        </p>
      </div>
    </div>
  );
};

export default ChatInput;

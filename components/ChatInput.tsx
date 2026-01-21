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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  return (
    <div className="relative w-full border-t border-gray-800 glass-card px-4 pt-4 pb-8 md:pb-6">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4 animate-winter-in">
            {attachments.map((att, i) => (
              <div key={i} className="relative shrink-0">
                <img src={att.url} alt="preview" className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-2xl border border-gray-700 ring-2 ring-blue-500 ring-opacity-20" />
                <button 
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] hover:bg-red-600 shadow-xl transition-transform"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 md:gap-4 bg-gray-900 bg-opacity-80 rounded-3xl border border-gray-800 p-2 md:p-3 shadow-inner transition-all">
          <button 
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="p-3 md:p-4 text-gray-500 hover:text-blue-400 disabled:opacity-30 transition-colors"
            title="Upload Pattern"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </button>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Initialize neural query..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 resize-none max-h-56 py-3 px-1 outline-none text-base font-medium"
          />

          <button 
            onClick={handleSend}
            disabled={disabled || (!text.trim() && attachments.length === 0)}
            className="p-4 bg-blue-500 text-white rounded-2xl md:rounded-3xl disabled:opacity-20 transition-all hover:bg-blue-400 active:scale-95 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
        
        <div className="mt-3 flex justify-center gap-6 px-4 opacity-30">
           <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
             Neural Link Encrypted
           </div>
           <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
             WinterAI Kernel 1.2
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
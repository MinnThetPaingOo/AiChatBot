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

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      newAttachments.push({ mimeType: file.type, data: base64, url: URL.createObjectURL(file) });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: 'rgba(7,8,15,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '12px 16px 16px',
      }}
      className="pb-safe"
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }} className="fade-up">
            {attachments.map((att, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img
                  src={att.url}
                  alt="preview"
                  style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                />
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#ef4444', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="input-box" style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 8px 8px 12px' }}>

          {/* Attach image */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            style={{
              flexShrink: 0,
              padding: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              opacity: disabled ? 0.4 : 1,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => !disabled && ((e.currentTarget as HTMLElement).style.color = 'var(--accent-h)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </button>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" style={{ display: 'none' }} />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Ask anything… "
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              padding: '6px 0',
              maxHeight: 180,
              fontFamily: 'Inter, sans-serif',
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="send-btn"
            style={{
              flexShrink: 0,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none',
              color: '#fff',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            {disabled ? (
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </button>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 10, color: 'rgba(107,114,128,0.45)', letterSpacing: '0.06em', fontWeight: 500 }}>
          WinterAI may make mistakes · Verify important info
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
import React from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fade-up"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width: '100%',
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div
          className="avatar-ai"
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            marginBottom: 2,
          }}
        >
          ❄️
        </div>
      )}

      {/* Bubble group */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          maxWidth: 'min(78%, 620px)',
          gap: 6,
        }}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {message.attachments.map((att, idx) => (
              <img
                key={idx}
                src={att.url}
                alt="attachment"
                style={{
                  maxHeight: 220,
                  maxWidth: '100%',
                  width: 'auto',
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  objectFit: 'cover',
                }}
              />
            ))}
          </div>
        )}

        {/* Text bubble */}
        {(message.content || message.isStreaming) && (
          <div
            className={isUser ? 'bubble-user' : 'bubble-ai'}
            style={{ padding: '12px 16px', fontSize: 14, lineHeight: 1.7 }}
          >
            {message.isStreaming && !message.content ? (
              /* Typing indicator */
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0' }}>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            ) : (
              <div className={!isUser ? 'prose' : ''} style={{ color: isUser ? '#fff' : 'var(--text)', wordBreak: 'break-word' }}>
                <MarkdownRenderer content={message.content} />
              </div>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && message.content && (
              <span style={{ display: 'inline-block', width: 2, height: '0.85em', background: 'var(--accent-h)', marginLeft: 2, borderRadius: 1, verticalAlign: 'middle', animation: 'pulse-dot 0.8s ease-in-out infinite' }} />
            )}
          </div>
        )}

        {/* Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>{timeStr}</span>
          {!isUser && !message.isStreaming && message.content && (
            <span style={{ fontSize: 10, color: 'rgba(99,102,241,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>✓ WinterAI</span>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div
          className="avatar-user"
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.02em',
            marginBottom: 2,
          }}
        >
          YOU
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
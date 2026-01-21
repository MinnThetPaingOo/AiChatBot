
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parseContent = (text: string) => {
    let processed = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks with horizontal scroll for mobile
    processed = processed.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<div class="relative my-3"><pre class="bg-black/40 p-3 md:p-5 rounded-xl overflow-x-auto border border-slate-800 font-mono text-xs md:text-sm text-indigo-200 custom-scrollbar whitespace-pre"><code class="block w-max min-w-full">${code.trim()}</code></pre></div>`;
    });

    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-slate-800/80 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[0.85em] border border-slate-700/30">$1</code>');

    // Bold
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

    // Italic
    processed = processed.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>');

    // Lists
    processed = processed.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 md:ml-6 list-disc text-slate-300 mb-1 pl-1">$1</li>');
    
    // Headers - scaled for mobile
    processed = processed.replace(/^### (.*$)/gm, '<h3 class="text-base md:text-lg font-bold mt-4 mb-1 text-white">$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2 class="text-lg md:text-xl font-bold mt-5 mb-2 text-white border-b border-slate-800 pb-1">$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1 class="text-xl md:text-2xl font-black mt-6 mb-3 text-white">$1</h1>');

    // Line breaks
    processed = processed.replace(/\n/g, '<br />');

    return processed;
  };

  return (
    <div 
      className="prose prose-invert max-w-none break-words leading-relaxed selection:bg-indigo-500/30"
      dangerouslySetInnerHTML={{ __html: parseContent(content) }} 
    />
  );
};

export default MarkdownRenderer;

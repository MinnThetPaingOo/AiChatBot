
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

    // Block Code
    processed = processed.replace(/```([\s\S]*?)```/g, (match, code) => {
      const trimmed = code.trim();
      return `
        <div class="relative group my-6 overflow-hidden">
          <div class="absolute inset-0 bg-sky-500/5 blur-xl"></div>
          <pre class="relative bg-slate-900/80 p-5 rounded-2xl overflow-x-auto border border-slate-800 font-mono text-[13px] leading-relaxed text-sky-100 custom-scrollbar whitespace-pre shadow-2xl">
            <code class="block w-max min-w-full">${trimmed}</code>
          </pre>
        </div>
      `;
    });

    // Inline Code
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-slate-800/80 px-1.5 py-0.5 rounded-lg text-sky-300 font-mono text-[0.85em] border border-slate-700/50">$1</code>');

    // Bold/Italic
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-white">$1</strong>');
    processed = processed.replace(/\*([^*]+)\*/g, '<em class="italic text-sky-200/80">$1</em>');

    // Lists
    processed = processed.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-5 list-disc text-slate-300 mb-2 pl-2 marker:text-sky-500">$1</li>');
    
    // Headers
    processed = processed.replace(/^### (.*$)/gm, '<h3 class="text-lg font-black mt-6 mb-2 text-white uppercase tracking-tight">$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2 class="text-xl font-black mt-8 mb-4 text-white border-b border-slate-800/50 pb-2 tracking-tight">$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-black mt-10 mb-6 text-sky-50 tracking-tighter">$1</h1>');

    // Paragraph Breaks
    processed = processed.replace(/\n\n/g, '<div class="mb-4"></div>');
    processed = processed.replace(/\n/g, '<br />');

    return processed;
  };

  return (
    <div 
      className="prose prose-invert max-w-none break-words leading-relaxed"
      dangerouslySetInnerHTML={{ __html: parseContent(content) }} 
    />
  );
};

export default MarkdownRenderer;

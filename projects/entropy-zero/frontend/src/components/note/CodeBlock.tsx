import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// TODO: Implement CodeBlock
// Features:
// - macOS-style window decoration (red/yellow/green dots)
// - Language indicator
// - One-click copy with feedback
// - Syntax highlighting

interface CodeBlockProps {
  code: string;
  language?: string;
}

export default function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='rounded-xl overflow-hidden bg-[#1e1e2e] my-4'>
      {/* macOS Window Header */}
      <div className='flex items-center justify-between px-4 py-2 bg-[#2a2a3a]'>
        <div className='flex gap-2'>
          <div className='h-3 w-3 rounded-full bg-red-500' />
          <div className='h-3 w-3 rounded-full bg-yellow-500' />
          <div className='h-3 w-3 rounded-full bg-green-500' />
        </div>
        <span className='text-xs text-slate-400 uppercase tracking-wider'>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className='text-slate-400 hover:text-white transition-colors'>
          {copied ? (
            <Check className='h-4 w-4 text-green-500' />
          ) : (
            <Copy className='h-4 w-4' />
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className='p-4 overflow-x-auto'>
        <code className='text-sm text-slate-100 font-mono'>
          {/* TODO: Add syntax highlighting */}
          {code}
        </code>
      </pre>
    </div>
  );
}

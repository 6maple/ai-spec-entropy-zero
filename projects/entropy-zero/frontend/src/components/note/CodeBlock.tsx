import { useCallback, useEffect, useId, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import plaintext from 'highlight.js/lib/languages/plaintext';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('text', plaintext);

function highlight(code: string, language: string): string {
  const lang = language.toLowerCase() || 'text';
  try {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
  } catch {
    // ignore
  }
  return hljs.highlightAuto(code).value;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  onCopyError?: (msg: string) => void;
}

export default function CodeBlock({ code, language = 'text', onCopyError }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const labelId = useId();
  const [html, setHtml] = useState(() => highlight(code, language));

  useEffect(() => {
    setHtml(highlight(code, language));
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        onCopyError?.('无法访问剪贴板，请检查浏览器权限');
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyError?.('复制失败，请重试或手动选择复制');
    }
  }, [code, onCopyError]);

  return (
    <div className='my-4 overflow-hidden rounded-xl border border-slate-700/50 bg-[#1e1e2e]'>
      <div className='flex items-center justify-between gap-2 px-4 py-2 bg-[#2a2a3a]'>
        <div className='flex gap-2' aria-hidden>
          <div className='h-3 w-3 rounded-full bg-red-500' />
          <div className='h-3 w-3 rounded-full bg-yellow-500' />
          <div className='h-3 w-3 rounded-full bg-green-500' />
        </div>
        <span className='min-w-0 flex-1 text-center text-xs text-slate-400 uppercase tracking-wider'>{language}</span>
        <button
          type='button'
          onClick={handleCopy}
          className='shrink-0 text-slate-400 transition-colors hover:text-white'
          aria-labelledby={labelId}
        >
          <span id={labelId} className='sr-only'>
            {copied ? '已复制' : '复制代码'}
          </span>
          {copied ? <Check className='h-4 w-4 text-emerald-400' aria-hidden /> : <Copy className='h-4 w-4' aria-hidden />}
        </button>
      </div>
      <pre className='overflow-x-auto p-4 text-sm leading-relaxed'>
        <code
          className='hljs font-mono'
          // eslint-disable-next-line react/no-danger -- 已由 highlight.js 转义
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}

import React, { useMemo, useCallback } from 'react';
import markdownit from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import 'highlight.js/styles/github-dark.css';

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
}).use(highlightjs);

function renderWithCodeWrapper(html) {
  return html.replace(
    /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
    (match, attrs, code) => {
      const copyHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>复制</span>`;
      return `
      <div class="code-block-container">
        <div class="code-block-header">
          <div class="code-block-dots">
            <span></span><span></span><span></span>
          </div>
          <button class="code-block-copy-button flex items-center gap-1.5" type="button" data-code>${copyHtml}</button>
        </div>
        <pre><code${attrs}>${code}</code></pre>
      </div>
    `;
    },
  );
}

export default function MarkdownContent({ content = '', className = '' }) {
  const html = useMemo(() => {
    const rawHtml = md.render(content);
    return renderWithCodeWrapper(rawHtml);
  }, [content]);

  const handleCopy = useCallback((event) => {
    const button = event.target.closest('.code-block-copy-button');
    if (!button) return;

    const container = button.closest('.code-block-container');
    if (!container) return;

    const codeElement = container.querySelector('pre > code');
    if (!codeElement) return;

    const text = codeElement.textContent || '';
    navigator.clipboard.writeText(text).catch(() => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeElement);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });

    const copyHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>复制</span>`;
    const copiedHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg><span>已复制</span>`;
    button.classList.add('code-block-copy-success');
    button.innerHTML = copiedHtml;
    window.setTimeout(() => {
      button.classList.remove('code-block-copy-success');
      button.innerHTML = copyHtml;
    }, 1500);
  }, []);

  return (
    <div
      className={`markdown-body ${className}`}
      onClick={handleCopy}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

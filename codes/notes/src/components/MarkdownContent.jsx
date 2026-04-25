import React, { useMemo } from 'react';
import markdownit from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import 'highlight.js/styles/github-dark.css';

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
}).use(highlightjs);

export default function MarkdownContent({ content = '', className = '' }) {
  const html = useMemo(() => md.render(content), [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

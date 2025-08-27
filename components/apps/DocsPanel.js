import React, { useEffect, useState } from 'react';
import { marked } from 'marked';

export default function DocsPanel({ id }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const renderer = new marked.Renderer();
    renderer.code = (code) => {
      const encoded = encodeURIComponent(code);
      return `<pre class="relative"><code>${code}</code><button class="copy-btn absolute top-1 right-1 bg-ubt-blue text-xs px-1" data-code="${encoded}">Copy</button></pre>`;
    };
    fetch(`/docs/${id}.md`)
      .then((res) => res.text())
      .then((md) => {
        setHtml(marked(md, { renderer }));
      });
  }, [id]);

  useEffect(() => {
    const handler = (e) => {
      const code = e.target.getAttribute('data-code');
      if (code) {
        navigator.clipboard && navigator.clipboard.writeText(decodeURIComponent(code));
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [html]);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-4">
      <p className="text-xs mb-4">
        Use these tools responsibly and only in environments where you have explicit authorization.
      </p>
      <nav className="mb-4 text-sm">
        <ul className="space-y-1">
          <li><a href="#overview">Overview</a></li>
          <li><a href="#install">Install</a></li>
          <li><a href="#commands">Commands</a></li>
          <li><a href="#lab">Lab</a></li>
          <li><a href="#further-reading">Further reading</a></li>
        </ul>
      </nav>
      <article className="prose prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

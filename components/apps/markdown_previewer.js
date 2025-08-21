import React, { useState } from 'react';
import { marked } from 'marked';

const MarkdownPreviewer = () => {
  const [markdown, setMarkdown] = useState('');

  return (
    <div className="h-full w-full flex bg-ub-cool-grey text-white">
      <textarea
        className="w-1/2 p-2 bg-gray-800 text-white resize-none outline-none"
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder="Type Markdown here..."
      />
      <div
        className="markdown-preview w-1/2 p-4 overflow-auto bg-gray-900"
        dangerouslySetInnerHTML={{ __html: marked.parse(markdown, { breaks: true }) }}
      />
      <style jsx>{`
        .markdown-preview h1 {
          font-size: 1.5rem;
          font-weight: bold;
          margin-top: 0.5rem;
        }
        .markdown-preview h2 {
          font-size: 1.25rem;
          font-weight: bold;
          margin-top: 0.5rem;
        }
        .markdown-preview pre {
          background-color: #1f2937;
          padding: 0.5rem;
          border-radius: 0.25rem;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};

export default MarkdownPreviewer;

export const displayMarkdownPreviewer = () => <MarkdownPreviewer />;


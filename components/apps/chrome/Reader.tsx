import React, { useEffect, useState } from 'react';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import DOMPurify from 'dompurify';
import { useReadLater } from './ReadLaterList';

interface ReaderProps {
  url: string;
}

interface Article {
  title: string;
  content: string;
  excerpt: string;
}

const Reader: React.FC<ReaderProps> = ({ url }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [markdown, setMarkdown] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown' | 'split'>('rendered');
  const [error, setError] = useState<string | null>(null);
  const { add } = useReadLater();

  useEffect(() => {
    const target = new URL(url, window.location.href);
    if (target.origin !== window.location.origin) {
      setError('Cross-origin content cannot be loaded.');
      return;
    }

    fetch(target.href)
      .then((res) => res.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const reader = new Readability(doc);
        const parsed = reader.parse();
        if (parsed) {
          const sanitizedContent = DOMPurify.sanitize(parsed.content ?? '');
          setArticle({
            title: parsed.title ?? '',
            content: sanitizedContent,
            excerpt: parsed.excerpt ?? '',
          });
          const turndown = new TurndownService();
          const md = turndown.turndown(sanitizedContent);
          setMarkdown(`# ${parsed.title ?? ''}\n\n${md}`);
        } else {
          setError('Unable to parse article.');
        }
      })
      .catch(() => setError('Unable to load page.'));
  }, [url]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('readerView');
    if (saved === 'rendered' || saved === 'markdown' || saved === 'split') {
      setViewMode(saved);
    }
  }, []);

  const changeView = (mode: 'rendered' | 'markdown' | 'split') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('readerView', mode);
    }
  };

  const copyMarkdown = () => {
    if (!markdown) return;
    navigator.clipboard?.writeText(markdown);
  };

  const saveForLater = () => {
    if (!article) return;
    add({ title: article.title, url, excerpt: article.excerpt });
  };

  if (error) return <div>{error}</div>;
  if (!article) return <div>Loading...</div>;

  const renderedContent = (
    <div dangerouslySetInnerHTML={{ __html: article.content }} />
  );

  const markdownContent = (
    <pre className="whitespace-pre-wrap overflow-auto">{markdown}</pre>
  );

  return (
    <div>
      <h1>{article.title}</h1>
      {viewMode === 'split' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {renderedContent}
          {markdownContent}
        </div>
      ) : viewMode === 'markdown' ? (
        markdownContent
      ) : (
        renderedContent
      )}
      <div className="flex gap-2 mt-4">
        <button onClick={() => changeView('rendered')}>Rendered</button>
        <button onClick={() => changeView('markdown')}>Markdown</button>
        <button onClick={() => changeView('split')}>Split</button>
        <button onClick={copyMarkdown}>Copy as Markdown</button>
        <button onClick={saveForLater}>Read Later</button>
      </div>
    </div>
  );
};

export default Reader;

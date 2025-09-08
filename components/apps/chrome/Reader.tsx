import { isBrowser } from '@/utils/env';
import React, { useEffect, useState } from 'react';
import { useReadLater } from './ReadLaterList';

interface ReaderProps {
  url: string;
}

interface Article {
  title: string;
  content: string;
  excerpt: string;
  markdown: string;
}

const Reader: React.FC<ReaderProps> = ({ url }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown' | 'split'>('rendered');
  const [error, setError] = useState<string | null>(null);
  const { add } = useReadLater();

  useEffect(() => {
    const target = new URL(url, window.location.href);
    if (target.origin !== window.location.origin) {
      setError('Cross-origin content cannot be loaded.');
      return;
    }

    const apiUrl = `/api/reader?url=${encodeURIComponent(target.href)}`;
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data: Article) => {
        if (data && data.content) {
          setArticle(data);
        } else {
          setError('Unable to parse article.');
        }
      })
      .catch(() => setError('Unable to load page.'));
  }, [url]);

  useEffect(() => {
    if (!isBrowser()) return;
    const saved = localStorage.getItem('readerView');
    if (saved === 'rendered' || saved === 'markdown' || saved === 'split') {
      setViewMode(saved);
    }
  }, []);

  const changeView = (mode: 'rendered' | 'markdown' | 'split') => {
    setViewMode(mode);
    if (isBrowser()) {
      localStorage.setItem('readerView', mode);
    }
  };

  const copyMarkdown = () => {
    if (!article?.markdown) return;
    navigator.clipboard?.writeText(article.markdown);
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
    <pre className="whitespace-pre-wrap overflow-auto">{article.markdown}</pre>
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

import React, { useEffect, useState } from 'react';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
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
          setArticle({
            title: parsed.title,
            content: parsed.content,
            excerpt: parsed.excerpt,
          });
        } else {
          setError('Unable to parse article.');
        }
      })
      .catch(() => setError('Unable to load page.'));
  }, [url]);

  const copyMarkdown = () => {
    if (!article) return;
    const turndown = new TurndownService();
    const md = turndown.turndown(article.content);
    const text = `# ${article.title}\n\n${md}`;
    navigator.clipboard?.writeText(text);
  };

  const saveForLater = () => {
    if (!article) return;
    add({ title: article.title, url, excerpt: article.excerpt });
  };

  if (error) return <div>{error}</div>;
  if (!article) return <div>Loading...</div>;

  return (
    <div>
      <h1>{article.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
      <div className="flex gap-2 mt-4">
        <button onClick={copyMarkdown}>Copy as Markdown</button>
        <button onClick={saveForLater}>Read Later</button>
      </div>
    </div>
  );
};

export default Reader;

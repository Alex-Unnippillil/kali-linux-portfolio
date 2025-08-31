import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface Author {
  name: string;
  avatar?: string;
  href?: string;
  bio?: string;
}

interface Related {
  title: string;
  href: string;
}

interface BlogPostProps {
  title: string;
  content: string; // HTML string
  author: Author;
  related?: Related[];
}

const BlogPost: React.FC<BlogPostProps> = ({ title, content, author, related = [] }) => {
  const articleRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const wordsPerMinute = 200;
    const text = articleRef.current?.textContent || '';
    setTime(Math.max(1, Math.ceil(text.split(/\s+/).length / wordsPerMinute)));
  }, [content]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const current = window.scrollY;
      const percent = (current / total) * 100;
      setProgress(Math.min(100, Math.max(0, percent)));
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const blocks = articleRef.current?.querySelectorAll('pre code') || [];
    blocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
      const pre = block.parentElement;
      if (pre && !pre.querySelector('button')) {
        pre.classList.add('relative', 'group');
        const btn = document.createElement('button');
        btn.textContent = 'Copy';
        btn.className =
          'absolute top-2 right-2 bg-ub-grey text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity';
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.textContent || '');
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy'), 1500);
        });
        pre.appendChild(btn);
      }
    });
  }, [content]);

  return (
    <article ref={articleRef} className="mx-auto max-w-3xl space-y-6 px-4">
      <div
        className="fixed top-0 left-0 h-1 bg-ub-orange z-50 transition-all"
        style={{ width: `${progress}%` }}
      />
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-sm text-ub-warm-grey">{time} min read</p>
      <div dangerouslySetInnerHTML={{ __html: content }} />
      <div className="mt-8 p-4 border-t border-ub-grey flex items-center">
        {author.avatar && (
          <img src={author.avatar} alt={author.name} className="w-12 h-12 rounded-full mr-4" />
        )}
        <div>
          <p className="font-bold">{author.name}</p>
          {author.bio && <p className="text-sm text-ub-warm-grey">{author.bio}</p>}
          {author.href && (
            <a href={author.href} className="text-ub-orange underline">
              More from this author
            </a>
          )}
        </div>
      </div>
      {related.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Related work</h3>
          <ul className="list-disc list-inside space-y-1">
            {related.map((r) => (
              <li key={r.href}>
                <a href={r.href} className="text-ub-orange underline">
                  {r.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};

export default BlogPost;


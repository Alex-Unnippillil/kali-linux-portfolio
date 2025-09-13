import { useEffect, useMemo, useState } from 'react';
import postsData from '../data/blog-posts.json';

interface Post {
  id: number;
  title: string;
  excerpt: string;
  tags: string[];
}

const BlogPage = () => {
  const posts = postsData as Post[];
  const [activeTag, setActiveTag] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActiveTag(params.get('tag') || '');
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      setActiveTag(p.get('tag') || '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.tags))),
    [posts]
  );
  const filtered = useMemo(
    () => posts.filter((p) => !activeTag || p.tags.includes(activeTag)),
    [posts, activeTag]
  );

  const toggleTag = (tag: string) => {
    const next = tag === activeTag ? '' : tag;
    const params = new URLSearchParams(window.location.search);
    if (next) {
      params.set('tag', next);
    } else {
      params.delete('tag');
    }
    const url = params.toString() ? `?${params.toString()}` : '';
    window.history.pushState({}, '', url);
    setActiveTag(next);
  };

  return (
    <main className="p-4 bg-ub-cool-grey text-white min-h-screen">
      <div className="flex flex-wrap gap-2 mb-4">
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => toggleTag(t)}
            className={`px-3 py-1 rounded-full text-sm ${
              activeTag === t ? 'bg-blue-500 text-white' : 'bg-gray-700'
            }`}
            aria-pressed={activeTag === t}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="space-y-4">
        {filtered.map((post) => (
          <li key={post.id} className="border border-gray-700 p-4 rounded">
            <h2 className="text-xl font-semibold">{post.title}</h2>
            <p className="text-sm">{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default BlogPage;

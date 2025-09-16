import React, { useEffect, useState } from 'react';

interface Post {
  id: number;
  title: string;
  summary: string;
  url: string;
}

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    import('../data/blog-posts.json').then((mod) => {
      if (isMounted) {
        setPosts(mod.default as Post[]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!posts) {
    return (
      <ul data-testid="blog-skeleton" className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <li key={idx} className="space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-full" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-4">
      {posts.map((p) => (
        <li key={p.id} className="space-y-1">
          <a
            href={p.url}
            className="text-ubt-blue hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {p.title}
          </a>
          <p className="text-sm">{p.summary}</p>
        </li>
      ))}
    </ul>
  );
};

export default BlogList;

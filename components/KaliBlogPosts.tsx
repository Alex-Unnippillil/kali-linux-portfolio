"use client";

import { useEffect, useState } from 'react';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export default function KaliBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch('/api/kali-blog')
      .then((res) => res.json())
      .then((data) => setPosts(data.slice(0, 3)))
      .catch((err) => console.error('Failed to load blog posts', err));
  }, []);

  if (!posts.length) return null;

  return (
    <section className="max-w-3xl mx-auto mt-8 text-white">
      <h2 className="text-xl font-bold mb-4">Latest from Kali Blog</h2>
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.link}>
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ub-orange hover:underline"
            >
              {post.title}
            </a>
            <div className="text-xs text-gray-400">
              {new Date(post.pubDate).toLocaleDateString()}
            </div>
            <p className="text-sm text-gray-200">{post.description.replace(/<[^>]*>/g, "")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}


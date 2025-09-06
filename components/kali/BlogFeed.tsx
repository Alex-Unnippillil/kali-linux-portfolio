import React from 'react';
import posts from '../../data/kali-blog.json';

interface Post {
  title: string;
  link: string;
  date: string;
}

const BlogFeed: React.FC = () => {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.slice(0, 6).map((post: Post) => (
        <div
          key={post.link}
          className="flex flex-col p-4 rounded bg-gray-800 text-white"
        >
          <h3 className="text-lg font-semibold">{post.title}</h3>
          <p className="text-sm text-gray-400">
            {new Date(post.date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto text-sm text-blue-400 hover:underline"
          >
            Read on kali.org ↗
          </a>
        </div>
      ))}
    </div>
  );
};

export default BlogFeed;

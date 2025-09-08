import React from 'react';
import posts from '../../data/kali-blog.json';

interface Post {
  title: string;
  link: string;
  date: string;
}

const BlogFeed: React.FC = () => {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-label="Latest blog posts">
      {posts.slice(0, 3).map((post: Post) => (
        <article
          key={post.link}
          className="flex flex-col rounded border border-gray-700 bg-gray-800 p-4 text-white"
        >
          <h3 className="text-base font-semibold leading-snug">
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {post.title}
            </a>
          </h3>
          <time
            dateTime={post.date}
            className="mt-2 text-sm text-gray-400"
          >
            {new Date(post.date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </article>
      ))}
    </div>
  );
};

export default BlogFeed;

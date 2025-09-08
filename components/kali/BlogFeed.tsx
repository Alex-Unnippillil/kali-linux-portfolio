import { useState, useRef, KeyboardEvent } from 'react';
import posts from '../../data/kali-blog.json';
import Pagination from '../ui/Pagination';

interface Post {
  title: string;
  link: string;
  date: string;
}

const PAGE_SIZE = 6;

const BlogFeed: React.FC = () => {
  const [page, setPage] = useState(0);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const pageCount = Math.ceil(posts.length / PAGE_SIZE);
  const pagePosts = posts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex(
      (el) => el === document.activeElement,
    );
    if (currentIndex === -1) return;
    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, pagePosts.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 2, pagePosts.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 2, 0);
        break;
      default:
        return;
    }
    e.preventDefault();
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2" onKeyDown={handleKeyDown}>
        {pagePosts.map((post: Post, i: number) => (
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
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              Read on kali.org ↗
            </a>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default BlogFeed;

import { useState, useRef, KeyboardEvent } from 'react';
import tools from '../../data/kali-tools.json';

const PAGE_SIZE = 30;
const COLUMNS = 3; // used for keyboard navigation

const badgeClass =
  'inline-block rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100';

export default function ToolsPage() {
  const [page, setPage] = useState(0);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const pageCount = Math.ceil(tools.length / PAGE_SIZE);
  const pageTools = tools.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = itemRefs.current.findIndex(
      (el) => el === document.activeElement,
    );

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, pageTools.length - 1);
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + COLUMNS, pageTools.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - COLUMNS, 0);
        break;
      default:
        return;
    }

    e.preventDefault();
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="p-4">
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        onKeyDown={handleKeyDown}
      >
        {pageTools.map((tool, i) => (
          <li key={tool.id}>
            <a
              href={`https://www.kali.org/tools/${tool.id}/`}
              className="block rounded border p-4 focus:outline-none focus:ring"
              ref={(el) => (itemRefs.current[i] = el)}
            >
              <h3 className="font-semibold">{tool.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`https://gitlab.com/kalilinux/packages/${tool.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={badgeClass}
                >
                  Source
                </a>
                <a
                  href={`https://www.kali.org/tools/${tool.id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={badgeClass}
                >
                  Package
                </a>
                <span className={badgeClass}>{`$ apt install ${tool.id}`}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page === 0}
          className="rounded border px-3 py-1 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
          disabled={page === pageCount - 1}
          className="rounded border px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}


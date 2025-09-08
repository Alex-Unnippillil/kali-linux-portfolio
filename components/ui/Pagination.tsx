import { useRef, KeyboardEvent } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  btnRefs.current = [];
  let refIndex = 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = btnRefs.current.findIndex(
      (el) => el === document.activeElement,
    );
    if (currentIndex === -1) return;
    let nextIndex = currentIndex;
    switch (e.key) {
      case "ArrowRight":
        nextIndex = Math.min(currentIndex + 1, btnRefs.current.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = btnRefs.current.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    btnRefs.current[nextIndex]?.focus();
  };

  return (
    <nav aria-label="Pagination">
      <ul className="flex items-center gap-2" onKeyDown={handleKeyDown}>
        <li>
          <button
            ref={(el) => {
              btnRefs.current[refIndex++] = el;
            }}
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0}
            aria-label="First page"
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            First
          </button>
        </li>
        <li>
          <button
            ref={(el) => {
              btnRefs.current[refIndex++] = el;
            }}
            onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
            disabled={currentPage === 0}
            aria-label="Previous page"
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Prev
          </button>
        </li>
        {Array.from({ length: totalPages }, (_, i) => (
          <li key={i}>
            <button
              ref={(el) => {
                btnRefs.current[refIndex++] = el;
              }}
              onClick={() => onPageChange(i)}
              aria-label={`Page ${i + 1}`}
              aria-current={currentPage === i ? "page" : undefined}
              className={`rounded border px-3 py-1 ${
                currentPage === i ? "bg-gray-200 dark:bg-gray-700" : ""
              }`}
            >
              {i + 1}
            </button>
          </li>
        ))}
        <li>
          <button
            ref={(el) => {
              btnRefs.current[refIndex++] = el;
            }}
            onClick={() =>
              onPageChange(Math.min(currentPage + 1, totalPages - 1))
            }
            disabled={currentPage === totalPages - 1}
            aria-label="Next page"
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </li>
        <li>
          <button
            ref={(el) => {
              btnRefs.current[refIndex++] = el;
            }}
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage === totalPages - 1}
            aria-label="Last page"
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Last
          </button>
        </li>
      </ul>
    </nav>
  );
}

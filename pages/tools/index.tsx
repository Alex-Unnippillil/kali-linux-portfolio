import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import tools from "../../data/kali-tools.json";
import Pagination from "../../components/ui/Pagination";
import ToolCard from "@/components/tools/ToolCard";

const PAGE_SIZE_OPTIONS = [30, 60, 90];
const COLUMNS = 3; // used for keyboard navigation

export default function ToolsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const pageCount = Math.ceil(tools.length / pageSize);
  const pageTools = tools.slice(page * pageSize, (page + 1) * pageSize);

  const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = itemRefs.current.findIndex(
      (el) => el === document.activeElement,
    );

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    switch (e.key) {
      case "ArrowRight":
        nextIndex = Math.min(currentIndex + 1, pageTools.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case "ArrowDown":
        nextIndex = Math.min(currentIndex + COLUMNS, pageTools.length - 1);
        break;
      case "ArrowUp":
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
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        onKeyDown={handleKeyDown}
      >
        {pageTools.map((tool, i) => (
          <li key={tool.id}>
            <ToolCard
              id={tool.id}
              name={tool.name}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm">
            Results per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded border p-2"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

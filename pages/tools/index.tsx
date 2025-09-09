import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import type { GetStaticProps } from "next";
import Pagination from "../../components/ui/Pagination";
import DensityWrapper from "../../components/ui/DensityWrapper";

const PAGE_SIZE_OPTIONS = [30, 60, 90];
const COLUMNS = 3; // used for keyboard navigation

const badgeClass =
  "inline-block rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100";

interface Tool {
  id: string;
  name: string;
}

interface ToolsPageProps {
  tools: Tool[];
}

export default function ToolsPage({ tools }: ToolsPageProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]!);
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
    <DensityWrapper>
      <div className="p-4">
        <ul
          className="tools-grid grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          onKeyDown={handleKeyDown}
        >
          {pageTools.map((tool, i) => (
            <li key={tool.id}>
            <a
              href={`https://www.kali.org/tools/${tool.id}/`}
              className="tools-card block rounded border p-4 focus:outline-none focus:ring"
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <h3 className="font-semibold text-base sm:text-lg md:text-xl">
                {tool.name}
              </h3>
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
    </DensityWrapper>
  );
}

export const getStaticProps: GetStaticProps<ToolsPageProps> = async () => {
  const res = await fetch("https://www.kali.org/tools/kali-tools.json");
  const tools = (await res.json()) as Tool[];
  return { props: { tools }, revalidate: 7200 };
};

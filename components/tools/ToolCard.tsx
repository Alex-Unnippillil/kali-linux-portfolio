import React, { forwardRef } from 'react';

interface ToolCardProps {
  id: string;
  name: string;
  href?: string;
}

const badgeClass =
  "inline-block rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100";

const ToolCard = forwardRef<HTMLAnchorElement, ToolCardProps>(
  ({ id, name, href = `https://www.kali.org/tools/${id}/` }, ref) => (
    <a
      href={href}
      className="block rounded border p-4 focus:outline-none focus:ring"
      ref={ref}
    >
      <h3 className="font-semibold text-base sm:text-lg md:text-xl">{name}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={`https://gitlab.com/kalilinux/packages/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={badgeClass}
        >
          Source
        </a>
        <a
          href={`https://www.kali.org/tools/${id}/`}
          target="_blank"
          rel="noopener noreferrer"
          className={badgeClass}
        >
          Package
        </a>
        <span className={badgeClass}>{`$ apt install ${id}`}</span>
      </div>
    </a>
  ),
);

ToolCard.displayName = 'ToolCard';

export default ToolCard;


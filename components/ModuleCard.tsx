import type { FuseResultMatch } from 'fuse.js';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ModuleMetadata } from '../modules/metadata';

interface ModuleCardProps {
  module: ModuleMetadata;
  onSelect: (module: ModuleMetadata) => void;
  selected: boolean;
  /** Current search query for highlighting */
  query?: string;
  /** Fuse.js matches for highlighting */
  matches?: readonly FuseResultMatch[];
}

function highlight(
  text: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
  fallbackQuery?: string
): ReactNode {
  const normalizedKey = key.toLowerCase();
  const match = matches?.find((m) => {
    const keyValue = Array.isArray(m.key) ? m.key.join('.') : m.key;
    return keyValue?.toLowerCase() === normalizedKey;
  });

  if (match && match.indices.length > 0) {
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    match.indices.forEach(([start, end], idx) => {
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      parts.push(
        <mark key={`${normalizedKey}-${idx}-${start}-${end}`}>
          {text.slice(start, end + 1)}
        </mark>
      );

      lastIndex = end + 1;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return <>{parts}</>;
  }

  if (fallbackQuery) {
    const lower = text.toLowerCase();
    const q = fallbackQuery.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx !== -1) {
      return (
        <>
          {text.slice(0, idx)}
          <mark>{text.slice(idx, idx + q.length)}</mark>
          {text.slice(idx + q.length)}
        </>
      );
    }
  }

  return text;
}

export default function ModuleCard({
  module,
  onSelect,
  selected,
  query,
  matches,
}: ModuleCardProps) {
  return (
    <button
      onClick={() => onSelect(module)}
      data-testid={`module-card-${module.name}`}
      className={`w-full text-left border rounded p-3 flex items-start justify-between hover:bg-gray-50 focus:outline-none ${
        selected ? 'bg-gray-100' : ''
      }`}
    >
      <div className="flex-1 pr-2 font-mono">
        <h3 className="font-bold">
          {highlight(module.name, matches, 'name', query)}
        </h3>
        <p className="text-sm">
          {highlight(module.description, matches, 'description', query)}
        </p>
      </div>
      <div className="flex flex-col gap-2 items-center">
        <Image
          src="/themes/Yaru/status/about.svg"
          alt="Details"
          width={24}
          height={24}
        />
        <Image
          src="/themes/Yaru/status/download.svg"
          alt="Run"
          width={24}
          height={24}
        />
      </div>
    </button>
  );
}

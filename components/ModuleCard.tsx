import type { ReactNode } from 'react';
import Image from 'next/image';
import { ModuleMetadata } from '../modules/metadata';

interface ModuleCardProps {
  module: ModuleMetadata;
  onSelect: (module: ModuleMetadata) => void;
  selected: boolean;
  /** Current search query for highlighting */
  query?: string;
}

function highlight(text: string, query: string | undefined): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function ModuleCard({
  module,
  onSelect,
  selected,
  query,
}: ModuleCardProps) {
  return (
    <button
      onClick={() => onSelect(module)}
      className={`w-full text-left border rounded-xl p-4 sm:p-5 flex flex-col gap-4 transition shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 ${
        selected ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'
      }`}
    >
      {module.thumbnail ? (
        <div className="w-full overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={module.thumbnail}
            alt={`${module.name} thumbnail`}
            width={480}
            height={270}
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 font-mono">
        <h3 className="text-base font-semibold leading-tight text-gray-900 sm:text-lg">
          {highlight(module.name, query)}
        </h3>
        <p className="text-sm leading-relaxed text-gray-700 sm:text-base">
          {highlight(module.description, query)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Image
          src="/themes/Yaru/status/about.svg"
          alt="Details"
          width={28}
          height={28}
          className="h-7 w-7"
        />
        <Image
          src="/themes/Yaru/status/download.svg"
          alt="Run"
          width={28}
          height={28}
          className="h-7 w-7"
        />
      </div>
    </button>
  );
}

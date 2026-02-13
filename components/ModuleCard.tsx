import Image from 'next/image';
import { ModuleMetadata } from '../modules/metadata';

interface ModuleCardProps {
  module: ModuleMetadata;
  onSelect: (module: ModuleMetadata) => void;
  selected: boolean;
  /** Current search query for highlighting */
  query?: string;
}

function highlight(text: string, query: string | undefined) {
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
      className={`w-full text-left border rounded-lg p-4 flex flex-col gap-4 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected ? 'bg-gray-100' : ''
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Image
              src="/themes/Yaru/status/about.svg"
              alt="Module details"
              width={28}
              height={28}
            />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Details
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Image
              src="/themes/Yaru/status/download.svg"
              alt="Run module"
              width={28}
              height={28}
            />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Run
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 font-mono text-gray-800">
        <h3 className="text-base font-bold text-center sm:text-left">
          {highlight(module.name, query)}
        </h3>
        <p className="text-sm leading-relaxed text-center sm:text-left">
          {highlight(module.description, query)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-full items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
            View module details
          </span>
          <span className="inline-flex w-full items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm">
            Run selected module
          </span>
        </div>
      </div>
    </button>
  );
}

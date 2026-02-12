import Image from 'next/image';
import type { ModuleMetadata } from '../types/metasploit';

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
      className={`w-full text-left border rounded p-3 flex items-start justify-between hover:bg-gray-50 focus:outline-none ${
        selected ? 'bg-gray-100' : ''
      }`}
    >
      <div className="flex-1 pr-2 font-mono">
        <h3 className="font-bold">{highlight(module.name, query)}</h3>
        <p className="text-sm">{highlight(module.description, query)}</p>
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

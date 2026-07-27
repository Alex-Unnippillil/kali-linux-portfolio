import Image from 'next/image';
import { useState } from 'react';

import { ModuleBadge, ModuleMetadata } from '../modules/metadata';

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

const ACTION_ICONS = [
  {
    src: '/themes/Yaru/status/about.svg',
    alt: 'Details',
  },
  {
    src: '/themes/Yaru/status/download.svg',
    alt: 'Run',
  },
];

const CARD_BASE_CLASSES =
  'relative flex w-full items-start justify-between rounded border p-3 text-left transition focus:outline-none hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const BADGE_BASE_CLASSES =
  'pointer-events-none absolute -left-px -top-px flex h-6 items-center rounded-br px-2 text-xs font-semibold uppercase tracking-wide';

const BADGE_CONFIG: Record<ModuleBadge, { label: string; text: string; className: string }> = {
  beta: {
    label: 'Beta module',
    text: 'Beta',
    className: 'bg-amber-500 text-white',
  },
  popular: {
    label: 'Popular module',
    text: 'Popular',
    className: 'bg-sky-500 text-white',
  },
};

function IconWithSkeleton({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      {!loaded && (
        <span
          className="absolute inset-0 animate-pulse rounded bg-gray-200"
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={24}
        height={24}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}

export default function ModuleCard({
  module,
  onSelect,
  selected,
  query,
}: ModuleCardProps) {
  const badge = module.badge ? BADGE_CONFIG[module.badge] : undefined;

  return (
    <button
      onClick={() => onSelect(module)}
      className={`${CARD_BASE_CLASSES} ${selected ? 'bg-gray-100' : ''}`}
    >
      {badge && (
        <span
          aria-label={badge.label}
          className={`${BADGE_BASE_CLASSES} ${badge.className}`}
        >
          <span className="sr-only">{badge.label}</span>
          <span aria-hidden="true">{badge.text}</span>
        </span>
      )}
      <div className="flex-1 pr-2 font-mono">
        <h3 className="font-bold">{highlight(module.name, query)}</h3>
        <p className="text-sm">{highlight(module.description, query)}</p>
      </div>
      <div className="flex flex-col gap-2 items-center">
        {ACTION_ICONS.map((icon) => (
          <IconWithSkeleton key={icon.src} src={icon.src} alt={icon.alt} />
        ))}
      </div>
    </button>
  );
}

'use client';

import { useId, useState } from 'react';
import { logEvent } from '@/utils/analytics';

export type PatternRecipe = {
  id: string;
  name: string;
  description: string;
  pattern: string;
  flags?: string;
  sampleText: string;
};

export const PATTERN_RECIPES: PatternRecipe[] = [
  {
    id: 'email',
    name: 'Email address',
    description: 'Matches common email formats like name@example.com.',
    pattern: '[^\\\s@]+@[^\\\s@]+\\.[^\\\s@]+',
    flags: 'gi',
    sampleText: 'Reach us at support@example.com or sales@example.org.',
  },
  {
    id: 'url',
    name: 'HTTP/HTTPS URL',
    description: 'Captures links beginning with http:// or https://.',
    pattern: 'https?:\\/\\/(?:[\\w-]+\\.)+[\\w-]+(?:[\\w./?%&=-]*)',
    flags: 'gi',
    sampleText: 'Reference https://example.com/docs for the full guide.',
  },
  {
    id: 'ipv4',
    name: 'IPv4 address',
    description: 'Finds IPv4 addresses such as 192.168.0.1.',
    pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b',
    flags: 'g',
    sampleText: 'New login detected from 10.0.0.42.',
  },
  {
    id: 'iso-date',
    name: 'ISO date (YYYY-MM-DD)',
    description: 'Targets ISO formatted dates inside text.',
    pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b',
    flags: 'g',
    sampleText: 'Release schedule updated to 2024-10-01.',
  },
];

const shouldTrackAnalytics = (): boolean => {
  const flag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  if (typeof flag !== 'string') {
    return false;
  }
  const normalized = flag.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
};

export interface PatternGalleryProps {
  onPatternChange: (pattern: string) => void;
  onTestStringChange: (value: string) => void;
  onFlagsChange?: (flags: string) => void;
  className?: string;
  analyticsCategory?: string;
}

const PatternGallery: React.FC<PatternGalleryProps> = ({
  onPatternChange,
  onTestStringChange,
  onFlagsChange,
  className = '',
  analyticsCategory = 'regex_tester',
}) => {
  const headingId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  const containerClassName = [
    'rounded-lg border border-slate-700 bg-slate-900 shadow-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const applyRecipe = (recipe: PatternRecipe) => {
    onPatternChange(recipe.pattern);
    onTestStringChange(recipe.sampleText);
    if (onFlagsChange) {
      onFlagsChange(recipe.flags ?? '');
    }
    setActiveId(recipe.id);
    if (shouldTrackAnalytics()) {
      logEvent({
        category: analyticsCategory,
        action: 'apply_recipe',
        label: recipe.id,
      });
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className={containerClassName}
      data-testid="pattern-gallery"
    >
      <header className="border-b border-slate-800 px-4 py-3">
        <h2
          id={headingId}
          className="text-sm font-semibold uppercase tracking-wide text-slate-200"
        >
          Pattern gallery
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Load a regex recipe and tweak it for your dataset.
        </p>
      </header>
      <ul className="divide-y divide-slate-800">
        {PATTERN_RECIPES.map((recipe) => {
          const isActive = activeId === recipe.id;
          const flagDisplay = recipe.flags ?? '';
          return (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => applyRecipe(recipe)}
                aria-label={`Use ${recipe.name} pattern`}
                aria-pressed={isActive}
                className={`flex w-full flex-col gap-2 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                  isActive ? 'bg-slate-800/80 shadow-inner' : 'hover:bg-slate-800/60'
                }`}
                data-testid={`pattern-${recipe.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-white">
                    {recipe.name}
                  </span>
                  <span className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Apply
                  </span>
                </div>
                <p className="text-xs text-slate-400">{recipe.description}</p>
                <code className="overflow-x-auto rounded bg-slate-950/60 p-2 text-xs text-sky-300">
                  /{recipe.pattern}/{flagDisplay}
                </code>
                <p className="text-xs text-slate-500">
                  Sample:
                  <span className="ml-1 text-slate-200">{recipe.sampleText}</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PatternGallery;

'use client';

import React from 'react';

type CaptureEntry = {
  id: string;
  protocol: string;
  summary: string;
  detail: string;
  highlightPhrases: string[];
  tags: string[];
  explanation: string;
};

interface CaptureShowcaseProps {
  entries: CaptureEntry[];
  availableFilters: string[];
  activeFilters: string[];
  onToggleFilter: (filter: string) => void;
  onClearFilters: () => void;
  scenarioLabel: string;
}

function HighlightedDetail({ detail, highlightPhrases }: { detail: string; highlightPhrases: string[] }) {
  if (highlightPhrases.length === 0) {
    return <>{detail}</>;
  }

  const loweredDetail = detail.toLowerCase();
  const matches: { start: number; end: number }[] = [];

  highlightPhrases.forEach((phrase) => {
    const target = phrase.toLowerCase();
    if (!target) return;

    let cursor = 0;
    while (cursor < loweredDetail.length) {
      const foundIndex = loweredDetail.indexOf(target, cursor);
      if (foundIndex === -1) break;
      matches.push({ start: foundIndex, end: foundIndex + target.length });
      cursor = foundIndex + target.length;
    }
  });

  matches.sort((a, b) => (a.start === b.start ? b.end - a.end : a.start - b.start));

  const merged: { start: number; end: number }[] = [];
  matches.forEach((match) => {
    const last = merged[merged.length - 1];
    if (!last || match.start >= last.end) {
      merged.push(match);
    }
  });

  const segments: { text: string; highlight: boolean }[] = [];
  let pointer = 0;

  merged.forEach((match) => {
    if (pointer < match.start) {
      segments.push({ text: detail.slice(pointer, match.start), highlight: false });
    }
    segments.push({ text: detail.slice(match.start, match.end), highlight: true });
    pointer = match.end;
  });

  if (pointer < detail.length) {
    segments.push({ text: detail.slice(pointer), highlight: false });
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={`${segment.text}-${index}`}
            className="rounded bg-[color:color-mix(in_srgb,var(--color-warning)_40%,var(--kali-panel))] px-1 py-0.5 text-[color:var(--kali-text)]"
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={`${segment.text}-${index}`}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}

export default function CaptureShowcase({
  entries,
  availableFilters,
  activeFilters,
  onToggleFilter,
  onClearFilters,
  scenarioLabel,
}: CaptureShowcaseProps) {
  const filteredEntries = entries.filter((entry) =>
    activeFilters.length === 0 ? true : entry.tags.some((tag) => activeFilters.includes(tag)),
  );

  return (
    <section className="space-y-3" aria-labelledby="ettercap-capture-heading">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="ettercap-capture-heading"
            className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))]"
          >
            Canned captures — {scenarioLabel}
          </h2>
          <p className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_55%,var(--kali-text))]">
            Toggle filters to focus on the packets most relevant to your investigation.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
          {filteredEntries.length} of {entries.length} entries visible
        </span>
      </header>

      <fieldset className="flex flex-wrap gap-2" aria-label="Capture filters">
        <legend className="sr-only">Filter capture entries</legend>
        {availableFilters.map((filter) => {
          const isActive = activeFilters.includes(filter);
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onToggleFilter(filter)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] ${
                isActive
                  ? 'border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)] bg-[color:var(--color-primary)] text-[color:var(--kali-text)]'
                  : 'border-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color:var(--kali-panel)] text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))] hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)]'
              }`}
              aria-pressed={isActive}
            >
              {filter}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))] transition hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
        >
          Clear filters
        </button>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2" role="list">
        {filteredEntries.map((entry) => (
          <article
            key={entry.id}
            role="listitem"
            className="flex h-full flex-col gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_6%,var(--kali-panel))] p-4 text-sm text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))] shadow-[0_0_14px_rgba(15,23,42,0.35)]"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
                  {entry.protocol}
                </p>
                <h3 className="text-base font-semibold text-[color:var(--kali-text)]">{entry.summary}</h3>
              </div>
              <span className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--kali-bg))] px-2 py-1 text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
                {entry.tags.join(', ')}
              </span>
            </header>
            <pre className="overflow-x-auto rounded-lg bg-[color:color-mix(in_srgb,var(--kali-bg)_94%,var(--color-primary)_6%)] p-3 text-xs leading-relaxed text-[color:var(--kali-text)]">
              <code>
                <HighlightedDetail detail={entry.detail} highlightPhrases={entry.highlightPhrases} />
              </code>
            </pre>
            <aside
              className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--kali-bg))] p-3 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]"
              role="note"
            >
              <p className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))]">
                Why it matters
              </p>
              <p className="mt-1 leading-relaxed">{entry.explanation}</p>
            </aside>
          </article>
        ))}
        {filteredEntries.length === 0 && (
          <p
            className="rounded-lg border border-dashed border-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_5%,var(--kali-panel))] p-4 text-sm text-[color:color-mix(in_srgb,var(--color-primary)_55%,var(--kali-text))]"
            aria-live="polite"
          >
            No capture entries match the selected filters. Try clearing them to review the full dataset.
          </p>
        )}
      </div>
    </section>
  );
}

export type { CaptureEntry };

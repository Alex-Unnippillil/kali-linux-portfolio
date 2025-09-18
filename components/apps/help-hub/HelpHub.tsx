import React, { useEffect, useMemo, useRef, useState } from 'react';
import tipsData from '../../../data/help-hub/index.json';

type HelpAction =
  | { kind: 'app'; label: string; target: string }
  | { kind: 'link'; label: string; target: string; newTab?: boolean };

type HelpVideo = {
  src: string;
  type: string;
  caption?: string;
  transcript?: string[];
};

type HelpTip = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  video?: HelpVideo;
  actions?: HelpAction[];
};

type Props = {
  openApp?: (id: string) => void;
};

type ScoredTip = { tip: HelpTip; score: number; index: number };

const getScore = (tip: HelpTip, tokens: string[]): number => {
  if (!tokens.length) return 0;
  const haystack = {
    title: tip.title.toLowerCase(),
    description: tip.description.toLowerCase(),
    tags: tip.tags.map((tag) => tag.toLowerCase()),
    transcript: tip.video?.transcript?.join(' ').toLowerCase() ?? '',
  };
  let score = 0;
  tokens.forEach((token) => {
    if (haystack.title.includes(token)) score += 5;
    if (haystack.description.includes(token)) score += 3;
    if (haystack.tags.some((tag) => tag.includes(token))) score += 2;
    if (haystack.transcript.includes(token)) score += 1;
  });
  return score;
};

const HelpHub: React.FC<Props> = ({ openApp }) => {
  const tips = tipsData as HelpTip[];
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>(tips[0]?.id ?? '');
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const liveRegionRef = useRef<HTMLParagraphElement | null>(null);

  const allTags = useMemo(
    () =>
      Array.from(new Set(tips.flatMap((tip) => tip.tags))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [tips]
  );

  const filteredTips = useMemo(() => {
    const normalizedTags = selectedTags.map((tag) => tag.toLowerCase());
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const matchesTags = (tip: HelpTip) =>
      normalizedTags.every((tag) => tip.tags.map((t) => t.toLowerCase()).includes(tag));

    if (!tokens.length) {
      return tips
        .map<ScoredTip>((tip, index) => ({ tip, score: 0, index }))
        .filter(({ tip }) => matchesTags(tip));
    }

    return tips
      .map<ScoredTip>((tip, index) => ({
        tip,
        score: getScore(tip, tokens),
        index,
      }))
      .filter(({ score, tip }) => score > 0 && matchesTags(tip))
      .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score));
  }, [tips, query, selectedTags]);

  const resolvedTips = useMemo(() => filteredTips.map(({ tip }) => tip), [filteredTips]);

  useEffect(() => {
    const message =
      resolvedTips.length === 0
        ? 'No help topics match the current filters.'
        : `${resolvedTips.length} help topic${resolvedTips.length === 1 ? '' : 's'} available.`;
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, [resolvedTips]);

  useEffect(() => {
    if (resolvedTips.length === 0) {
      setSelectedId('');
      return;
    }
    if (!resolvedTips.some((tip) => tip.id === selectedId)) {
      setSelectedId(resolvedTips[0].id);
    }
  }, [resolvedTips, selectedId]);

  const selectedTip = useMemo(
    () => resolvedTips.find((tip) => tip.id === selectedId) ?? resolvedTips[0] ?? null,
    [resolvedTips, selectedId]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleKeyNavigation = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!resolvedTips.length) return;
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + 1, resolvedTips.length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = resolvedTips.length - 1;
    buttonsRef.current[nextIndex]?.focus();
  };

  const handleAction = (action: HelpAction) => {
    if (action.kind === 'app') {
      if (openApp) {
        openApp(action.target);
      } else {
        window.dispatchEvent(new CustomEvent('open-app', { detail: action.target }));
      }
    } else {
      const target = action.newTab ? '_blank' : '_self';
      window.open(action.target, target, action.newTab ? 'noopener' : undefined);
    }
  };

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white md:flex-row" data-testid="help-hub">
      <div className="md:w-1/2 md:border-r md:border-ub-grey-dark p-4 space-y-4" role="navigation" aria-label="Help Hub filters and topics">
        <div>
          <label htmlFor="help-hub-search" className="text-sm font-semibold block">
            Search tips
          </label>
          <input
            id="help-hub-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 w-full rounded bg-black bg-opacity-20 px-3 py-2 text-white placeholder-gray-300 focus:outline-none focus:ring"
            placeholder="Search by keyword or tag"
          />
        </div>
        <fieldset className="space-y-2" aria-label="Filter by tag">
          <legend className="text-sm font-semibold">Tags</legend>
          <div className="flex flex-wrap gap-2" role="list">
            {allTags.map((tag) => {
              const checked = selectedTags.includes(tag);
              return (
                <label
                  key={tag}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${
                    checked ? 'bg-ubt-blue border-ubt-blue text-white' : 'border-ub-grey-dark text-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleTag(tag)}
                    aria-label={tag}
                  />
                  {tag}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div
          role="listbox"
          aria-label="Help topics"
          aria-activedescendant={selectedTip ? `help-topic-${selectedTip.id}` : undefined}
          className="space-y-2 overflow-auto pr-2"
        >
          {resolvedTips.map((tip, index) => (
            <button
              key={tip.id}
              id={`help-topic-${tip.id}`}
              role="option"
              aria-selected={tip.id === selectedId}
              onClick={() => setSelectedId(tip.id)}
              onKeyDown={(event) => handleKeyNavigation(event, index)}
              className={`w-full rounded border px-3 py-2 text-left transition focus:outline-none focus:ring ${
                tip.id === selectedId
                  ? 'border-ubt-blue bg-ubt-blue bg-opacity-30'
                  : 'border-ub-grey-dark hover:bg-black hover:bg-opacity-20'
              }`}
              ref={(element) => {
                buttonsRef.current[index] = element;
              }}
              data-tip-id={tip.id}
              aria-describedby={`help-topic-desc-${tip.id}`}
            >
              <span className="block text-sm font-semibold">{tip.title}</span>
              <span id={`help-topic-desc-${tip.id}`} className="mt-1 block text-xs text-gray-200">
                {tip.description}
              </span>
            </button>
          ))}
          {resolvedTips.length === 0 && (
            <p className="rounded border border-dashed border-ub-grey-dark p-4 text-sm text-gray-300">
              No help topics match the current search and tags.
            </p>
          )}
        </div>
        <p ref={liveRegionRef} aria-live="polite" className="sr-only" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4" aria-live="polite" aria-atomic="true">
        {selectedTip ? (
          <>
            <header>
              <h2 className="text-xl font-semibold" id="help-topic-title">
                {selectedTip.title}
              </h2>
              <p className="mt-2 text-sm text-gray-200">{selectedTip.description}</p>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300" aria-label="Applied tags">
                {selectedTip.tags.map((tag) => (
                  <li key={tag} className="rounded bg-black bg-opacity-30 px-2 py-1">
                    {tag}
                  </li>
                ))}
              </ul>
            </header>
            {selectedTip.video && (
              <section aria-labelledby="help-topic-title" className="space-y-2">
                <video
                  controls
                  className="w-full rounded"
                  aria-describedby={selectedTip.video.transcript ? `transcript-${selectedTip.id}` : undefined}
                >
                  <source src={selectedTip.video.src} type={selectedTip.video.type} />
                  {selectedTip.video.caption && (
                    <track
                      kind="captions"
                      src={selectedTip.video.caption}
                      srcLang="en"
                      label="English captions"
                      default
                    />
                  )}
                  Your browser does not support the video tag.
                </video>
                {selectedTip.video.transcript && selectedTip.video.transcript.length > 0 && (
                  <details id={`transcript-${selectedTip.id}`} className="rounded bg-black bg-opacity-40 p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Transcript</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-4">
                      {selectedTip.video.transcript.map((line, idx) => (
                        <li key={idx}>{line}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </section>
            )}
            {selectedTip.actions && selectedTip.actions.length > 0 && (
              <section aria-label="Quick actions" className="space-y-2">
                <h3 className="text-lg font-semibold">Do more</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTip.actions.map((action) => (
                    <button
                      key={`${selectedTip.id}-${action.label}`}
                      type="button"
                      onClick={() => handleAction(action)}
                      className="rounded bg-ubt-blue px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-200">Select a help topic to see detailed guidance.</p>
        )}
      </div>
    </div>
  );
};

export default HelpHub;

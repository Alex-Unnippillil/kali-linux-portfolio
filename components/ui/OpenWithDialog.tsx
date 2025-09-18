import { Fragment, MouseEvent, useEffect, useId, useMemo, useState } from 'react';
import {
  APP_SUGGESTIONS_STORAGE_KEY,
  areSuggestionsEnabled,
  getDoNotSuggest,
  getRecommendations,
  recordOpen,
  setDoNotSuggest,
  type RecommendationEntry,
} from '../../utils/analytics/openHistory';

export interface OpenWithOption {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface OpenWithDialogProps {
  isOpen: boolean;
  type: string;
  options: OpenWithOption[];
  onSelect: (option: OpenWithOption) => void;
  onClose: () => void;
  title?: string;
}

const reasonLabel = (reason: RecommendationEntry['reason']): string =>
  reason === 'lastUsed' ? 'Recently used' : 'Popular choice';

const OpenWithDialog: React.FC<OpenWithDialogProps> = ({
  isOpen,
  type,
  options,
  onSelect,
  onClose,
  title = 'Open with',
}) => {
  const titleId = useId();
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  const optionMap = useMemo(
    () => new Map(options.map(option => [option.id, option])),
    [options],
  );

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name)),
    [options],
  );

  const blockSignature = useMemo(
    () => [...blocked].sort().join('|'),
    [blocked],
  );

  const recommendations = useMemo(() => {
    if (!isOpen || !suggestionsEnabled) {
      return { lastUsed: [] as RecommendationEntry[], popular: [] as RecommendationEntry[] };
    }
    const { lastUsed, popular } = getRecommendations(type, {
      lastUsedLimit: 3,
      popularLimit: 4,
    });
    const availableLastUsed = lastUsed.filter(entry => optionMap.has(entry.appId));
    const seen = new Set(availableLastUsed.map(entry => entry.appId));
    const availablePopular = popular
      .filter(entry => optionMap.has(entry.appId) && !seen.has(entry.appId));
    return { lastUsed: availableLastUsed, popular: availablePopular };
  }, [isOpen, suggestionsEnabled, type, optionMap, blockSignature]);

  const recommendedIds = useMemo(() => {
    const ids = new Set<string>();
    recommendations.lastUsed.forEach(entry => ids.add(entry.appId));
    recommendations.popular.forEach(entry => ids.add(entry.appId));
    return ids;
  }, [recommendations]);

  useEffect(() => {
    if (!isOpen) return;
    setSuggestionsEnabled(areSuggestionsEnabled());
    setBlocked(new Set(getDoNotSuggest(type)));
  }, [isOpen, type]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (
      event: KeyboardEvent | { key?: string; preventDefault?: () => void },
    ) => {
      if (event.key === 'Escape') {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === APP_SUGGESTIONS_STORAGE_KEY) {
        setSuggestionsEnabled(areSuggestionsEnabled());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (option: OpenWithOption) => {
    recordOpen(type, option.id);
    onSelect(option);
    onClose();
  };

  const handleDoNotSuggest = (event: MouseEvent<HTMLButtonElement>, appId: string) => {
    event.stopPropagation();
    setDoNotSuggest(type, appId, true);
    setBlocked(prev => {
      const next = new Set(prev);
      next.add(appId);
      return next;
    });
  };

  const handleAllowSuggestion = (event: MouseEvent<HTMLButtonElement>, appId: string) => {
    event.stopPropagation();
    setDoNotSuggest(type, appId, false);
    setBlocked(prev => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
  };

  const renderRecommendation = (entry: RecommendationEntry) => {
    const option = optionMap.get(entry.appId);
    if (!option) return null;
    return (
      <li key={entry.appId}>
        <div className="rounded-md bg-black bg-opacity-30 px-3 py-2">
          <button
            type="button"
            onClick={() => handleSelect(option)}
            className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left transition hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-ub-orange"
          >
            {option.icon ? (
              <img
                src={option.icon}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 rounded"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded bg-black bg-opacity-40 text-xs font-bold uppercase">
                {option.name.slice(0, 2)}
              </span>
            )}
            <div>
              <div className="text-sm font-medium text-white">{option.name}</div>
              <div className="text-xs text-ubt-grey">
                <span className="font-semibold">{reasonLabel(entry.reason)}</span>
                {`: ${entry.reasonDescription}`}
              </div>
            </div>
          </button>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={event => handleDoNotSuggest(event, entry.appId)}
              className="text-xs font-medium text-ubt-grey transition hover:text-white"
              aria-label={`Do not suggest ${option.name}`}
            >
              Do not suggest
            </button>
          </div>
        </div>
      </li>
    );
  };

  const renderOption = (option: OpenWithOption) => {
    const isBlocked = blocked.has(option.id);
    const isRecommended = recommendedIds.has(option.id);
    return (
      <li key={option.id}>
        <div
          className={`rounded-md px-3 py-2 ${
            isRecommended
              ? 'bg-black bg-opacity-40'
              : 'bg-black bg-opacity-20'
          }`}
        >
          <button
            type="button"
            onClick={() => handleSelect(option)}
            className="flex w-full items-start gap-3 rounded-md px-1 py-1 text-left transition hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-ub-orange"
          >
            {option.icon ? (
              <img
                src={option.icon}
                alt=""
                aria-hidden="true"
                className="mt-0.5 h-6 w-6 rounded"
              />
            ) : (
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded bg-black bg-opacity-40 text-xs font-bold uppercase">
                {option.name.slice(0, 2)}
              </span>
            )}
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{option.name}</div>
              {option.description && (
                <div className="text-xs text-ubt-grey">{option.description}</div>
              )}
            </div>
          </button>
          {isBlocked && (
            <div className="mt-1 flex items-center justify-between text-xs text-ubt-grey">
              <span>Hidden from suggestions</span>
              <button
                type="button"
                onClick={event => handleAllowSuggestion(event, option.id)}
                className="font-medium text-ubt-grey underline-offset-2 transition hover:text-white"
              >
                Allow again
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl rounded-lg border border-black border-opacity-50 bg-ub-cool-grey text-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-black border-opacity-40 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-xl leading-none text-ubt-grey transition hover:bg-black hover:bg-opacity-30 hover:text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-5 space-y-5">
          {suggestionsEnabled ? (
            <Fragment>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">
                  Last used
                </h3>
                {recommendations.lastUsed.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {recommendations.lastUsed.map(renderRecommendation)}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-ubt-grey">
                    No recent history yet. Launch an app below to see it here.
                  </p>
                )}
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">
                  Popular for this type
                </h3>
                {recommendations.popular.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {recommendations.popular.map(renderRecommendation)}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-ubt-grey">
                    No popular picks yet. We will suggest frequently used apps once you start opening files of this type.
                  </p>
                )}
              </section>
            </Fragment>
          ) : (
            <p className="text-xs text-ubt-grey">
              App suggestions are disabled in Privacy settings. Enable them to see
              “Last used” and “Popular” recommendations.
            </p>
          )}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">
              All applications
            </h3>
            {sortedOptions.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {sortedOptions.map(renderOption)}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-ubt-grey">No compatible applications available.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default OpenWithDialog;

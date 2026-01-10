'use client';

import {
  aggregateSearchIndex,
  AppRecord,
  HistoryRecord,
  matchSearchResults,
  SearchResult,
  SearchResultType,
  SuggestionRecord,
} from '@/src/search';
import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

export type OmniboxSubmitPayload =
  | { type: 'query'; value: string }
  | SearchResult;

interface OmniboxProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: (payload: OmniboxSubmitPayload) => void;
  apps?: AppRecord[];
  history?: HistoryRecord[];
  searchSuggestions?: SuggestionRecord[];
  placeholder?: string;
  autoFocus?: boolean;
  suggestionLimit?: number;
  className?: string;
}

const TYPE_LABELS: Record<SearchResultType, string> = {
  app: 'App',
  history: 'History',
  suggestion: 'Search',
};

export default function Omnibox({
  value,
  onChange,
  onSubmit,
  apps,
  history,
  searchSuggestions,
  placeholder = 'Search the web or enter a site',
  autoFocus = false,
  suggestionLimit = 8,
  className,
}: OmniboxProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  const searchIndex = useMemo(
    () =>
      aggregateSearchIndex({
        apps,
        history,
        suggestions: searchSuggestions,
      }),
    [apps, history, searchSuggestions],
  );

  const suggestions = useMemo(
    () => matchSearchResults(value, searchIndex, { limit: suggestionLimit }),
    [value, searchIndex, suggestionLimit],
  );

  useEffect(() => {
    if (activeIndex === -1) return;
    if (suggestions.length === 0) {
      setActiveIndex(-1);
      return;
    }
    if (activeIndex >= suggestions.length) {
      setActiveIndex(suggestions.length - 1);
    }
  }, [activeIndex, suggestions]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  const commitQuery = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onChange(trimmed);
    onSubmit({ type: 'query', value: trimmed });
    setActiveIndex(-1);
  };

  const commitSuggestion = (suggestion: SearchResult) => {
    onChange(suggestion.value);
    onSubmit(suggestion);
    setActiveIndex(-1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      commitSuggestion(suggestions[activeIndex]);
      return;
    }
    commitQuery();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        if (next >= suggestions.length || next < 0) return 0;
        return next;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setActiveIndex((prev) => {
        if (prev <= 0) return suggestions.length - 1;
        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        commitSuggestion(suggestions[activeIndex]);
      } else {
        commitQuery();
      }
      return;
    }

    if (event.key === 'Escape') {
      setActiveIndex(-1);
    }
  };

  const handleSuggestionMouseDown = (
    suggestion: SearchResult,
  ) => (event: MouseEvent<HTMLLIElement>) => {
    event.preventDefault();
    commitSuggestion(suggestion);
  };

  const handleSuggestionHover = (index: number) => () => {
    setActiveIndex(index);
  };

  const activeId =
    activeIndex >= 0 ? `${listId}-item-${activeIndex}` : undefined;

  const formClassName = [
    'relative flex flex-col rounded-md bg-white shadow-md',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <form onSubmit={handleSubmit} className={formClassName}>
      <input
        type="text"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={suggestions.length > 0 ? listId : undefined}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
      />
      {suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            const itemClassName = [
              'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100',
            ].join(' ');

            return (
              <li
                id={`${listId}-item-${index}`}
                key={`${suggestion.type}-${suggestion.id}`}
                role="option"
                aria-selected={isActive}
                className={itemClassName}
                onMouseDown={handleSuggestionMouseDown(suggestion)}
                onMouseEnter={handleSuggestionHover(index)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{suggestion.label}</div>
                  {suggestion.secondaryLabel && (
                    <div className="truncate text-xs text-gray-500">
                      {suggestion.secondaryLabel}
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {TYPE_LABELS[suggestion.type]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}

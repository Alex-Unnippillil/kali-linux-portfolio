'use client';

import React, {\
  useCallback,\
  useEffect,\
  useMemo,\
  useRef,\
  useState,\
} from 'react';
import Image from 'next/image';
import apps, { games as gameList, utilities as utilityList } from '../../apps.config';
import moduleIndex from '../../data/module-index.json';
import projects from '../../data/projects.json';
import { safeLocalStorage } from '../../utils/safeStorage';

interface AppConfig {\
  id: string;\
  title: string;\
  icon: string;\
  favourite?: boolean;\
  disabled?: boolean;\
  desktop_shortcut?: boolean;\
}

interface ModuleLogEntry {\
  level: string;\
  message: string;\
}

interface ModuleResultEntry {\
  target: string;\
  status: string;\
}

interface ModuleRecord {\
  id: string;\
  name: string;\
  description: string;\
  tags?: string[];\
  log?: ModuleLogEntry[];\
  results?: ModuleResultEntry[];\
  data?: string;\
  inputs?: string[];\
  lab?: string;\
}

interface ProjectRecord {\
  id: number;\
  title: string;\
  description: string;\
  stack?: string[];\
  tags?: string[];\
  year?: number;\
  type?: string;\
  thumbnail?: string;\
  repo?: string;\
  demo?: string;\
  snippet?: string;\
  language?: string;\
}

interface BaseSearchResult {\
  id: string;\
  title: string;\
  description?: string;\
  type: 'app' | 'module' | 'project';\
  typeLabel: string;\
  keywords: string[];\
}

interface AppSearchResult extends BaseSearchResult {\
  type: 'app';\
  icon: string;\
  category: string;\
  pinnedByDefault: boolean;\
  pinned?: boolean;\
}

interface ModuleSearchResult extends BaseSearchResult {\
  type: 'module';\
  tags: string[];\
  log: ModuleLogEntry[];\
  results: ModuleResultEntry[];\
  data?: string;\
  inputs: string[];\
  lab?: string;\
}

interface ProjectSearchResult extends BaseSearchResult {\
  type: 'project';\
  stack: string[];\
  tags: string[];\
  snippet?: string;\
  repo?: string;\
  demo?: string;\
  thumbnail?: string;\
  language?: string;\
}

type SearchResult = AppSearchResult | ModuleSearchResult | ProjectSearchResult;

type ResultAction = {\
  id: string;\
  label: string;\
  onSelect: () => void;\
  primary?: boolean;\
};

const APP_DESCRIPTIONS: Record<string, string> = {
  terminal:
    'Open the simulated Kali terminal with command history, search, and keyboard shortcuts.',
  vscode: 'Launch the embedded VS Code editor for quick edits inside the desktop.',
  chrome: 'Browse the web with the sandboxed Chromium profile and curated bookmarks.',
  'project-gallery': 'Browse highlighted projects, prototypes, and demos in one view.',
  'resource-monitor': 'Inspect CPU, memory, and network activity in a live dashboard.',
  'screen-recorder': 'Capture clips of the desktop using the simulated recorder.',
  'security-tools': 'Explore incident response datasets in the Security Tools lab.',
  todoist: 'Track tasks and goals inside the Todoist-inspired board.',
  'weather_widget': 'Check the forecast with the weather widget.',
  'clipboard-manager': 'Review clipboard history and restore previous entries.',
  'sticky_notes': 'Drop quick notes on the desktop for later.',
  youtube: 'Watch and compare YouTube videos with a privacy-aware player.',
};

const collectKeywords = (
  ...parts: (string | undefined | string[])
): string[] => {
  const tokens: string[] = [];
  const pushValue = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    tokens.push(trimmed);
    const spaced = trimmed.replace(/[-_/]+/g, ' ');
    if (spaced !== trimmed) tokens.push(spaced);
    spaced
      .split(/\s+/)
      .filter(Boolean)
      .forEach(token => tokens.push(token));
  };
  parts.forEach(part => {
    if (!part) return;
    if (Array.isArray(part)) {
      part.forEach(item => pushValue(String(item)));
    } else {
      pushValue(part);
    }
  });
  const seen = new Set<string>();
  return tokens.filter(token => {
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
};

const uniqueById = <T extends { id: string }>(results: T[]): T[] => {
  const seen = new Set<string>();
  const ordered: T[] = [];
  results.forEach(result => {
    if (seen.has(result.id)) return;
    seen.add(result.id);
    ordered.push(result);
  });
  return ordered;
};

const isAppResult = (result: SearchResult): result is AppSearchResult =>
  result.type === 'app';

const isModuleResult = (result: SearchResult): result is ModuleSearchResult =>
  result.type === 'module';

const isProjectResult = (result: SearchResult): result is ProjectSearchResult =>
  result.type === 'project';

const getLogTone = (level: string) => {
  const normalised = level.toLowerCase();
  if (normalised.includes('error') || normalised.includes('fail')) return 'text-red-400';
  if (normalised.includes('warn')) return 'text-yellow-300';
  if (normalised.includes('success') || normalised.includes('ok')) return 'text-green-400';
  return 'text-ubt-grey';
};

const scoreResult = (result: SearchResult, terms: string[]): number => {
  let score = 0;
  terms.forEach(term => {
    result.keywords.forEach(keyword => {
      if (keyword === term) score += 6;
      else if (keyword.startsWith(term)) score += 3;
      else if (keyword.includes(term)) score += 1;
    });
  });
  if (isAppResult(result) && result.pinned) score += 2;
  if (isModuleResult(result)) score += 1;
  return score;
};

const buildSearchData = () => {
  const defaultPinned = new Set<string>();
  const games = new Set((gameList as AppConfig[]).map(game => game.id));
  const utilities = new Set((utilityList as AppConfig[]).map(util => util.id));

  const appResults: AppSearchResult[] = (apps as AppConfig[]).map(app => {
    const category = games.has(app.id)
      ? 'Game'
      : utilities.has(app.id)
      ? 'Utility'
      : 'Application';
    const description =
      APP_DESCRIPTIONS[app.id] || `Launch the ${app.title} ${category.toLowerCase()}.`;
    const keywords = collectKeywords(
      app.title,
      app.id,
      description,
      category,
      'app',
      'application'
    );
    const result: AppSearchResult = {
      id: app.id,
      title: app.title,
      description,
      type: 'app',
      typeLabel: category,
      icon: app.icon,
      category,
      pinnedByDefault: Boolean(app.favourite),
      keywords,
    };
    if (result.pinnedByDefault) defaultPinned.add(result.id);
    return result;
  });

  const moduleResults: ModuleSearchResult[] = (moduleIndex as ModuleRecord[]).map(module => {
    const keywords = collectKeywords(
      module.id,
      module.name,
      module.description,
      module.data,
      module.tags || [],
      module.inputs || [],
      module.log?.map(entry => entry.message).join(' '),
      module.results?.map(entry => `${entry.target} ${entry.status}`),
      'module',
      'security',
      'analysis',
      'tool'
    );
    return {
      id: module.id,
      title: module.name,
      description: module.description,
      type: 'module',
      typeLabel: 'Module',
      tags: module.tags ?? [],
      log: module.log ?? [],
      results: module.results ?? [],
      data: module.data,
      inputs: module.inputs ?? [],
      lab: module.lab,
      keywords,
    };
  });

  const projectResults: ProjectSearchResult[] = (projects as ProjectRecord[]).map(project => {
    const keywords = collectKeywords(
      project.title,
      project.description,
      project.type,
      project.stack ?? [],
      project.tags ?? [],
      project.snippet,
      project.language,
      'project',
      'case study',
      'demo'
    );
    return {
      id: `project-${project.id}`,
      title: project.title,
      description: project.description,
      type: 'project',
      typeLabel: 'Project',
      stack: project.stack ?? [],
      tags: project.tags ?? [],
      snippet: project.snippet,
      repo: project.repo,
      demo: project.demo,
      thumbnail: project.thumbnail,
      language: project.language,
      keywords,
    };
  });

  return {
    baseResults: [...appResults, ...moduleResults, ...projectResults],
    defaultPinned,
  };
};

const SEARCH_DATA = buildSearchData();
const BASE_RESULTS = SEARCH_DATA.baseResults;
const DEFAULT_PINNED = SEARCH_DATA.defaultPinned;

const renderPreview = (result: SearchResult) => {
  if (isAppResult(result)) {
    return (
      <div className="flex items-start gap-3">
        <Image
          src={result.icon}
          alt=""
          width={48}
          height={48}
          className="w-12 h-12 rounded"
        />
        <div>
          {result.description && (
            <p className="text-sm text-ubt-grey">{result.description}</p>
          )}
          <p className="text-xs text-ubt-grey mt-2">
            {result.category === 'Game'
              ? 'Game available in the desktop catalogue.'
              : result.category === 'Utility'
              ? 'Utility application for daily workflows.'
              : 'Desktop application available from the launcher.'}
          </p>
          {result.pinned && (
            <p className="text-xs text-ubt-grey mt-1">Pinned to the dock for quick access.</p>
          )}
        </div>
      </div>
    );
  }

  if (isModuleResult(result)) {
    return (
      <div className="space-y-3">
        {result.description && (
          <p className="text-sm text-ubt-grey">{result.description}</p>
        )}
        {result.inputs.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-ubt-grey mb-1">Inputs</h4>
            <div className="flex flex-wrap gap-2">
              {result.inputs.map(input => (
                <span
                  key={input}
                  className="px-2 py-0.5 bg-black/40 rounded-full text-xs text-white"
                >
                  {input}
                </span>
              ))}
            </div>
          </div>
        )}
        {result.log.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-ubt-grey mb-1">Latest activity</h4>
            <div className="bg-black/40 rounded p-2 text-xs font-mono max-h-32 overflow-y-auto">
              {result.log.slice(0, 4).map((entry, idx) => (
                <div key={`${entry.message}-${idx}`} className="flex gap-2">
                  <span className={`${getLogTone(entry.level)} uppercase`}>
                    {entry.level}
                  </span>
                  <span className="text-white">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {result.results.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-ubt-grey mb-1">Recent findings</h4>
            <ul className="text-xs text-white bg-black/20 rounded p-2 max-h-24 overflow-y-auto">
              {result.results.slice(0, 3).map((entry, idx) => (
                <li key={`${entry.target}-${idx}`} className="flex justify-between gap-2">
                  <span className="text-ubt-grey">{entry.target}</span>
                  <span>{entry.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.lab && (
          <p className="text-xs text-ubt-grey">
            Lab guide: <span className="text-white">{result.lab}</span>
          </p>
        )}
      </div>
    );
  }

  if (isProjectResult(result)) {
    return (
      <div className="space-y-3">
        {result.description && (
          <p className="text-sm text-ubt-grey">{result.description}</p>
        )}
        {result.stack.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-ubt-grey mb-1">Stack</h4>
            <div className="flex flex-wrap gap-2">
              {result.stack.map(stack => (
                <span key={stack} className="px-2 py-0.5 bg-black/40 rounded-full text-xs">
                  {stack}
                </span>
              ))}
            </div>
          </div>
        )}
        {result.snippet && (
          <div>
            <h4 className="text-xs uppercase tracking-wide text-ubt-grey mb-1">Snippet</h4>
            <pre className="bg-black/70 rounded p-2 text-xs overflow-auto max-h-40">
              <code>{result.snippet}</code>
            </pre>
          </div>
        )}
        {result.language && (
          <p className="text-xs text-ubt-grey">Primary language: {result.language}</p>
        )}
      </div>
    );
  }

  return null;
};

const focusWithFrame = (callback: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
};

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [focusedAction, setFocusedAction] = useState<
    { resultId: string; index: number } | null
  >(null);
  const previousQueryRef = useRef('');

  const [pinnedApps, setPinnedApps] = useState<Set<string>>(() => {
    if (safeLocalStorage) {
      try {
        const stored = safeLocalStorage.getItem('pinnedApps');
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          return new Set(parsed);
        }
      } catch {
        // ignore parse errors and fallback to defaults
      }
    }
    return new Set(DEFAULT_PINNED);
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const actionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem('pinnedApps', JSON.stringify(Array.from(pinnedApps)));
    } catch {
      // ignore write failures (storage may be disabled)
    }
  }, [pinnedApps]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'pinnedApps') return;
      try {
        if (event.newValue) {
          const parsed: string[] = JSON.parse(event.newValue);
          setPinnedApps(new Set(parsed));
        } else {
          setPinnedApps(new Set(DEFAULT_PINNED));
        }
      } catch {
        setPinnedApps(new Set(DEFAULT_PINNED));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const resultsWithPinned = useMemo<SearchResult[]>(() => {
    return BASE_RESULTS.map(result => {
      if (isAppResult(result)) {
        return {
          ...result,
          pinned: pinnedApps.has(result.id),
        } as AppSearchResult;
      }
      return result;
    });
  }, [pinnedApps]);

  const filteredResults = useMemo<SearchResult[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      const pinnedFirst = resultsWithPinned.filter(
        result => isAppResult(result) && result.pinned
      );
      const recommendedApps = resultsWithPinned.filter(
        result => isAppResult(result) && !result.pinned
      );
      const modules = resultsWithPinned.filter(isModuleResult);
      const projectsList = resultsWithPinned.filter(isProjectResult);
      return uniqueById<SearchResult>([
        ...pinnedFirst,
        ...recommendedApps.slice(0, 6),
        ...modules.slice(0, 4),
        ...projectsList.slice(0, 4),
      ]);
    }
    const terms = trimmed.split(/\s+/).filter(Boolean);
    const matches = resultsWithPinned
      .map(result => {
        const matched = terms.every(term =>
          result.keywords.some(keyword => keyword.includes(term))
        );
        if (!matched) return null;
        return { result, score: scoreResult(result, terms) };
      })
      .filter(Boolean) as { result: SearchResult; score: number }[];
    matches.sort(
      (a, b) =>
        b.score - a.score || a.result.title.localeCompare(b.result.title, undefined, { sensitivity: 'base' })
    );
    return matches.map(item => item.result);
  }, [query, resultsWithPinned]);

  useEffect(() => {
    const previousQuery = previousQueryRef.current;
    const queryChanged = previousQuery !== query;
    previousQueryRef.current = query;

    if (!filteredResults.length) {
      setActiveIndex(-1);
      setFocusedAction(null);
      return;
    }

    setActiveIndex(prev => {
      if (prev < 0 || prev >= filteredResults.length || queryChanged) return 0;
      return prev;
    });
    if (queryChanged) {
      setFocusedAction(null);
    }
  }, [filteredResults, query]);

  const activeResult = activeIndex >= 0 ? filteredResults[activeIndex] : null;

  const focusResult = useCallback((id: string) => {
    focusWithFrame(() => {
      const node = resultRefs.current.get(id);
      node?.focus();
    });
  }, []);

  const moveActive = useCallback(
    (direction: 1 | -1) => {
      if (!filteredResults.length) return;
      setFocusedAction(null);
      setActiveIndex(prev => {
        const current = prev < 0 ? 0 : prev;
        let next = current + direction;
        if (next < 0) next = filteredResults.length - 1;
        if (next >= filteredResults.length) next = 0;
        focusResult(filteredResults[next].id);
        return next;
      });
    },
    [filteredResults, focusResult]
  );

  const togglePin = useCallback((result: AppSearchResult) => {
    setPinnedApps(prev => {
      const next = new Set(prev);
      if (next.has(result.id)) next.delete(result.id);
      else next.add(result.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('global-search:pinned-change', {
            detail: { id: result.id, pinned: next.has(result.id) },
          })
        );
      }
      return next;
    });
  }, []);

  const handleOpen = useCallback((result: SearchResult) => {
    if (typeof window === 'undefined') return;
    if (isAppResult(result)) {
      window.dispatchEvent(new CustomEvent('open-app', { detail: result.id }));
    } else if (isModuleResult(result)) {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'security-tools' }));
      window.dispatchEvent(new CustomEvent('security-tools:focus-module', { detail: result.id }));
    } else if (isProjectResult(result)) {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'project-gallery' }));
      window.dispatchEvent(
        new CustomEvent('project-gallery:focus-project', { detail: result.id })
      );
    }
  }, []);

  const buildActions = useCallback(
    (result: SearchResult): ResultAction[] => {
      const actions: ResultAction[] = [];
      if (isAppResult(result)) {
        actions.push({
          id: 'open',
          label: 'Open',
          onSelect: () => handleOpen(result),
          primary: true,
        });
        actions.push({
          id: result.pinned ? 'unpin' : 'pin',
          label: result.pinned ? 'Unpin from dock' : 'Pin to dock',
          onSelect: () => togglePin(result),
        });
      } else if (isModuleResult(result)) {
        actions.push({
          id: 'open-module',
          label: 'Open in Security Tools',
          onSelect: () => handleOpen(result),
          primary: true,
        });
        if (result.lab) {
          actions.push({
            id: 'open-lab',
            label: 'Open lab guide',
            onSelect: () => {
              if (typeof window !== 'undefined') {
                window.open(result.lab, '_blank', 'noopener,noreferrer');
              }
            },
          });
        }
      } else if (isProjectResult(result)) {
        actions.push({
          id: 'open-gallery',
          label: 'Open in Project Gallery',
          onSelect: () => handleOpen(result),
          primary: true,
        });
        if (result.demo) {
          actions.push({
            id: 'open-demo',
            label: 'Open demo',
            onSelect: () => {
              if (typeof window !== 'undefined') {
                window.open(result.demo, '_blank', 'noopener,noreferrer');
              }
            },
          });
        }
        if (result.repo) {
          actions.push({
            id: 'open-repo',
            label: 'Open repository',
            onSelect: () => {
              if (typeof window !== 'undefined') {
                window.open(result.repo, '_blank', 'noopener,noreferrer');
              }
            },
          });
        }
      }
      return actions;
    },
    [handleOpen, togglePin]
  );

  const activeActions = useMemo<ResultAction[]>(() => {
    if (!activeResult) return [];
    return buildActions(activeResult);
  }, [activeResult, buildActions]);

  useEffect(() => {
    if (!activeResult) {
      if (focusedAction) setFocusedAction(null);
      return;
    }
    if (!activeActions.length) {
      if (focusedAction) setFocusedAction(null);
      return;
    }
    if (
      focusedAction &&
      focusedAction.resultId === activeResult.id &&
      focusedAction.index >= activeActions.length
    ) {
      setFocusedAction({ resultId: activeResult.id, index: activeActions.length - 1 });
    }
  }, [activeActions, activeResult, focusedAction]);

  useEffect(() => {
    if (!focusedAction) return;
    const key = `${focusedAction.resultId}:${focusedAction.index}`;
    focusWithFrame(() => {
      const node = actionRefs.current.get(key);
      node?.focus();
    });
  }, [focusedAction]);

  const handleResultKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    result: SearchResult
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'ArrowRight') {
      const actions = buildActions(result);
      if (actions.length) {
        event.preventDefault();
        setActiveIndex(index);
        setFocusedAction({ resultId: result.id, index: 0 });
      }
    } else if (event.key === 'Enter') {
      const actions = buildActions(result);
      if (actions.length) {
        event.preventDefault();
        actions[0].onSelect();
        setFocusedAction({ resultId: result.id, index: 0 });
      }
    }
  };

  const handleActionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    actionIndex: number,
    result: SearchResult,
    actions: ResultAction[]
  ) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setFocusedAction(null);
      focusResult(result.id);
      return;
    }
    if (event.key === 'ArrowRight') {
      if (actions.length <= 1) return;
      event.preventDefault();
      const nextIndex = (actionIndex + 1) % actions.length;
      setFocusedAction({ resultId: result.id, index: nextIndex });
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filteredResults.length) return;
      const currentIndex = filteredResults.findIndex(item => item.id === result.id);
      if (currentIndex === -1) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) nextIndex = filteredResults.length - 1;
      if (nextIndex >= filteredResults.length) nextIndex = 0;
      const nextResult = filteredResults[nextIndex];
      setActiveIndex(nextIndex);
      const nextActions = buildActions(nextResult);
      if (nextActions.length) {
        const safeIndex = Math.min(actionIndex, nextActions.length - 1);
        setFocusedAction({ resultId: nextResult.id, index: safeIndex });
      } else {
        setFocusedAction(null);
        focusResult(nextResult.id);
      }
    }
  };

  const handleResultFocus = (index: number) => {
    setActiveIndex(index);
    setFocusedAction(null);
  };

  const handleResultMouseEnter = (index: number) => {
    setActiveIndex(prev => (prev === index ? prev : index));
    setFocusedAction(null);
  };

  const handleResultClick = (result: SearchResult, index: number) => {
    setActiveIndex(index);
    const actions = buildActions(result);
    if (actions.length) {
      actions[0].onSelect();
      setFocusedAction({ resultId: result.id, index: 0 });
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && filteredResults.length) {
      event.preventDefault();
      setActiveIndex(0);
      focusResult(filteredResults[0].id);
    } else if (event.key === 'Escape' && query) {
      event.preventDefault();
      setQuery('');
    }
  };

  return (
    <div className="flex h-full bg-ub-grey text-white border border-black/40 shadow-lg">
      <div className="w-1/2 min-w-[18rem] flex flex-col border-r border-black/40">
        <div className="p-3 border-b border-black/40">
          <label htmlFor="global-search-input" className="sr-only">
            Search the desktop
          </label>
          <input
            id="global-search-input"
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search apps, modules, and projects"
            autoComplete="off"
            className="w-full rounded bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ubb-orange"
          />
        </div>
        <div
          role="listbox"
          aria-label="Search results"
          aria-activedescendant={
            activeResult ? `global-search-result-${activeResult.id}` : undefined
          }
          className="flex-1 overflow-y-auto"
        >
          {filteredResults.length === 0 ? (
            <div className="p-4 text-sm text-ubt-grey">
              {query
                ? `No results found for "${query}".`
                : 'Start typing to search across apps, tools, and projects.'}
            </div>
          ) : (
            filteredResults.map((result, index) => (
              <button
                key={result.id}
                id={`global-search-result-${result.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                ref={node => {
                  if (node) resultRefs.current.set(result.id, node);
                  else resultRefs.current.delete(result.id);
                }}
                onMouseEnter={() => handleResultMouseEnter(index)}
                onFocus={() => handleResultFocus(index)}
                onKeyDown={event => handleResultKeyDown(event, index, result)}
                onClick={() => handleResultClick(result, index)}
                className={`w-full text-left px-3 py-2 border-b border-black/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange ${
                  index === activeIndex ? 'bg-black/40' : 'hover:bg-black/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isAppResult(result) && (
                    <Image
                      src={result.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{result.title}</span>
                      <span className="text-[10px] uppercase tracking-wide text-ubt-grey">
                        {result.typeLabel}
                      </span>
                    </div>
                    {result.description && (
                      <p className="text-xs text-ubt-grey mt-1">{result.description}</p>
                    )}
                    {isModuleResult(result) && result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 text-[10px] bg-black/40 rounded-full uppercase tracking-wide text-ubt-grey"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {isProjectResult(result) && result.stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.stack.slice(0, 3).map(stack => (
                          <span
                            key={stack}
                            className="px-1.5 py-0.5 text-[10px] bg-black/30 rounded-full text-ubt-grey"
                          >
                            {stack}
                          </span>
                        ))}
                      </div>
                    )}
                    {isAppResult(result) && result.pinned && (
                      <div className="mt-1 text-[10px] uppercase text-ubb-orange">Pinned</div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col p-4">
        {activeResult ? (
          <>
            <div className="pb-3 mb-3 border-b border-black/40">
              <span className="text-xs uppercase tracking-wide text-ubt-grey">
                {activeResult.typeLabel}
              </span>
              <h3 className="text-lg font-semibold text-white">{activeResult.title}</h3>
              {activeResult.description && (
                <p className="text-sm text-ubt-grey mt-1">{activeResult.description}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {renderPreview(activeResult)}
            </div>
            <div className="pt-3 mt-3 border-t border-black/40">
              {activeActions.length ? (
                <div className="flex flex-wrap gap-2">
                  {activeActions.map((action, actionIndex) => (
                    <button
                      key={action.id}
                      type="button"
                      ref={node => {
                        const key = `${activeResult.id}:${actionIndex}`;
                        if (node) actionRefs.current.set(key, node);
                        else actionRefs.current.delete(key);
                      }}
                      onClick={() => {
                        action.onSelect();
                        setFocusedAction({ resultId: activeResult.id, index: actionIndex });
                      }}
                      onFocus={() => {
                        setActiveIndex(activeIndex);
                        setFocusedAction({ resultId: activeResult.id, index: actionIndex });
                      }}
                      onKeyDown={event =>
                        handleActionKeyDown(event, actionIndex, activeResult, activeActions)
                      }
                      className={`px-3 py-1.5 rounded border border-black/40 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange ${
                        action.primary
                          ? 'bg-ubb-orange text-black hover:bg-orange-300'
                          : 'bg-black/40 hover:bg-black/30'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ubt-grey">No quick actions available.</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-ubt-grey">
            Type a query to see matching apps, tools, and portfolio projects.
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import quickActionsConfig from '../../data/quick-actions.json';
import type {
  QuickActionDefinition,
  QuickActionsRegistry,
  SearchResult,
  SearchResultType,
} from '../../utils/searchActions';
import { isQuickActionSupported, runQuickAction } from '../../utils/searchActions';

const TYPE_ORDER: SearchResultType[] = ['apps', 'settings', 'files', 'commands', 'help'];

const TYPE_LABELS: Record<SearchResultType, string> = {
  apps: 'Apps',
  settings: 'Settings',
  files: 'Files',
  commands: 'Commands',
  help: 'Help',
};

const quickActions = quickActionsConfig as QuickActionsRegistry;

type SearchPaletteProps = {
  results: SearchResult[];
  onClose?: () => void;
  emptyMessage?: string;
};

type CollapsedState = Record<SearchResultType, boolean>;

const INITIAL_COLLAPSED_STATE: CollapsedState = {
  apps: false,
  settings: false,
  files: false,
  commands: false,
  help: false,
};

const getResultDetails = (result: SearchResult): string | undefined => {
  if (result.meta) return result.meta;
  switch (result.type) {
    case 'files':
      return result.path;
    case 'commands':
      return result.shell ? `${result.shell}: ${result.command}` : result.command;
    case 'help':
      return result.url;
    case 'settings':
      return result.section ?? result.item ?? undefined;
    default:
      return undefined;
  }
};

const SectionHeader: React.FC<{
  type: SearchResultType;
  count: number;
  collapsed: boolean;
  onToggle: (type: SearchResultType) => void;
}> = ({ type, count, collapsed, onToggle }) => (
  <button
    type="button"
    onClick={() => onToggle(type)}
    className="flex w-full items-center justify-between bg-slate-900/80 px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    aria-expanded={!collapsed}
    aria-controls={`search-group-${type}`}
  >
    <span>{TYPE_LABELS[type]}</span>
    <span className="flex items-center gap-2">
      <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-100">
        {count}
      </span>
      <svg
        className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.189l3.71-3.958a.75.75 0 1 1 1.08 1.04l-4.25 4.53a.75.75 0 0 1-1.08 0l-4.25-4.53a.75.75 0 0 1 .02-1.06z" />
      </svg>
    </span>
  </button>
);

const ActionButton: React.FC<{
  action: QuickActionDefinition;
  type: SearchResultType;
  onActivate: () => void;
}> = ({ action, type, onActivate }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = `${type}-${action.id}-tooltip`;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        onClick={onActivate}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-describedby={tooltipId}
      >
        {action.label}
      </button>
      <div
        role="tooltip"
        id={tooltipId}
        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[11px] font-medium text-white shadow transition-opacity duration-150 ${showTooltip ? 'opacity-100' : 'opacity-0'}`}
      >
        {action.tooltip}
      </div>
      <span className="sr-only">{action.tooltip}</span>
    </div>
  );
};

const SearchPalette: React.FC<SearchPaletteProps> = ({ results, onClose, emptyMessage }) => {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<CollapsedState>(INITIAL_COLLAPSED_STATE);

  const groupedResults = useMemo(() => {
    return results.reduce<Record<SearchResultType, SearchResult[]>>((acc, result) => {
      acc[result.type].push(result);
      return acc;
    }, {
      apps: [],
      settings: [],
      files: [],
      commands: [],
      help: [],
    });
  }, [results]);

  const toggleSection = useCallback((type: SearchResultType) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const handleAction = useCallback(
    async (actionId: string, result: SearchResult) => {
      await runQuickAction(actionId, result, router, onClose);
    },
    [router, onClose],
  );

  const hasResults = results.length > 0;

  return (
    <div className="max-h-[70vh] w-full overflow-y-auto rounded-lg bg-slate-900/90 text-slate-100 shadow-2xl">
      {!hasResults && (
        <p className="px-4 py-6 text-center text-sm text-slate-300">
          {emptyMessage ?? 'No matches found. Try a different search term.'}
        </p>
      )}
      {TYPE_ORDER.map((type) => {
        const entries = groupedResults[type];
        if (!entries.length) return null;
        const availableActions = (quickActions[type] || []).filter((action) =>
          isQuickActionSupported(type, action.id),
        );

        return (
          <section key={type} className="border-t border-slate-800 first:border-t-0">
            <SectionHeader
              type={type}
              count={entries.length}
              collapsed={collapsed[type]}
              onToggle={toggleSection}
            />
            {!collapsed[type] && (
              <ul id={`search-group-${type}`} className="divide-y divide-slate-800" role="list">
                {entries.map((result) => {
                  const detail = getResultDetails(result);
                  return (
                    <li key={`${type}-${result.id}`} className="px-4 py-3 hover:bg-slate-800/60 focus-within:bg-slate-800/60">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{result.title}</p>
                          {result.description && (
                            <p className="mt-1 text-xs text-slate-300">{result.description}</p>
                          )}
                          {detail && (
                            <p className="mt-1 truncate text-xs font-mono text-slate-400" title={detail}>
                              {detail}
                            </p>
                          )}
                        </div>
                        {availableActions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {availableActions.map((action) => (
                              <ActionButton
                                key={`${result.id}-${action.id}`}
                                action={action}
                                type={type}
                                onActivate={() => {
                                  void handleAction(action.id, result);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default SearchPalette;

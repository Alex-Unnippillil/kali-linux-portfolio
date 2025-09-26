import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import usePersistentState from '../../hooks/usePersistentState';
import {
  APP_REGISTRY,
  AppRegistryNode,
  createDefaultExpansionState,
  isRegistryCategory,
} from '../../data/app-registry';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
  screen?: { prefetch?: () => void };
};

type TreeNode = {
  id: string;
  label: string;
  apps: AppMeta[];
  children: TreeNode[];
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

const buildTree = (
  nodes: AppRegistryNode[],
  filteredApps: AppMeta[],
  lookup: Map<string, AppMeta>,
): TreeNode[] => {
  const available = new Set(filteredApps.map((app) => app.id));
  const assigned = new Set<string>();

  const buildNodes = (registryNodes: AppRegistryNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    registryNodes.forEach((node) => {
      const children = node.children ? buildNodes(node.children) : [];
      const apps: AppMeta[] = [];

      if (node.apps) {
        node.apps.forEach((id) => {
          if (assigned.has(id) || !available.has(id)) return;
          const meta = lookup.get(id);
          if (meta) {
            apps.push(meta);
            assigned.add(id);
          }
        });
      }

      if (apps.length === 0 && children.length === 0) return;

      result.push({
        id: node.id,
        label: node.label,
        apps,
        children,
      });
    });
    return result;
  };

  const built = buildNodes(nodes);
  const unassigned = filteredApps.filter((app) => !assigned.has(app.id));
  if (unassigned.length) {
    built.push({
      id: 'other-apps',
      label: 'Other Apps',
      apps: unassigned,
      children: [],
    });
  }

  return built;
};

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter((a) => a.favourite), [allApps]);
  const recentApps = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      return ids
        .map((id) => allApps.find((a) => a.id === id))
        .filter(Boolean) as AppMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);
  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const [expandedState, setExpandedState] = usePersistentState<Record<string, string[]>>(
    'whisker-expanded',
    createDefaultExpansionState,
  );

  const appLookup = useMemo(() => new Map(allApps.map((app) => [app.id, app])), [allApps]);

  const filteredApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favoriteApps;
        break;
      case 'recent':
        list = recentApps;
        break;
      case 'utilities':
        list = utilityApps;
        break;
      case 'games':
        list = gameApps;
        break;
      default:
        list = allApps;
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }

    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  const registryCategory = isRegistryCategory(category) ? category : undefined;
  const registryNodes = registryCategory ? APP_REGISTRY[registryCategory] : undefined;

  const treeNodes = useMemo(() => {
    if (!registryNodes) return [];
    return buildTree(registryNodes, filteredApps, appLookup);
  }, [registryNodes, filteredApps, appLookup]);

  const forceExpand = query.trim().length > 0;

  const expandedIds = useMemo(() => new Set(expandedState[category] ?? []), [expandedState, category]);

  const visibleApps = useMemo(() => {
    if (!registryNodes) return filteredApps;

    const list: AppMeta[] = [];
    const visit = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = forceExpand || !hasChildren || expandedIds.has(node.id);

        if (!hasChildren || isExpanded) {
          node.apps.forEach((app) => {
            list.push(app);
          });
        }

        if (hasChildren && isExpanded) {
          visit(node.children);
        }
      });
    };

    visit(treeNodes);
    return list;
  }, [registryNodes, filteredApps, treeNodes, expandedIds, forceExpand]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

  useEffect(() => {
    setHighlight((current) => Math.min(current, Math.max(visibleApps.length - 1, 0)));
  }, [visibleApps.length]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, Math.max(visibleApps.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = visibleApps[highlight];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, visibleApps, highlight]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleNode = (nodeId: string) => {
    if (!registryCategory) return;
    setExpandedState((prev) => {
      const set = new Set(prev[registryCategory] ?? []);
      if (set.has(nodeId)) set.delete(nodeId);
      else set.add(nodeId);
      return { ...prev, [registryCategory]: Array.from(set) };
    });
  };

  const handlePrefetch = (app: AppMeta) => {
    if (typeof app.screen?.prefetch === 'function') {
      app.screen.prefetch();
    }
  };

  const highlightedAppId = visibleApps[highlight]?.id;

  const renderApp = (app: AppMeta) => {
    const isHighlighted = highlightedAppId === app.id;
    return (
      <li key={app.id}>
        <button
          type="button"
          onClick={() => openSelectedApp(app.id)}
          onMouseEnter={() => handlePrefetch(app)}
          onFocus={() => handlePrefetch(app)}
          disabled={app.disabled}
          className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ub-orange ${
            app.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700'
          } ${isHighlighted ? 'bg-ub-orange text-black' : ''}`}
        >
          <Image
            src={app.icon.replace('./', '/')}
            alt=""
            width={20}
            height={20}
            sizes="20px"
            className="h-5 w-5"
          />
          <span>{app.title}</span>
        </button>
      </li>
    );
  };

  const renderTree = (nodes: TreeNode[], depth = 0): JSX.Element => (
    <ul className={`space-y-2 ${depth > 0 ? 'border-l border-gray-700 pl-4 ml-3' : ''}`}>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = forceExpand || !hasChildren || expandedIds.has(node.id);
        return (
          <li key={node.id}>
            <div className={`flex items-center gap-2 ${depth > 0 ? 'mt-1' : ''}`}>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleNode(node.id)}
                  className="flex h-5 w-5 items-center justify-center rounded border border-gray-600 bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
                >
                  {isExpanded ? '▾' : '▸'}
                </button>
              )}
              <span className="text-sm font-semibold">{node.label}</span>
            </div>
            {isExpanded && (
              <div className="mt-2 space-y-2">
                {node.apps.length > 0 && (
                  <ul className="space-y-1 pl-6">{node.apps.map((app) => renderApp(app))}</ul>
                )}
                {hasChildren && renderTree(node.children, depth + 1)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const showTree = Boolean(registryNodes);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Applications
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg"
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`text-left px-2 py-1 rounded mb-1 ${category === cat.id ? 'bg-gray-700' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 w-80">
            <input
              className="mb-3 w-full px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto pr-2">
              {showTree ? (
                treeNodes.length > 0 ? (
                  renderTree(treeNodes)
                ) : (
                  <div className="text-sm text-gray-300">No apps found.</div>
                )
              ) : visibleApps.length > 0 ? (
                <ul className="space-y-1">{visibleApps.map((app) => renderApp(app))}</ul>
              ) : (
                <div className="text-sm text-gray-300">No apps found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;

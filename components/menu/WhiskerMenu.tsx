import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  executeSpotlightAction,
  searchSpotlightActions,
  SpotlightActionDefinition,
  SpotlightActionResult,
} from '../screen/spotlight-actions';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' }
];

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [actionResult, setActionResult] = useState<
    { id: string; result: SpotlightActionResult }
  | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const recentApps = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      return ids.map(id => allApps.find(a => a.id === id)).filter(Boolean) as AppMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);
  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const currentApps = useMemo(() => {
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
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  const quickActions = useMemo<SpotlightActionDefinition[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return searchSpotlightActions(trimmed);
  }, [query]);

  const combinedItems = useMemo(() => {
    const actions = quickActions.map((action) => ({
      type: 'action' as const,
      action,
    }));
    const apps = currentApps.map((app) => ({
      type: 'app' as const,
      app,
    }));
    return [...actions, ...apps];
  }, [quickActions, currentApps]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query, quickActions.length]);

  useEffect(() => {
    if (!combinedItems.length) {
      setHighlight(0);
      return;
    }
    setHighlight((h) => Math.min(h, combinedItems.length - 1));
  }, [combinedItems.length]);

  useEffect(() => {
    if (!open) {
      setActionResult(null);
      setRunningActionId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!actionResult) return;
    const timeout = window.setTimeout(() => setActionResult(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [actionResult]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  const runAction = async (action: SpotlightActionDefinition) => {
    setRunningActionId(action.id);
    const result = await executeSpotlightAction(action.id);
    const message =
      result.message ||
      (result.status === 'success' ? 'Action completed.' : 'Action failed.');
    const finalResult: SpotlightActionResult = { ...result, message };
    setActionResult({ id: action.id, result: finalResult });
    setRunningActionId(null);
    if (
      finalResult.status === 'success' &&
      (finalResult.closeMenu ?? action.closeOnSuccess ?? false)
    ) {
      setOpen(false);
    }
  };

  const handleSelect = (index: number) => {
    const item = combinedItems[index];
    if (!item) return;
    if (item.type === 'app') {
      openSelectedApp(item.app.id);
    } else {
      runAction(item.action);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!combinedItems.length) return;
        setHighlight((h) => Math.min(h + 1, combinedItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(highlight);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, combinedItems, highlight]);

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

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
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
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`text-left px-2 py-1 rounded mb-1 ${category === cat.id ? 'bg-gray-700' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <input
              className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {actionResult && (
              <div
                className={`mb-2 text-xs ${
                  actionResult.result.status === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                }`}
                role="status"
              >
                {actionResult.result.message}
              </div>
            )}
            {quickActions.length > 0 && (
              <div className="mb-3">
                <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">
                  Quick Actions
                </div>
                <ul className="space-y-1">
                  {quickActions.map((action, idx) => {
                    const isHighlighted = highlight === idx;
                    const isRunning = runningActionId === action.id;
                    return (
                      <li key={action.id}>
                        <button
                          type="button"
                          onClick={() => runAction(action)}
                          disabled={isRunning}
                          className={`w-full text-left px-3 py-2 rounded transition-colors duration-100 ${
                            isHighlighted
                              ? 'bg-ub-orange text-black'
                              : 'bg-black bg-opacity-20 hover:bg-opacity-30'
                          } ${isRunning ? 'opacity-70' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{action.title}</span>
                            {isRunning && (
                              <span className="text-xs opacity-80">Running…</span>
                            )}
                          </div>
                          {action.description && (
                            <div className="text-xs opacity-80">
                              {action.description}
                            </div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {currentApps.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {currentApps.map((app, idx) => {
                  const globalIndex = quickActions.length + idx;
                  const isHighlighted = highlight === globalIndex;
                  return (
                    <div key={app.id} className={isHighlighted ? 'ring-2 ring-ubb-orange' : ''}>
                      <UbuntuApp
                        id={app.id}
                        icon={app.icon}
                        name={app.title}
                        openApp={() => openSelectedApp(app.id)}
                        disabled={app.disabled}
                      />
                    </div>
                  );
                })}
              </div>
            ) : combinedItems.length === 0 ? (
              <div className="text-xs text-gray-300">No results found.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;

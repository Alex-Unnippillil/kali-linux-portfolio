'use client';

import React, { useEffect, useMemo, useState } from 'react';

export type ColumnKey = 'name' | 'size' | 'type' | 'modified' | 'tags' | 'hash';

export interface ListViewFile {
  name: string;
  handle: FileSystemFileHandle;
  size?: number | null;
  type?: string | null;
  modified?: number | Date | null;
  tags?: string[] | null;
}

interface LayoutState {
  order: ColumnKey[];
  visibility: Record<ColumnKey, boolean>;
}

interface LayoutPreset {
  name: string;
  layout: LayoutState;
}

interface FolderLayoutState {
  layout: LayoutState;
  presets: LayoutPreset[];
  activePreset?: string | null;
}

interface LayoutStorage {
  [workspace: string]: {
    [folder: string]: FolderLayoutState;
  };
}

interface ListViewProps {
  items: ListViewFile[];
  onOpen: (file: ListViewFile) => void;
  activeFileName?: string | null;
  folderKey: string;
  workspaceKey?: string;
}

const STORAGE_KEY = 'file-explorer:layouts';

const DEFAULT_ORDER: ColumnKey[] = ['name', 'size', 'type', 'modified', 'tags', 'hash'];

const DEFAULT_VISIBILITY: Record<ColumnKey, boolean> = {
  name: true,
  size: true,
  type: true,
  modified: true,
  tags: false,
  hash: false,
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: 'Name',
  size: 'Size',
  type: 'Type',
  modified: 'Modified',
  tags: 'Tags',
  hash: 'Hash (SHA-256)',
};

function readStorage(): LayoutStorage {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LayoutStorage;
  } catch {
    return {};
  }
}

function writeStorage(data: LayoutStorage) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function formatBytes(size?: number | null) {
  if (size === undefined || size === null || Number.isNaN(size)) return '—';
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / Math.pow(1024, idx);
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

function formatModified(modified?: number | Date | null) {
  if (!modified) return '—';
  const date = modified instanceof Date ? modified : new Date(modified);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function normalizeOrder(order?: ColumnKey[]): ColumnKey[] {
  const filtered = (order || []).filter((key): key is ColumnKey => DEFAULT_ORDER.includes(key));
  const unique: ColumnKey[] = [];
  for (const key of [...filtered, ...DEFAULT_ORDER]) {
    if (!unique.includes(key)) unique.push(key);
  }
  return unique;
}

function normalizeVisibility(visibility?: Record<ColumnKey, boolean>): Record<ColumnKey, boolean> {
  const defaults = { ...DEFAULT_VISIBILITY };
  if (!visibility) return defaults;
  for (const key of DEFAULT_ORDER) {
    defaults[key] = visibility[key] ?? defaults[key];
  }
  if (!Object.values(defaults).some(Boolean)) {
    defaults.name = true;
  }
  return defaults;
}

function makeDefaultLayout(): LayoutState {
  return {
    order: [...DEFAULT_ORDER],
    visibility: { ...DEFAULT_VISIBILITY },
  };
}

function ensureFolderState(state?: FolderLayoutState | null): FolderLayoutState {
  if (!state) {
    return {
      layout: makeDefaultLayout(),
      presets: [],
      activePreset: null,
    };
  }
  const layout = state.layout ? {
    order: normalizeOrder(state.layout.order),
    visibility: normalizeVisibility(state.layout.visibility),
  } : makeDefaultLayout();
  return {
    layout,
    presets: (state.presets || []).map((preset) => ({
      name: preset.name,
      layout: {
        order: normalizeOrder(preset.layout?.order),
        visibility: normalizeVisibility(preset.layout?.visibility),
      },
    })),
    activePreset: state.activePreset || null,
  };
}

const COLUMN_RENDERERS: Record<ColumnKey, (item: ListViewFile, hashMap: Record<string, string | null>) => React.ReactNode> = {
  name: (item) => item.name,
  size: (item) => formatBytes(item.size),
  type: (item) => item.type || '—',
  modified: (item) => formatModified(item.modified),
  tags: (item) => (item.tags && item.tags.length ? item.tags.join(', ') : '—'),
  hash: (item, hashMap) => hashMap[item.name] || '—',
};

export default function ListView({
  items,
  onOpen,
  activeFileName,
  folderKey,
  workspaceKey = 'default',
}: ListViewProps) {
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => [...DEFAULT_ORDER]);
  const [visibility, setVisibility] = useState<Record<ColumnKey, boolean>>({ ...DEFAULT_VISIBILITY });
  const [presets, setPresets] = useState<LayoutPreset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [ready, setReady] = useState(false);
  const [hashMap, setHashMap] = useState<Record<string, string | null>>({});

  const normalizedWorkspace = workspaceKey || 'default';
  const normalizedFolder = folderKey || 'root';

  const visibleColumns = useMemo(
    () => columnOrder.filter((key) => visibility[key]),
    [columnOrder, visibility]
  );

  useEffect(() => {
    setReady(false);
    const stored = readStorage();
    const workspaceState = stored[normalizedWorkspace] || {};
    const folderState = ensureFolderState(workspaceState[normalizedFolder]);
    setColumnOrder(folderState.layout.order);
    setVisibility(folderState.layout.visibility);
    setPresets(folderState.presets);
    setActivePreset(folderState.activePreset || null);
    setReady(true);
  }, [normalizedWorkspace, normalizedFolder]);

  useEffect(() => {
    setHashMap((prev) => {
      const next: Record<string, string | null> = {};
      for (const item of items) {
        if (Object.prototype.hasOwnProperty.call(prev, item.name)) {
          next[item.name] = prev[item.name];
        }
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!ready) return;
    const stored = readStorage();
    const workspaceState = { ...(stored[normalizedWorkspace] || {}) };
    workspaceState[normalizedFolder] = {
      layout: { order: columnOrder, visibility },
      presets,
      activePreset,
    };
    writeStorage({
      ...stored,
      [normalizedWorkspace]: workspaceState,
    });
  }, [columnOrder, visibility, presets, activePreset, ready, normalizedWorkspace, normalizedFolder]);

  useEffect(() => {
    if (!visibleColumns.includes('hash')) return;
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const computeHashes = async () => {
      if (!window.crypto?.subtle) return;
      const updates: Record<string, string | null> = {};
      for (const item of items) {
        if (Object.prototype.hasOwnProperty.call(hashMap, item.name)) continue;
        try {
          const file = await item.handle.getFile();
          const buffer = await file.arrayBuffer();
          const digest = await window.crypto.subtle.digest('SHA-256', buffer);
          const bytes = Array.from(new Uint8Array(digest));
          const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
          updates[item.name] = hex;
        } catch {
          updates[item.name] = null;
        }
        if (cancelled) return;
      }
      if (Object.keys(updates).length && !cancelled) {
        setHashMap((prev) => ({ ...prev, ...updates }));
      }
    };
    computeHashes();
    return () => {
      cancelled = true;
    };
  }, [visibleColumns, items, hashMap]);

  const toggleColumn = (key: ColumnKey) => {
    if (key === 'name') return;
    const currentlyVisible = visibility[key];
    if (currentlyVisible) {
      const visibleCount = visibleColumns.length;
      if (visibleCount <= 1) return;
    }
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    setActivePreset(null);
  };

  const moveColumn = (key: ColumnKey, direction: 'up' | 'down') => {
    setColumnOrder((prev) => {
      const index = prev.indexOf(key);
      if (index === -1) return prev;
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      const temp = next[swapIndex];
      next[swapIndex] = key;
      next[index] = temp;
      return next;
    });
    setActivePreset(null);
  };

  const applyPreset = (presetNameToApply: string | null) => {
    if (!presetNameToApply) {
      setColumnOrder([...DEFAULT_ORDER]);
      setVisibility({ ...DEFAULT_VISIBILITY });
      setActivePreset(null);
      return;
    }
    const preset = presets.find((p) => p.name === presetNameToApply);
    if (!preset) return;
    setColumnOrder(normalizeOrder(preset.layout.order));
    setVisibility(normalizeVisibility(preset.layout.visibility));
    setActivePreset(preset.name);
  };

  const savePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    setPresets((prev) => {
      const existingIndex = prev.findIndex((p) => p.name === trimmed);
      const layout: LayoutState = {
        order: [...columnOrder],
        visibility: { ...visibility },
      };
      if (existingIndex !== -1) {
        const next = [...prev];
        next[existingIndex] = { name: trimmed, layout };
        return next;
      }
      return [...prev, { name: trimmed, layout }];
    });
    setActivePreset(trimmed);
    setPresetName('');
  };

  const deletePreset = (name: string) => {
    setPresets((prev) => prev.filter((p) => p.name !== name));
    if (activePreset === name) {
      setActivePreset(null);
    }
  };

  const tableRows = useMemo(() => items, [items]);

  return (
    <div className="flex flex-col h-full border-b border-gray-700">
      <div className="flex items-center justify-between px-2 py-1 bg-black bg-opacity-40 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">List view</span>
          <select
            value={activePreset || ''}
            onChange={(event) => applyPreset(event.target.value || null)}
            className="bg-ub-cool-grey px-1 py-0.5 text-xs border border-gray-600"
            aria-label="Saved layout presets"
            data-testid="preset-select"
          >
            <option value="">Default layout</option>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="px-2 py-1 text-xs bg-black bg-opacity-50 rounded border border-gray-600"
          onClick={() => setShowSettings((prev) => !prev)}
          data-testid="listview-settings-toggle"
        >
          {showSettings ? 'Hide settings' : 'Customize columns'}
        </button>
      </div>
      {showSettings && (
        <div className="p-2 space-y-3 bg-black bg-opacity-30 border-b border-gray-700" data-testid="listview-settings">
          <div className="space-y-1">
            {columnOrder.map((key) => (
              <div key={key} className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={visibility[key]}
                    onChange={() => toggleColumn(key)}
                    disabled={key === 'name'}
                    aria-label={`${COLUMN_LABELS[key]} column visibility`}
                    data-testid={`column-toggle-${key}`}
                  />
                  <span>{COLUMN_LABELS[key]}</span>
                </label>
                <div className="space-x-1">
                  <button
                    type="button"
                    className="px-1 py-0.5 text-xs border border-gray-600 bg-black bg-opacity-40"
                    onClick={() => moveColumn(key, 'up')}
                    aria-label={`Move ${COLUMN_LABELS[key]} column up`}
                    data-testid={`column-move-up-${key}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="px-1 py-0.5 text-xs border border-gray-600 bg-black bg-opacity-40"
                    onClick={() => moveColumn(key, 'down')}
                    aria-label={`Move ${COLUMN_LABELS[key]} column down`}
                    data-testid={`column-move-down-${key}`}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name"
              className="px-2 py-1 text-xs bg-ub-cool-grey border border-gray-600 flex-1"
              data-testid="preset-name-input"
              aria-label="Preset name"
            />
            <button
              type="button"
              className="px-2 py-1 text-xs border border-gray-600 bg-black bg-opacity-40 rounded"
              onClick={savePreset}
              data-testid="save-preset-btn"
            >
              Save preset
            </button>
          </div>
          {presets.length > 0 && (
            <div className="space-y-1 text-xs">
              <div className="font-semibold">Manage presets</div>
              {presets.map((preset) => (
                <div key={preset.name} className="flex items-center justify-between">
                  <span>{preset.name}</span>
                  <button
                    type="button"
                    className="px-2 py-0.5 border border-gray-600 bg-black bg-opacity-40 rounded"
                    onClick={() => deletePreset(preset.name)}
                    data-testid={`delete-preset-${preset.name}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black bg-opacity-30">
            <tr>
              {visibleColumns.map((key) => (
                <th key={key} className="px-2 py-1 font-semibold" data-testid={`column-header-${key}`}>
                  {COLUMN_LABELS[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((item) => {
              const isActive = activeFileName === item.name;
              const rowKey = `row-${item.name}`;
              return (
                <tr
                  key={rowKey}
                  className={`cursor-pointer ${isActive ? 'bg-black bg-opacity-40' : 'hover:bg-black hover:bg-opacity-20'}`}
                  onDoubleClick={() => onOpen(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpen(item);
                    }
                  }}
                  tabIndex={0}
                  data-testid={rowKey}
                >
                  {visibleColumns.map((key) => (
                    <td key={`${rowKey}-${key}`} className="px-2 py-1" data-testid={`cell-${item.name}-${key}`}>
                      {COLUMN_RENDERERS[key](item, hashMap)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {tableRows.length === 0 && (
              <tr>
                <td className="px-2 py-4 text-center text-gray-300" colSpan={visibleColumns.length}>
                  No files in this directory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

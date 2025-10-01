import { useEffect, useCallback, useMemo, useRef } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
}

export type ConflictAction = 'replace' | 'skip' | 'keep-both';

export interface ConflictResolutionRequest {
  restored: TrashItem;
  existing: TrashItem;
  suggestedName: string;
}

export interface ConflictResolutionResponse {
  action: ConflictAction;
  applyToAll?: boolean;
}

export interface OperationResult {
  action: 'restored' | 'replaced' | 'skipped' | 'kept-both';
  item: TrashItem;
  renamed?: TrashItem;
}

export interface KeptBothEntry {
  original: TrashItem;
  renamed: TrashItem;
}

export interface OperationSummary {
  restored: TrashItem[];
  replaced: TrashItem[];
  skipped: TrashItem[];
  keptBoth: KeptBothEntry[];
}

export type ConflictResolver = (
  request: ConflictResolutionRequest,
) => Promise<ConflictResolutionResponse>;

const createDefaultResolver = (): ConflictResolver => async request => {
  const replace = window.confirm(
    `${request.restored.title} already exists. Replace the existing entry?`,
  );
  if (replace) return { action: 'replace' };

  const skip = window.confirm(
    `Skip restoring ${request.restored.title}? Cancel will keep both entries.`,
  );
  if (skip) return { action: 'skip' };

  return { action: 'keep-both' };
};

const generateCopyName = (base: string, existingTitles: Set<string>) => {
  if (!existingTitles.has(base)) return base;

  const match = base.match(/^(.*?)(\s*\((\d+)\))?$/);
  const stem = match?.[1]?.trim() || base;
  let counter = match?.[3] ? parseInt(match[3], 10) + 1 : 1;
  let candidate = '';
  do {
    candidate = `${stem} (${counter})`;
    counter += 1;
  } while (existingTitles.has(candidate));
  return candidate;
};

interface UseTrashStateOptions {
  resolveConflict?: ConflictResolver;
}

const ITEMS_KEY = 'window-trash';
const HISTORY_KEY = 'window-trash-history';
const HISTORY_LIMIT = 20;

interface ConflictPolicy {
  action: ConflictAction;
}

export default function useTrashState(options: UseTrashStateOptions = {}) {
  const [items, setItems] = usePersistentState<TrashItem[]>(ITEMS_KEY, []);
  const [history, setHistory] = usePersistentState<TrashItem[]>(HISTORY_KEY, []);
  const conflictPolicyRef = useRef<ConflictPolicy | null>(null);
  const itemsRef = useRef(items);
  const historyRef = useRef(history);
  const resolver = useMemo(
    () => options.resolveConflict || createDefaultResolver(),
    [options.resolveConflict],
  );
  const resolverRef = useRef(resolver);

  useEffect(() => {
    resolverRef.current = resolver;
  }, [resolver]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const purgeDays = parseInt(
      window.localStorage.getItem('trash-purge-days') || '30',
      10,
    );
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setItems(prev => prev.filter(item => now - item.closedAt <= ms));
  }, [setItems]);

  const pushHistory = useCallback(
    (item: TrashItem | TrashItem[]) => {
      setHistory(prev => {
        const arr = Array.isArray(item) ? item : [item];
        const next = [...arr, ...prev];
        return next.slice(0, HISTORY_LIMIT);
      });
    },
    [setHistory],
  );

  const resolveNameConflict = useCallback(
    async (
      restored: TrashItem,
      currentItems: TrashItem[],
      allowApplyAll: boolean,
    ): Promise<{
      items: TrashItem[];
      action: OperationResult['action'];
      keepInHistory: boolean;
      renamed?: TrashItem;
    }> => {
      const existing = currentItems.find(item => item.title === restored.title);
      if (!existing) {
        return {
          items: [...currentItems, restored],
          action: 'restored',
          keepInHistory: false,
        };
      }

      let decision: ConflictPolicy | null = allowApplyAll
        ? conflictPolicyRef.current
        : null;

      const titleSet = new Set(currentItems.map(item => item.title));
      const suggestedName = generateCopyName(restored.title, titleSet);

      if (!decision) {
        const response = await resolverRef.current({
          restored,
          existing,
          suggestedName,
        });
        decision = { action: response.action };
        if (allowApplyAll && response.applyToAll) {
          conflictPolicyRef.current = { action: response.action };
        } else if (allowApplyAll) {
          conflictPolicyRef.current = null;
        }
      }

      if (decision.action === 'replace') {
        const filtered = currentItems.filter(
          item => item.title !== restored.title,
        );
        return {
          items: [...filtered, restored],
          action: 'replaced',
          keepInHistory: false,
        };
      }

      if (decision.action === 'skip') {
        return {
          items: currentItems,
          action: 'skipped',
          keepInHistory: true,
        };
      }

      const copyName = generateCopyName(restored.title, titleSet);
      const renamed = { ...restored, title: copyName };
      return {
        items: [...currentItems, renamed],
        action: 'kept-both',
        keepInHistory: false,
        renamed,
      };
    },
    [],
  );

  const restoreFromHistory = useCallback(
    async (index: number): Promise<OperationResult | null> => {
      const currentHistory = historyRef.current;
      const nextHistory = [...currentHistory];
      const [restored] = nextHistory.splice(index, 1);
      if (!restored) return null;

      conflictPolicyRef.current = null;

      const currentItems = itemsRef.current;
      const result = await resolveNameConflict(restored, currentItems, false);
      const updatedItems = result.items;

      if (result.keepInHistory) {
        nextHistory.splice(index, 0, restored);
      }

      itemsRef.current = updatedItems;
      historyRef.current = nextHistory;
      setItems(updatedItems);
      setHistory(nextHistory);

      return {
        action: result.action,
        item: restored,
        renamed: result.renamed,
      };
    },
    [resolveNameConflict, setHistory, setItems],
  );

  const restoreAllFromHistory = useCallback(async (): Promise<OperationSummary> => {
    const originalHistory = historyRef.current;
    if (!originalHistory.length) {
      return { restored: [], replaced: [], skipped: [], keptBoth: [] };
    }

    conflictPolicyRef.current = null;
    const remaining: TrashItem[] = [];
    let nextItems = itemsRef.current;
    const summary: OperationSummary = {
      restored: [],
      replaced: [],
      skipped: [],
      keptBoth: [],
    };

    for (const restored of originalHistory) {
      const result = await resolveNameConflict(restored, nextItems, true);
      nextItems = result.items;

      switch (result.action) {
        case 'restored':
          summary.restored.push(restored);
          break;
        case 'replaced':
          summary.replaced.push(restored);
          break;
        case 'skipped':
          summary.skipped.push(restored);
          break;
        case 'kept-both':
          if (result.renamed) {
            summary.keptBoth.push({ original: restored, renamed: result.renamed });
          }
          break;
      }

      if (result.keepInHistory) {
        remaining.push(restored);
      }
    }

    conflictPolicyRef.current = null;

    itemsRef.current = nextItems;
    historyRef.current = remaining;
    setItems(nextItems);
    setHistory(remaining);

    return summary;
  }, [resolveNameConflict, setHistory, setItems]);

  return {
    items,
    setItems,
    history,
    pushHistory,
    restoreFromHistory,
    restoreAllFromHistory,
  };
}


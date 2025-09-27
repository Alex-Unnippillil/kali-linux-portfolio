'use client';

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';

export type CommandPaletteItem = {
  id: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
  section: string;
  onSelect: () => void;
  priority?: number;
};

export type CommandPaletteState = {
  isOpen: boolean;
  query: string;
  items: readonly CommandPaletteItem[];
  results: readonly CommandPaletteItem[];
  selectedIndex: number;
};

type CommandPaletteAction =
  | { type: 'OPEN'; initialQuery?: string }
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'SET_ITEMS'; items: readonly CommandPaletteItem[] }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'MOVE_SELECTION'; delta: number }
  | { type: 'SET_SELECTION'; index: number };

const INITIAL_STATE: CommandPaletteState = {
  isOpen: false,
  query: '',
  items: [],
  results: [],
  selectedIndex: -1,
};

const MIN_SCORE = -1_000_000;

const normalize = (value: string) => value.toLowerCase();

const computeFuzzyScore = (query: string, text: string): number => {
  if (!query) return 0;
  const q = normalize(query);
  const t = normalize(text);
  let score = 0;
  let cursor = 0;

  for (let i = 0; i < q.length; i += 1) {
    const needle = q[i];
    const index = t.indexOf(needle, cursor);
    if (index === -1) {
      return MIN_SCORE;
    }

    if (index === cursor) {
      score += 2;
    } else {
      score += 1 / (index - cursor + 1);
    }
    cursor = index + 1;
  }

  if (t.startsWith(q)) {
    score += 3;
  }
  if (t.includes(q)) {
    score += 5;
  }

  score += q.length / Math.max(t.length, 1);

  return score;
};

export const rankItems = (
  items: readonly CommandPaletteItem[],
  query: string,
): CommandPaletteItem[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [...items].sort((a, b) => {
      const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      return a.label.localeCompare(b.label);
    });
  }

  return items
    .map((item) => {
      const haystacks: string[] = [item.label, item.description ?? '', ...(item.keywords ?? []), item.id];
      const score = haystacks.reduce((best, value) => {
        if (!value) return best;
        const current = computeFuzzyScore(trimmed, value);
        return Math.max(best, current);
      }, MIN_SCORE);
      return { item, score };
    })
    .filter(({ score }) => score > MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const priorityDelta = (b.item.priority ?? 0) - (a.item.priority ?? 0);
      if (priorityDelta !== 0) return priorityDelta;
      return a.item.label.localeCompare(b.item.label);
    })
    .map(({ item }) => item);
};

const reducer = (state: CommandPaletteState, action: CommandPaletteAction): CommandPaletteState => {
  switch (action.type) {
    case 'OPEN': {
      const query = action.initialQuery ?? '';
      const results = rankItems(state.items, query);
      return {
        ...state,
        isOpen: true,
        query,
        results,
        selectedIndex: results.length ? 0 : -1,
      };
    }
    case 'CLOSE':
      return {
        ...state,
        isOpen: false,
        query: '',
        results: rankItems(state.items, ''),
        selectedIndex: state.items.length ? 0 : -1,
      };
    case 'TOGGLE':
      return state.isOpen ? reducer(state, { type: 'CLOSE' }) : reducer(state, { type: 'OPEN' });
    case 'SET_ITEMS': {
      const results = rankItems(action.items, state.query);
      return {
        ...state,
        items: action.items,
        results,
        selectedIndex: results.length ? Math.min(state.selectedIndex, results.length - 1) : -1,
      };
    }
    case 'SET_QUERY': {
      const results = rankItems(state.items, action.query);
      return {
        ...state,
        query: action.query,
        results,
        selectedIndex: results.length ? 0 : -1,
      };
    }
    case 'MOVE_SELECTION': {
      if (!state.results.length) {
        return { ...state, selectedIndex: -1 };
      }
      const nextIndex = (state.selectedIndex + action.delta + state.results.length) % state.results.length;
      return {
        ...state,
        selectedIndex: nextIndex,
      };
    }
    case 'SET_SELECTION': {
      if (!state.results.length) {
        return { ...state, selectedIndex: -1 };
      }
      const index = Math.max(0, Math.min(action.index, state.results.length - 1));
      return {
        ...state,
        selectedIndex: index,
      };
    }
    default:
      return state;
  }
};

type CommandPaletteContextValue = {
  state: CommandPaletteState;
  open: (initialQuery?: string) => void;
  close: () => void;
  toggle: () => void;
  setItems: (items: readonly CommandPaletteItem[]) => void;
  setQuery: (query: string) => void;
  moveSelection: (delta: number) => void;
  setSelection: (index: number) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined);

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const open = useCallback((initialQuery?: string) => {
    dispatch({ type: 'OPEN', initialQuery });
  }, []);
  const close = useCallback(() => {
    dispatch({ type: 'CLOSE' });
  }, []);
  const toggle = useCallback(() => {
    dispatch({ type: 'TOGGLE' });
  }, []);
  const setItems = useCallback((items: readonly CommandPaletteItem[]) => {
    dispatch({ type: 'SET_ITEMS', items });
  }, []);
  const setQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_QUERY', query });
  }, []);
  const moveSelection = useCallback((delta: number) => {
    dispatch({ type: 'MOVE_SELECTION', delta });
  }, []);
  const setSelection = useCallback((index: number) => {
    dispatch({ type: 'SET_SELECTION', index });
  }, []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      state,
      open,
      close,
      toggle,
      setItems,
      setQuery,
      moveSelection,
      setSelection,
    }),
    [state, open, close, toggle, setItems, setQuery, moveSelection, setSelection],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
};

export const useCommandPaletteStore = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPaletteStore must be used within a CommandPaletteProvider');
  }
  return context;
};

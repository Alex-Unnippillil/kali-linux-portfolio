'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  telemetryStore,
  type TelemetryEvent,
  type TelemetryEventType,
} from '../../lib/telemetryStore';

type LevelFilter = 'all' | 'info' | 'warn' | 'error';

type ClearScope = 'all' | 'filtered';

interface TelemetryConsoleContextValue {
  enabled: boolean;
  events: TelemetryEvent[];
  filteredEvents: TelemetryEvent[];
  isOpen: boolean;
  search: string;
  typeFilter: TelemetryEventType | 'all';
  levelFilter: LevelFilter;
  setSearch(value: string): void;
  setTypeFilter(value: TelemetryEventType | 'all'): void;
  setLevelFilter(value: LevelFilter): void;
  setOpen(value: boolean): void;
  toggle(): void;
  clear(scope?: ClearScope): void;
}

const TelemetryConsoleContext = createContext<TelemetryConsoleContextValue>({
  enabled: false,
  events: [],
  filteredEvents: [],
  isOpen: false,
  search: '',
  typeFilter: 'all',
  levelFilter: 'all',
  setSearch: () => {},
  setTypeFilter: () => {},
  setLevelFilter: () => {},
  setOpen: () => {},
  toggle: () => {},
  clear: () => {},
});

const ENV_FLAG_KEYS = [
  'NEXT_PUBLIC_ENABLE_ANALYTICS',
  'NEXT_PUBLIC_UI_EXPERIMENTS',
  'NEXT_PUBLIC_DEMO_MODE',
  'NEXT_PUBLIC_GHIDRA_WASM',
  'NEXT_PUBLIC_ENABLE_TELEMETRY_CONSOLE',
];

export const TelemetryConsoleProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<TelemetryEvent[]>(() => telemetryStore.getEvents());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TelemetryEventType | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [isOpen, setIsOpen] = useState(false);
  const envLoggedRef = useRef(false);

  useEffect(() => {
    if (!telemetryStore.enabled) return;
    return telemetryStore.subscribe(setEvents);
  }, []);

  useEffect(() => {
    if (!telemetryStore.enabled || envLoggedRef.current) return;
    envLoggedRef.current = true;
    const env = process.env as Record<string, string | undefined>;
    ENV_FLAG_KEYS.forEach((key) => {
      const value = env[key];
      telemetryStore.logFeatureFlag(key, value ?? null, {
        origin: 'env',
        source: 'environment',
      });
    });
  }, []);

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (!telemetryStore.enabled) return;
      const target = event.target as HTMLElement | null;
      const isInput =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isInput) return;

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setIsOpen((value) => !value);
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen],
  );

  useEffect(() => {
    if (!telemetryStore.enabled) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const filteredEvents = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return events.filter((event) => {
      if (typeFilter !== 'all' && event.type !== typeFilter) return false;
      if (levelFilter !== 'all' && event.level !== levelFilter) return false;
      if (!lowerSearch) return true;
      const haystack = [
        event.message,
        event.source,
        'flag' in event ? event.flag : undefined,
        'actionLabel' in event ? event.actionLabel : undefined,
        event.tags?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(lowerSearch);
    });
  }, [events, levelFilter, search, typeFilter]);

  const clear = useCallback(
    (scope: ClearScope = 'all') => {
      if (!telemetryStore.enabled) return;
      if (scope === 'all') {
        telemetryStore.clear();
        return;
      }
      const ids = new Set(filteredEvents.map((event) => event.id));
      telemetryStore.clear((event) => ids.has(event.id));
    },
    [filteredEvents],
  );

  const value = useMemo(
    () => ({
      enabled: telemetryStore.enabled,
      events,
      filteredEvents,
      isOpen,
      search,
      typeFilter,
      levelFilter,
      setSearch,
      setTypeFilter,
      setLevelFilter,
      setOpen: setIsOpen,
      toggle: () => setIsOpen((value) => !value),
      clear,
    }),
    [clear, events, filteredEvents, isOpen, levelFilter, search, typeFilter],
  );

  return (
    <TelemetryConsoleContext.Provider value={value}>
      {children}
    </TelemetryConsoleContext.Provider>
  );
};

export const useTelemetryConsole = () => useContext(TelemetryConsoleContext);

export default TelemetryConsoleProvider;


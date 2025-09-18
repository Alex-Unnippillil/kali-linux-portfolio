"use client";

import { type SetStateAction, useCallback, useEffect, useMemo } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindow {
  id: string;
  x: number;
  y: number;
}

export const INPUT_SOURCES = [
  { id: 'us', label: 'English (US)', shortLabel: 'EN' },
  { id: 'uk', label: 'English (UK)', shortLabel: 'EN-UK' },
  { id: 'de', label: 'German', shortLabel: 'DE' },
  { id: 'jp', label: 'Japanese', shortLabel: 'あA' },
] as const;

export type InputSourceId = (typeof INPUT_SOURCES)[number]['id'];

const INPUT_SOURCE_IDS = new Set<InputSourceId>(
  INPUT_SOURCES.map((source) => source.id),
);

export const DEFAULT_INPUT_SOURCE: InputSourceId = INPUT_SOURCES[0].id;

export interface DesktopSession {
  windows: SessionWindow[];
  wallpaper: string;
  dock: string[];
  inputSources: Record<string, InputSourceId>;
  activeInputSource: InputSourceId;
  activeWindowId: string | null;
}

const normalizeWindow = (value: unknown): SessionWindow | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SessionWindow>;
  if (!candidate.id || typeof candidate.id !== 'string') return null;
  const x = typeof candidate.x === 'number' ? candidate.x : 60;
  const y = typeof candidate.y === 'number' ? candidate.y : 10;
  return { id: candidate.id, x, y };
};

const normalizeInputSources = (
  value: unknown,
): Record<string, InputSourceId> => {
  if (!value || typeof value !== 'object') return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const result: Record<string, InputSourceId> = {};
  entries.forEach(([key, source]) => {
    if (typeof key !== 'string') return;
    if (typeof source !== 'string') return;
    if (INPUT_SOURCE_IDS.has(source as InputSourceId)) {
      result[key] = source as InputSourceId;
    }
  });
  return result;
};

const normalizeDock = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const normalizeWindows = (value: unknown): SessionWindow[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeWindow)
    .filter((item): item is SessionWindow => item !== null);
};

const normalizeSession = (value: unknown): DesktopSession => {
  if (!value || typeof value !== 'object') {
    return {
      windows: [],
      wallpaper: defaults.wallpaper,
      dock: [],
      inputSources: {},
      activeInputSource: DEFAULT_INPUT_SOURCE,
      activeWindowId: null,
    };
  }
  const candidate = value as Partial<DesktopSession> & Record<string, unknown>;
  const windows = normalizeWindows(candidate.windows);
  const wallpaper =
    typeof candidate.wallpaper === 'string'
      ? candidate.wallpaper
      : defaults.wallpaper;
  const dock = normalizeDock(candidate.dock);
  const inputSources = normalizeInputSources(candidate.inputSources);
  const activeInputSource = INPUT_SOURCE_IDS.has(
    candidate.activeInputSource as InputSourceId,
  )
    ? (candidate.activeInputSource as InputSourceId)
    : DEFAULT_INPUT_SOURCE;
  const activeWindowId =
    typeof candidate.activeWindowId === 'string'
      ? candidate.activeWindowId
      : null;

  return {
    windows,
    wallpaper,
    dock,
    inputSources,
    activeInputSource,
    activeWindowId,
  };
};

const initialSession: DesktopSession = normalizeSession({});

function isSession(value: unknown): value is DesktopSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.windows) &&
    typeof candidate.wallpaper === 'string' &&
    Array.isArray(candidate.dock)
  );
}

const applyDocumentSource = (source: InputSourceId) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.inputSource = source;
};

export default function useSession() {
  const [rawSession, setRawSession, _reset, clear] =
    usePersistentState<DesktopSession>('desktop-session', initialSession, isSession);

  const session = useMemo(() => normalizeSession(rawSession), [rawSession]);

  useEffect(() => {
    applyDocumentSource(session.activeInputSource);
  }, [session.activeInputSource]);

  const updateSession = useCallback(
    (update: SetStateAction<DesktopSession>) => {
      setRawSession((prev) => {
        const base = normalizeSession(prev);
        const next =
          typeof update === 'function' ? (update as (s: DesktopSession) => DesktopSession)(base) : update;
        return normalizeSession(next);
      });
    },
    [setRawSession],
  );

  const getWindowInputSource = useCallback(
    (windowId: string): InputSourceId => {
      return session.inputSources[windowId] ?? DEFAULT_INPUT_SOURCE;
    },
    [session.inputSources],
  );

  const setWindowInputSource = useCallback(
    (windowId: string, sourceId: string) => {
      const normalized = INPUT_SOURCE_IDS.has(sourceId as InputSourceId)
        ? (sourceId as InputSourceId)
        : DEFAULT_INPUT_SOURCE;
      updateSession((prev) => {
        const nextSources = { ...prev.inputSources, [windowId]: normalized };
        const isActive = prev.activeWindowId === windowId;
        const nextActive = isActive ? normalized : prev.activeInputSource;
        if (isActive) {
          applyDocumentSource(nextActive);
        }
        return {
          ...prev,
          inputSources: nextSources,
          activeInputSource: nextActive,
        };
      });
    },
    [updateSession],
  );

  const clearWindowInputSource = useCallback(
    (windowId: string) => {
      updateSession((prev) => {
        if (!prev.inputSources[windowId]) return prev;
        const { [windowId]: _removed, ...rest } = prev.inputSources;
        const isActive = prev.activeWindowId === windowId;
        const nextActive = isActive ? DEFAULT_INPUT_SOURCE : prev.activeInputSource;
        if (isActive) {
          applyDocumentSource(nextActive);
        }
        return {
          ...prev,
          inputSources: rest,
          activeInputSource: nextActive,
        };
      });
    },
    [updateSession],
  );

  const activateWindowInputSource = useCallback(
    (windowId: string) => {
      updateSession((prev) => {
        const source = prev.inputSources[windowId] ?? DEFAULT_INPUT_SOURCE;
        applyDocumentSource(source);
        return {
          ...prev,
          activeInputSource: source,
          activeWindowId: windowId,
        };
      });
    },
    [updateSession],
  );

  const resetSession = useCallback(() => {
    clear();
    applyDocumentSource(DEFAULT_INPUT_SOURCE);
  }, [clear]);

  return {
    session,
    setSession: updateSession,
    resetSession,
    getWindowInputSource,
    setWindowInputSource,
    clearWindowInputSource,
    activateWindowInputSource,
  };
}

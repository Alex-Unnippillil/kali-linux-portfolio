import { useCallback, useMemo } from 'react';
import useSession from './useSession';
import type { SnapArea, WindowLayoutMap } from '../types/windowLayout';

type Direction = 'left' | 'right';

const LEFT_SEQUENCE: SnapArea[] = [
  'half-left',
  'third-left',
  'quarter-top-left',
  'quarter-bottom-left',
];

const RIGHT_SEQUENCE: SnapArea[] = [
  'half-right',
  'third-right',
  'quarter-top-right',
  'quarter-bottom-right',
];

const SEQUENCE_MAP: Record<Direction, SnapArea[]> = {
  left: LEFT_SEQUENCE,
  right: RIGHT_SEQUENCE,
};

export interface WindowLayoutApi {
  layout: WindowLayoutMap;
  snapTab: (tabId: string, area: SnapArea) => void;
  unsnapTab: (tabId: string) => void;
  cycleSnap: (tabId: string, direction: Direction) => void;
}

const hasOwn = <T extends PropertyKey>(obj: Record<T, unknown>, key: T) =>
  Object.prototype.hasOwnProperty.call(obj, key);

export default function useWindowLayout(sessionId?: string | null): WindowLayoutApi {
  const { session, setSession } = useSession();

  const layout = useMemo<WindowLayoutMap>(() => {
    if (!sessionId) return {};
    const map = session.windowLayouts[sessionId];
    return map ? { ...map } : {};
  }, [session.windowLayouts, sessionId]);

  const updateLayout = useCallback(
    (updater: (prev: WindowLayoutMap) => WindowLayoutMap) => {
      if (!sessionId) return;
      setSession((prev) => {
        const existing = prev.windowLayouts[sessionId] ?? {};
        const next = updater(existing);
        if (next === existing) {
          return prev;
        }
        return {
          ...prev,
          windowLayouts: {
            ...prev.windowLayouts,
            [sessionId]: next,
          },
        };
      });
    },
    [sessionId, setSession],
  );

  const snapTab = useCallback(
    (tabId: string, area: SnapArea) => {
      updateLayout((prev) => {
        if (prev[tabId] === area) return prev;
        return { ...prev, [tabId]: area };
      });
    },
    [updateLayout],
  );

  const unsnapTab = useCallback(
    (tabId: string) => {
      updateLayout((prev) => {
        if (!hasOwn(prev, tabId)) return prev;
        const { [tabId]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [updateLayout],
  );

  const cycleSnap = useCallback(
    (tabId: string, direction: Direction) => {
      updateLayout((prev) => {
        const current = prev[tabId];
        const sequence = SEQUENCE_MAP[direction];
        const currentIndex = current ? sequence.indexOf(current) : -1;
        const next = sequence[currentIndex + 1] ?? null;
        if (!next) {
          if (current) {
            const { [tabId]: _removed, ...rest } = prev;
            return rest;
          }
          return prev;
        }
        return { ...prev, [tabId]: next };
      });
    },
    [updateLayout],
  );

  return useMemo<WindowLayoutApi>(
    () => ({
      layout,
      snapTab,
      unsnapTab,
      cycleSnap,
    }),
    [layout, snapTab, unsnapTab, cycleSnap],
  );
}

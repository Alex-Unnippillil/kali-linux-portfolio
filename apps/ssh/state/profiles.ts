import { useCallback, useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export type ForwardDirection = 'local' | 'remote';

export interface PortForwardInput {
  direction: ForwardDirection;
  sourcePort: number;
  destinationHost: string;
  destinationPort: number;
}

export interface PortForwardDefinition extends PortForwardInput {
  id: string;
  enabled: boolean;
}

interface ProfileRecord {
  forwards: PortForwardDefinition[];
}

type ProfileStore = Record<string, ProfileRecord>;

const STORAGE_KEY = 'ssh:profiles';

const createProfileRecord = (): ProfileRecord => ({ forwards: [] });

const createForwardId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type ListenerStatus = 'listening' | 'stopped';

type ListenerEventType = 'started' | 'stopped';

interface ListenerEvent {
  type: ListenerEventType;
  profileId: string;
  forwardId: string;
}

interface ListenerEntry {
  profileId: string;
}

const listeners = new Map<string, ListenerEntry>();
const listenerSubscribers = new Set<() => void>();
const listenerEvents: ListenerEvent[] = [];

const notifyListeners = () => {
  listenerSubscribers.forEach((cb) => cb());
};

const recordEvent = (event: ListenerEvent) => {
  listenerEvents.push(event);
};

const startListening = (profileId: string, forward: PortForwardDefinition) => {
  listeners.set(forward.id, { profileId });
  recordEvent({ type: 'started', profileId, forwardId: forward.id });
  notifyListeners();
};

const stopListening = (profileId: string, forwardId: string) => {
  if (listeners.delete(forwardId)) {
    recordEvent({ type: 'stopped', profileId, forwardId });
    notifyListeners();
  }
};

export const getForwardStatus = (forwardId: string): ListenerStatus =>
  listeners.has(forwardId) ? 'listening' : 'stopped';

export const subscribeListenerRegistry = (callback: () => void) => {
  listenerSubscribers.add(callback);
  return () => {
    listenerSubscribers.delete(callback);
  };
};

export const ensureActiveForwards = (
  profileId: string,
  forwards: PortForwardDefinition[],
) => {
  forwards.forEach((forward) => {
    if (forward.enabled && !listeners.has(forward.id)) {
      startListening(profileId, forward);
    }
  });
};

export const deactivateProfile = (profileId: string) => {
  const ids = Array.from(listeners.entries())
    .filter(([, entry]) => entry.profileId === profileId)
    .map(([forwardId]) => forwardId);
  ids.forEach((forwardId) => {
    stopListening(profileId, forwardId);
  });
};

export const useSshProfile = (profileId: string) => {
  const [profiles, setProfiles] = usePersistentState<ProfileStore>(STORAGE_KEY, {});

  const profile = useMemo(() => {
    const entry = profiles[profileId];
    if (!entry) return createProfileRecord();
    return {
      forwards: entry.forwards.map((forward) => ({ ...forward })),
    };
  }, [profiles, profileId]);

  const addForward = useCallback(
    (input: PortForwardInput) => {
      const forward: PortForwardDefinition = {
        id: createForwardId(),
        enabled: false,
        ...input,
      };
      setProfiles((prev) => {
        const current = prev[profileId] ?? createProfileRecord();
        const nextProfile: ProfileRecord = {
          forwards: [...current.forwards, forward],
        };
        return { ...prev, [profileId]: nextProfile };
      });
    },
    [profileId, setProfiles],
  );

  const updateForward = useCallback(
    (forwardId: string, patch: Partial<PortForwardInput>) => {
      let effect: (() => void) | undefined;
      setProfiles((prev) => {
        const current = prev[profileId] ?? createProfileRecord();
        let updated: PortForwardDefinition | undefined;
        let previous: PortForwardDefinition | undefined;
        const forwards = current.forwards.map((forward) => {
          if (forward.id !== forwardId) return forward;
          previous = forward;
          updated = { ...forward, ...patch };
          return updated;
        });
        if (!updated || !previous) return prev;
        effect = () => {
          if (updated && updated.enabled) {
            startListening(profileId, updated);
          } else if (previous?.enabled) {
            stopListening(profileId, forwardId);
          }
        };
        return { ...prev, [profileId]: { forwards } };
      });
      effect?.();
    },
    [profileId, setProfiles],
  );

  const removeForward = useCallback(
    (forwardId: string) => {
      let effect: (() => void) | undefined;
      setProfiles((prev) => {
        const current = prev[profileId] ?? createProfileRecord();
        const forward = current.forwards.find((item) => item.id === forwardId);
        if (!forward) return prev;
        const nextProfile: ProfileRecord = {
          forwards: current.forwards.filter((item) => item.id !== forwardId),
        };
        if (forward.enabled) {
          effect = () => stopListening(profileId, forwardId);
        }
        return { ...prev, [profileId]: nextProfile };
      });
      effect?.();
    },
    [profileId, setProfiles],
  );

  const setForwardEnabled = useCallback(
    (forwardId: string, enabled: boolean) => {
      let effect: (() => void) | undefined;
      setProfiles((prev) => {
        const current = prev[profileId] ?? createProfileRecord();
        let changed = false;
        let updatedForward: PortForwardDefinition | undefined;
        let previousForward: PortForwardDefinition | undefined;
        const forwards = current.forwards.map((forward) => {
          if (forward.id !== forwardId) return forward;
          if (forward.enabled === enabled) return forward;
          changed = true;
          previousForward = forward;
          updatedForward = { ...forward, enabled };
          return updatedForward;
        });
        if (!changed || !previousForward || !updatedForward) return prev;
        effect = () => {
          if (enabled) {
            startListening(profileId, updatedForward!);
          } else {
            stopListening(profileId, forwardId);
          }
        };
        return { ...prev, [profileId]: { forwards } };
      });
      effect?.();
    },
    [profileId, setProfiles],
  );

  const clearProfile = useCallback(() => {
    setProfiles((prev) => {
      if (!(profileId in prev)) return prev;
      const next = { ...prev };
      delete next[profileId];
      return next;
    });
    deactivateProfile(profileId);
  }, [profileId, setProfiles]);

  return {
    profile,
    addForward,
    updateForward,
    removeForward,
    setForwardEnabled,
    clearProfile,
  } as const;
};

export const __testing = {
  getEvents: () => [...listenerEvents],
  reset: () => {
    listeners.clear();
    listenerEvents.length = 0;
  },
};


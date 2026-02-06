import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NotificationsContext } from '../components/common/NotificationCenter';

export type PermissionKey = 'camera' | 'microphone' | 'serial' | 'filesystem';

export type PermissionStateValue = PermissionState | 'unknown';

export interface PermissionActionResult {
  ok: boolean;
  error?: string;
  state?: PermissionStateValue;
}

export interface PermissionDetail {
  key: PermissionKey;
  label: string;
  description: string;
  docUrl: string;
  supported: boolean;
  state: PermissionStateValue;
  error: string | null;
  canRequest: boolean;
  canRevoke: boolean;
  requesting: boolean;
  revoking: boolean;
  request: () => Promise<PermissionActionResult>;
  revoke: () => Promise<PermissionActionResult>;
}

interface PermissionConfig {
  label: string;
  description: string;
  docUrl: string;
  permissionName: string;
  request?: () => Promise<void>;
  revoke?: () => Promise<void>;
  isSupported: () => boolean;
}

interface PermissionEntryState {
  supported: boolean;
  state: PermissionStateValue;
  error: string | null;
}

interface PermissionActionState {
  requesting: boolean;
  revoking: boolean;
  error: string | null;
}

const PERMISSION_KEYS: PermissionKey[] = ['camera', 'microphone', 'serial', 'filesystem'];

const getNavigator = () => (typeof navigator !== 'undefined' ? navigator : undefined);

const stopTracks = (stream: MediaStream | null | undefined) => {
  if (!stream) return;
  try {
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch {}
    });
  } catch {}
};

const PERMISSION_CONFIG: Record<PermissionKey, PermissionConfig> = {
  camera: {
    label: 'Camera',
    description:
      'Used for barcode scanners and video capture demos. Media streams are immediately released after the check.',
    docUrl: 'https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia',
    permissionName: 'camera',
    request: async () => {
      const nav = getNavigator();
      if (!nav?.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices.getUserMedia is not available in this browser.');
      }
      const stream = await nav.mediaDevices.getUserMedia({ video: true });
      stopTracks(stream);
    },
    isSupported: () => {
      const nav = getNavigator();
      return !!nav?.mediaDevices?.getUserMedia;
    },
  },
  microphone: {
    label: 'Microphone',
    description:
      'Enables simulated VoIP calls and audio spectrum visualisers. Audio streams are closed immediately after requesting access.',
    docUrl: 'https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia',
    permissionName: 'microphone',
    request: async () => {
      const nav = getNavigator();
      if (!nav?.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices.getUserMedia is not available in this browser.');
      }
      const stream = await nav.mediaDevices.getUserMedia({ audio: true });
      stopTracks(stream);
    },
    isSupported: () => {
      const nav = getNavigator();
      return !!nav?.mediaDevices?.getUserMedia;
    },
  },
  serial: {
    label: 'Serial',
    description:
      'Allows connecting to USB serial devices for hardware lab walkthroughs. Ports are closed as soon as the permission flow completes.',
    docUrl: 'https://developer.mozilla.org/docs/Web/API/Serial',
    permissionName: 'serial',
    request: async () => {
      const nav = getNavigator() as Navigator & { serial?: { requestPort: () => Promise<any> } };
      const serial = nav?.serial;
      if (!serial?.requestPort) {
        throw new Error('Web Serial API is not available in this browser.');
      }
      const port = await serial.requestPort();
      try {
        await port.close?.();
      } catch {}
    },
    isSupported: () => {
      const nav = getNavigator() as Navigator & { serial?: unknown };
      return !!nav?.serial;
    },
  },
  filesystem: {
    label: 'Persistent storage',
    description:
      'Persists emulator save files and OPFS data so they survive reloads. Requests StorageManager.persist under the hood.',
    docUrl: 'https://developer.mozilla.org/docs/Web/API/StorageManager/persist',
    permissionName: 'persistent-storage',
    request: async () => {
      const nav = getNavigator();
      if (!nav?.storage?.persist) {
        throw new Error('Persistent storage is not available in this browser.');
      }
      const granted = await nav.storage.persist();
      if (!granted) {
        throw new Error('Persistent storage request was dismissed.');
      }
    },
    isSupported: () => {
      const nav = getNavigator();
      return !!nav?.storage?.persist;
    },
  },
};

const createInitialState = (): Record<PermissionKey, PermissionEntryState> => {
  const state: Record<PermissionKey, PermissionEntryState> = {
    camera: { supported: PERMISSION_CONFIG.camera.isSupported(), state: 'unknown', error: null },
    microphone: {
      supported: PERMISSION_CONFIG.microphone.isSupported(),
      state: 'unknown',
      error: null,
    },
    serial: { supported: PERMISSION_CONFIG.serial.isSupported(), state: 'unknown', error: null },
    filesystem: {
      supported: PERMISSION_CONFIG.filesystem.isSupported(),
      state: 'unknown',
      error: null,
    },
  };
  return state;
};

const createInitialActionState = (): Record<PermissionKey, PermissionActionState> => ({
  camera: { requesting: false, revoking: false, error: null },
  microphone: { requesting: false, revoking: false, error: null },
  serial: { requesting: false, revoking: false, error: null },
  filesystem: { requesting: false, revoking: false, error: null },
});

const describeState = (state: PermissionStateValue): string => {
  switch (state) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'prompt':
      return 'pending';
    default:
      return 'updated';
  }
};

export interface UsePermissionsResult {
  permissions: PermissionDetail[];
  requestPermission: (key: PermissionKey) => Promise<PermissionActionResult>;
  revokePermission: (key: PermissionKey) => Promise<PermissionActionResult>;
  refreshPermissions: (key?: PermissionKey) => Promise<void>;
}

export const usePermissions = (): UsePermissionsResult => {
  const notifications = useContext(NotificationsContext);

  const [entries, setEntries] = useState<Record<PermissionKey, PermissionEntryState>>(createInitialState);
  const [actions, setActions] = useState<Record<PermissionKey, PermissionActionState>>(createInitialActionState);

  const navigatorInstance = getNavigator();
  const permissionsApi = navigatorInstance?.permissions;
  const canRevokeViaApi = !!permissionsApi?.revoke;

  const detachRef = useRef<Partial<Record<PermissionKey, () => void>>>({});
  const prevStatesRef = useRef<Record<PermissionKey, PermissionStateValue>>({
    camera: 'unknown',
    microphone: 'unknown',
    serial: 'unknown',
    filesystem: 'unknown',
  });
  const initializedRef = useRef(false);

  const updateEntry = useCallback(
    (key: PermissionKey, patch: Partial<PermissionEntryState>) => {
      setEntries(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...patch,
        },
      }));
    },
    [],
  );

  const updateFromStatus = useCallback(
    (key: PermissionKey, status: PermissionStatus) => {
      updateEntry(key, {
        supported: true,
        state: status.state,
        error: null,
      });
    },
    [updateEntry],
  );

  const attachStatusListener = useCallback(
    (key: PermissionKey, status: PermissionStatus) => {
      detachRef.current[key]?.();

      const handler = () => {
        updateFromStatus(key, status);
      };

      if (typeof status.addEventListener === 'function') {
        status.addEventListener('change', handler);
        detachRef.current[key] = () => {
          status.removeEventListener('change', handler);
        };
      } else {
        const bound = () => handler();
        Reflect.set(status, 'onchange', bound);
        detachRef.current[key] = () => {
          const current = Reflect.get(status, 'onchange');
          if (current === bound) {
            Reflect.set(status, 'onchange', null);
          }
        };
      }
    },
    [updateFromStatus],
  );

  const refreshPermissionInternal = useCallback(
    async (key: PermissionKey): Promise<PermissionStatus | null> => {
      const config = PERMISSION_CONFIG[key];
      const supported = config.isSupported();
      updateEntry(key, { supported });

      if (!permissionsApi?.query || !supported) {
        if (!supported) {
          updateEntry(key, { state: 'unknown', error: null });
        }
        return null;
      }

      try {
        const descriptor = { name: config.permissionName } as PermissionDescriptor;
        const status = await permissionsApi.query(descriptor);
        updateFromStatus(key, status);
        attachStatusListener(key, status);
        return status;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to read permission status';
        updateEntry(key, { state: 'unknown', error: message });
        return null;
      }
    },
    [attachStatusListener, permissionsApi, updateEntry, updateFromStatus],
  );

  useEffect(() => {
    if (!navigatorInstance) {
      initializedRef.current = true;
      return () => {};
    }

    let cancelled = false;
    const detachHandles = detachRef.current;

    const run = async () => {
      for (const key of PERMISSION_KEYS) {
        if (cancelled) break;
        await refreshPermissionInternal(key);
      }
      if (!cancelled) {
        initializedRef.current = true;
      }
    };

    run();

    return () => {
      cancelled = true;
      PERMISSION_KEYS.forEach(key => {
        detachHandles[key]?.();
        detachHandles[key] = undefined;
      });
    };
  }, [navigatorInstance, refreshPermissionInternal]);

  useEffect(() => {
    const notificationApi = notifications?.pushNotification;
    const nextStates: Partial<Record<PermissionKey, PermissionStateValue>> = {};

    const changed: Array<{ key: PermissionKey; state: PermissionStateValue }> = [];
    PERMISSION_KEYS.forEach(key => {
      const currentState = entries[key].state;
      const previous = prevStatesRef.current[key];
      nextStates[key] = currentState;
      if (previous !== currentState) {
        changed.push({ key, state: currentState });
      }
    });

    prevStatesRef.current = {
      camera: nextStates.camera ?? 'unknown',
      microphone: nextStates.microphone ?? 'unknown',
      serial: nextStates.serial ?? 'unknown',
      filesystem: nextStates.filesystem ?? 'unknown',
    };

    if (!notificationApi || !initializedRef.current) {
      return;
    }

    changed
      .filter(({ state }) => state !== 'unknown')
      .forEach(({ key, state }) => {
        const config = PERMISSION_CONFIG[key];
        const statusDescription = describeState(state);
        notificationApi({
          appId: 'system-permissions',
          title: `${config.label} permission ${statusDescription}`,
          body: `Status is now “${state}”. Read why we ask: ${config.docUrl}`,
          hints: {
            source: 'permissions-panel',
            permission: key,
            state,
          },
        });
      });
  }, [entries, notifications]);

  const setActionState = useCallback(
    (key: PermissionKey, patch: Partial<PermissionActionState>) => {
      setActions(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...patch,
        },
      }));
    },
    [],
  );

  const requestPermission = useCallback(
    async (key: PermissionKey): Promise<PermissionActionResult> => {
      const config = PERMISSION_CONFIG[key];
      if (!config.request) {
        const error = 'Requesting this permission is not supported on this browser.';
        setActionState(key, { error });
        return { ok: false, error };
      }

      setActionState(key, { requesting: true, error: null });
      try {
        await config.request();
        const status = await refreshPermissionInternal(key);
        const state = status?.state ?? entries[key].state;
        return { ok: true, state };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Permission request failed.';
        setActionState(key, { error: message });
        return { ok: false, error: message };
      } finally {
        setActionState(key, { requesting: false });
      }
    },
    [entries, refreshPermissionInternal, setActionState],
  );

  const revokePermission = useCallback(
    async (key: PermissionKey): Promise<PermissionActionResult> => {
      const config = PERMISSION_CONFIG[key];
      const hasCustomRevoke = !!config.revoke;
      if (!hasCustomRevoke && !canRevokeViaApi) {
        const error = 'Revoking this permission is not supported on this browser.';
        setActionState(key, { error });
        return { ok: false, error };
      }

      setActionState(key, { revoking: true, error: null });
      try {
        if (config.revoke) {
          await config.revoke();
        } else if (permissionsApi?.revoke) {
          const descriptor = { name: config.permissionName } as PermissionDescriptor;
          await permissionsApi.revoke(descriptor);
        }
        const status = await refreshPermissionInternal(key);
        const state = status?.state ?? entries[key].state;
        return { ok: true, state };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to revoke permission.';
        setActionState(key, { error: message });
        return { ok: false, error: message };
      } finally {
        setActionState(key, { revoking: false });
      }
    },
    [canRevokeViaApi, entries, permissionsApi, refreshPermissionInternal, setActionState],
  );

  const refreshPermissions = useCallback(
    async (key?: PermissionKey) => {
      if (key) {
        await refreshPermissionInternal(key);
        return;
      }
      await Promise.all(PERMISSION_KEYS.map(permission => refreshPermissionInternal(permission)));
    },
    [refreshPermissionInternal],
  );

  const permissions = useMemo<PermissionDetail[]>(() => {
    return PERMISSION_KEYS.map(key => {
      const config = PERMISSION_CONFIG[key];
      const entry = entries[key];
      const actionState = actions[key];
      const canRequest = !!config.request && entry.supported;
      const canRevoke = (config.revoke ? true : canRevokeViaApi) && entry.supported;
      const error = actionState.error ?? entry.error;

      return {
        key,
        label: config.label,
        description: config.description,
        docUrl: config.docUrl,
        supported: entry.supported,
        state: entry.state,
        error,
        canRequest,
        canRevoke,
        requesting: actionState.requesting,
        revoking: actionState.revoking,
        request: () => requestPermission(key),
        revoke: () => revokePermission(key),
      } satisfies PermissionDetail;
    });
  }, [actions, canRevokeViaApi, entries, requestPermission, revokePermission]);

  return {
    permissions,
    requestPermission,
    revokePermission,
    refreshPermissions,
  };
};

export default usePermissions;

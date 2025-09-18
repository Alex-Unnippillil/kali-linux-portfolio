'use client';

import { useSyncExternalStore } from 'react';

export type PrivacyPermission = 'camera' | 'microphone' | 'location' | 'clipboard';

export interface AppPrivacyEntry {
  id: string;
  name: string;
  icon: string;
  summary: string;
  permissions: Record<PrivacyPermission, boolean>;
}

const PERMISSIONS: PrivacyPermission[] = ['camera', 'microphone', 'location', 'clipboard'];

const INITIAL_REGISTRY: AppPrivacyEntry[] = [
  {
    id: 'camera',
    name: 'Camera',
    icon: '/themes/Yaru/apps/project-gallery.svg',
    summary: 'Captures still photos and overlays annotations in-memory.',
    permissions: {
      camera: true,
      microphone: false,
      location: false,
      clipboard: false,
    },
  },
  {
    id: 'qr',
    name: 'QR Tool',
    icon: '/themes/Yaru/apps/qr.svg',
    summary: 'Scans QR codes locally and offers optional clipboard copy.',
    permissions: {
      camera: true,
      microphone: false,
      location: false,
      clipboard: true,
    },
  },
  {
    id: 'screen-recorder',
    name: 'Screen Recorder',
    icon: '/themes/Yaru/apps/screen-recorder.svg',
    summary: 'Records the current tab and system audio without uploading files.',
    permissions: {
      camera: false,
      microphone: true,
      location: false,
      clipboard: false,
    },
  },
  {
    id: 'security-tools',
    name: 'Security Tools',
    icon: '/themes/Yaru/apps/project-gallery.svg',
    summary: 'Static lab fixtures with copy-only terminal output.',
    permissions: {
      camera: false,
      microphone: false,
      location: false,
      clipboard: true,
    },
  },
];

const registry = new Map<string, AppPrivacyEntry>();
let snapshotCache: AppPrivacyEntry[] = [];
const fallbackCache = new Map<string, AppPrivacyEntry>();

function cloneEntry(entry: AppPrivacyEntry): AppPrivacyEntry {
  return {
    ...entry,
    permissions: { ...entry.permissions },
  };
}

function refreshSnapshot() {
  snapshotCache = Array.from(registry.values()).map(cloneEntry);
}

function initialiseRegistry() {
  registry.clear();
  for (const entry of INITIAL_REGISTRY) {
    registry.set(entry.id, cloneEntry(entry));
  }
  refreshSnapshot();
  fallbackCache.clear();
}

initialiseRegistry();

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppPrivacyEntry[] {
  return snapshotCache;
}

function getEntrySnapshot(appId: string): AppPrivacyEntry {
  const stored = snapshotCache.find((entry) => entry.id === appId);
  if (stored) return stored;
  let fallback = fallbackCache.get(appId);
  if (!fallback) {
    fallback = {
      id: appId,
      name: appId,
      icon: '',
      summary: 'No registered privacy requirements.',
      permissions: PERMISSIONS.reduce(
        (acc, perm) => {
          acc[perm] = false;
          return acc;
        },
        {} as Record<PrivacyPermission, boolean>,
      ),
    };
    fallbackCache.set(appId, fallback);
  }
  return fallback;
}

export function usePrivacyRegistry() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAppPrivacy(appId: string) {
  return useSyncExternalStore(subscribe, () => getEntrySnapshot(appId), () => getEntrySnapshot(appId));
}

export function setAppPermission(appId: string, permission: PrivacyPermission, granted: boolean) {
  const entry = registry.get(appId);
  if (!entry) return;
  if (entry.permissions[permission] === granted) return;
  registry.set(appId, {
    ...entry,
    permissions: { ...entry.permissions, [permission]: granted },
  });
  refreshSnapshot();
  emit();
}

export function isPermissionGranted(appId: string, permission: PrivacyPermission) {
  return registry.get(appId)?.permissions[permission] ?? false;
}

export function resetPrivacyRegistry() {
  initialiseRegistry();
  refreshSnapshot();
  emit();
}

export const PRIVACY_PERMISSIONS = PERMISSIONS;
export const initialPrivacyRegistry = snapshotCache.map(cloneEntry);

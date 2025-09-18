'use client';

import { useCallback, useMemo } from 'react';
import usePersistentState from './usePersistentState';
import type { DesktopSession, SessionWindow } from './useSession';
import { defaults } from '../utils/settingsStore';
import { safeLocalStorage } from '../utils/safeStorage';

export const WORKSPACE_SCHEMA_VERSION = 1;

const STORAGE_KEY = 'desktop-workspaces';
const EXPORT_CACHE_KEY = 'desktop-workspaces::export';
const IMPORT_CACHE_KEY = 'desktop-workspaces::import';

export type ImportMode = 'merge' | 'replace';

export interface WorkspaceEvidenceFile {
  id: string;
  name: string;
  mimeType: string;
  dataUrl?: string;
  assetKey?: string;
}

export interface WorkspaceEvidence {
  id: string;
  note?: string;
  tags: string[];
  capturedAt: string;
  file?: WorkspaceEvidenceFile;
}

export interface WorkspaceSnapshot {
  id: string;
  name: string;
  session: DesktopSession;
  wallpaper: string;
  wallpaperAssetKey?: string;
  customWallpaperDataUrl?: string;
  capturedEvidence: WorkspaceEvidence[];
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceStore {
  version: number;
  activeId: string | null;
  workspaces: WorkspaceSnapshot[];
}

interface WorkspaceAsset {
  fileName: string;
  mimeType: string;
  data: string; // base64 encoded
}

interface WorkspaceBundle {
  schemaVersion: number;
  exportedAt: string;
  workspaces: WorkspaceSnapshot[];
  assets: {
    wallpapers: Record<string, WorkspaceAsset>;
    evidence: Record<string, WorkspaceAsset>;
  };
}

const defaultSession: DesktopSession = {
  windows: [],
  wallpaper: defaults.wallpaper,
  dock: [],
};

const createDefaultStore = (): WorkspaceStore => ({
  version: WORKSPACE_SCHEMA_VERSION,
  activeId: null,
  workspaces: [],
});

const defaultStore: WorkspaceStore = createDefaultStore();

const isDesktopSession = (value: unknown): value is DesktopSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as DesktopSession;
  return (
    Array.isArray(session.windows) &&
    typeof session.wallpaper === 'string' &&
    Array.isArray(session.dock)
  );
};

const isWorkspaceEvidenceFile = (
  value: unknown,
): value is WorkspaceEvidenceFile => {
  if (!value || typeof value !== 'object') return false;
  const file = value as WorkspaceEvidenceFile;
  return (
    typeof file.id === 'string' &&
    typeof file.name === 'string' &&
    typeof file.mimeType === 'string'
  );
};

const isWorkspaceEvidence = (
  value: unknown,
): value is WorkspaceEvidence => {
  if (!value || typeof value !== 'object') return false;
  const ev = value as WorkspaceEvidence;
  return (
    typeof ev.id === 'string' &&
    Array.isArray(ev.tags) &&
    typeof ev.capturedAt === 'string' &&
    (!ev.file || isWorkspaceEvidenceFile(ev.file))
  );
};

const isWorkspaceSnapshot = (
  value: unknown,
): value is WorkspaceSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const ws = value as WorkspaceSnapshot;
  return (
    typeof ws.id === 'string' &&
    typeof ws.name === 'string' &&
    typeof ws.wallpaper === 'string' &&
    typeof ws.createdAt === 'string' &&
    typeof ws.updatedAt === 'string' &&
    isDesktopSession(ws.session) &&
    Array.isArray(ws.capturedEvidence) &&
    ws.capturedEvidence.every(isWorkspaceEvidence)
  );
};

const isWorkspaceStore = (value: unknown): value is WorkspaceStore => {
  if (!value || typeof value !== 'object') return false;
  const store = value as WorkspaceStore;
  if (typeof store.version !== 'number') return false;
  if (store.activeId !== null && typeof store.activeId !== 'string') return false;
  if (!Array.isArray(store.workspaces)) return false;
  return store.workspaces.every(isWorkspaceSnapshot);
};

const isWorkspaceBundle = (value: unknown): value is WorkspaceBundle => {
  if (!value || typeof value !== 'object') return false;
  const bundle = value as WorkspaceBundle;
  if (typeof bundle.schemaVersion !== 'number') return false;
  if (typeof bundle.exportedAt !== 'string') return false;
  if (!Array.isArray(bundle.workspaces)) return false;
  if (!bundle.assets || typeof bundle.assets !== 'object') return false;
  const { wallpapers, evidence } = bundle.assets;
  const wallpaperValid =
    wallpapers &&
    typeof wallpapers === 'object' &&
    Object.values(wallpapers).every(isWorkspaceAsset);
  const evidenceValid =
    evidence &&
    typeof evidence === 'object' &&
    Object.values(evidence).every(isWorkspaceAsset);
  return (
    wallpaperValid &&
    evidenceValid &&
    bundle.workspaces.every(isWorkspaceSnapshot)
  );
};

function isWorkspaceAsset(value: unknown): value is WorkspaceAsset {
  if (!value || typeof value !== 'object') return false;
  const asset = value as WorkspaceAsset;
  return (
    typeof asset.fileName === 'string' &&
    typeof asset.mimeType === 'string' &&
    typeof asset.data === 'string'
  );
}

const generateId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

const cloneWorkspace = (workspace: WorkspaceSnapshot): WorkspaceSnapshot =>
  JSON.parse(JSON.stringify(workspace)) as WorkspaceSnapshot;

const cloneSession = (session: DesktopSession): DesktopSession => ({
  windows: session.windows.map((win: SessionWindow) => ({ ...win })),
  wallpaper: session.wallpaper,
  dock: [...session.dock],
});

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

const extensionFromMime = (mime: string) => {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'application/json') return 'json';
  const slash = mime.indexOf('/');
  return slash >= 0 ? mime.slice(slash + 1) : 'bin';
};

const ensureExtension = (fileName: string, mime: string) => {
  if (fileName.includes('.')) return fileName;
  const ext = extensionFromMime(mime);
  return `${fileName}.${ext}`;
};

const wallpaperPath = (identifier: string) => {
  if (identifier.startsWith('data:')) return identifier;
  if (/^https?:/i.test(identifier)) return identifier;
  if (identifier.startsWith('/')) return identifier;
  return `/wallpapers/${identifier}.webp`;
};

const resolveWallpaperAsset = async (
  workspace: WorkspaceSnapshot,
  bundle: WorkspaceBundle,
) => {
  const assetKey = workspace.wallpaperAssetKey ?? workspace.wallpaper;
  if (!assetKey || bundle.assets.wallpapers[assetKey]) return;

  if (workspace.customWallpaperDataUrl) {
    const parsed = parseDataUrl(workspace.customWallpaperDataUrl);
    if (parsed) {
      bundle.assets.wallpapers[assetKey] = {
        fileName: ensureExtension(assetKey, parsed.mimeType),
        mimeType: parsed.mimeType,
        data: parsed.base64,
      };
    }
    return;
  }

  if (workspace.wallpaper.startsWith('data:')) {
    const parsed = parseDataUrl(workspace.wallpaper);
    if (parsed) {
      bundle.assets.wallpapers[assetKey] = {
        fileName: ensureExtension(assetKey, parsed.mimeType),
        mimeType: parsed.mimeType,
        data: parsed.base64,
      };
    }
    return;
  }

  if (typeof window === 'undefined') return;
  try {
    const response = await fetch(wallpaperPath(workspace.wallpaper));
    if (!response.ok) return;
    const blob = await response.blob();
    const mimeType = blob.type || 'application/octet-stream';
    const base64 = await blobToBase64(blob);
    bundle.assets.wallpapers[assetKey] = {
      fileName: ensureExtension(assetKey, mimeType),
      mimeType,
      data: base64,
    };
  } catch {
    // swallow errors; missing asset will just be omitted
  }
};

const evidenceStorageKey = (assetKey: string) => `workspace-evidence::${assetKey}`;

const resolveEvidenceAsset = async (
  evidence: WorkspaceEvidence,
  bundle: WorkspaceBundle,
) => {
  if (!evidence.file) return;
  const assetKey = evidence.file.assetKey ?? evidence.file.id;
  if (!assetKey || bundle.assets.evidence[assetKey]) return;

  if (evidence.file.dataUrl) {
    const parsed = parseDataUrl(evidence.file.dataUrl);
    if (parsed) {
      bundle.assets.evidence[assetKey] = {
        fileName: ensureExtension(
          evidence.file.name || assetKey,
          parsed.mimeType,
        ),
        mimeType: parsed.mimeType,
        data: parsed.base64,
      };
      return;
    }
  }

  const cached = safeLocalStorage?.getItem(evidenceStorageKey(assetKey));
  if (cached) {
    const parsed = parseDataUrl(cached);
    if (parsed) {
      bundle.assets.evidence[assetKey] = {
        fileName: ensureExtension(
          evidence.file.name || assetKey,
          parsed.mimeType,
        ),
        mimeType: parsed.mimeType,
        data: parsed.base64,
      };
    }
  }
};

const hydrateWorkspace = (
  workspace: WorkspaceSnapshot,
  assets: WorkspaceBundle['assets'],
): WorkspaceSnapshot => {
  const clone = cloneWorkspace(workspace);
  if (clone.wallpaperAssetKey) {
    const asset = assets.wallpapers[clone.wallpaperAssetKey];
    if (asset) {
      const dataUrl = `data:${asset.mimeType};base64,${asset.data}`;
      clone.customWallpaperDataUrl = dataUrl;
    }
  }

  clone.capturedEvidence = clone.capturedEvidence.map((entry) => {
    if (!entry.file) return entry;
    const key = entry.file.assetKey ?? entry.file.id;
    if (!key) return entry;
    const asset = assets.evidence[key];
    if (!asset) return entry;
    const dataUrl = `data:${asset.mimeType};base64,${asset.data}`;
    safeLocalStorage?.setItem(evidenceStorageKey(key), dataUrl);
    return {
      ...entry,
      file: {
        ...entry.file,
        dataUrl,
        name: entry.file.name || asset.fileName,
        mimeType: asset.mimeType,
        assetKey: key,
      },
    };
  });

  return clone;
};

const mergeWorkspaces = (
  existing: WorkspaceSnapshot[],
  incoming: WorkspaceSnapshot[],
) => {
  const map = new Map<string, WorkspaceSnapshot>();
  existing.forEach((ws) => map.set(ws.id, ws));
  incoming.forEach((ws) => map.set(ws.id, ws));
  return Array.from(map.values());
};

export default function useWorkspaces() {
  const [store, setStore] = usePersistentState<WorkspaceStore>(
    STORAGE_KEY,
    defaultStore,
    isWorkspaceStore,
  );

  const workspaces = useMemo(
    () => store.workspaces.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [store.workspaces],
  );

  const activeWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === store.activeId) ?? null,
    [workspaces, store.activeId],
  );

  const createWorkspace = useCallback(
    (overrides?: Partial<Omit<WorkspaceSnapshot, 'id' | 'createdAt' | 'updatedAt'>>),
  ) => {
    const now = new Date().toISOString();
    const capturedEvidence =
      overrides?.capturedEvidence?.map(cloneWorkspaceEvidence) || [];

    capturedEvidence.forEach((entry) => {
      const key = entry.file?.assetKey ?? entry.file?.id;
      if (key && entry.file?.dataUrl) {
        safeLocalStorage?.setItem(evidenceStorageKey(key), entry.file.dataUrl);
      }
    });

    const workspace: WorkspaceSnapshot = {
      id: generateId('workspace'),
      name:
        overrides?.name?.trim() ||
        `Workspace ${store.workspaces.length + 1 || 1}`,
      session: overrides?.session
        ? cloneSession(overrides.session)
        : cloneSession(defaultSession),
      wallpaper: overrides?.wallpaper || defaultSession.wallpaper,
      wallpaperAssetKey: overrides?.wallpaperAssetKey,
      customWallpaperDataUrl: overrides?.customWallpaperDataUrl,
      capturedEvidence,
      createdAt: now,
      updatedAt: now,
    };

    setStore((prev) => ({
      version: WORKSPACE_SCHEMA_VERSION,
      activeId: workspace.id,
      workspaces: [...prev.workspaces, workspace],
    }));

    return workspace.id;
  }, [setStore, store.workspaces.length]);

  const updateWorkspace = useCallback(
    (id: string, updates: Partial<Omit<WorkspaceSnapshot, 'id' | 'createdAt'>>),
  ) => {
    const now = new Date().toISOString();
    setStore((prev) => ({
      version: WORKSPACE_SCHEMA_VERSION,
      activeId: prev.activeId,
      workspaces: prev.workspaces.map((ws) => {
        if (ws.id !== id) return ws;
        const providedEvidence = 'capturedEvidence' in updates;
        const nextEvidence = updates.capturedEvidence
          ? updates.capturedEvidence.map(cloneWorkspaceEvidence)
          : providedEvidence
            ? []
            : ws.capturedEvidence;

        if (providedEvidence) {
          ws.capturedEvidence.forEach((entry) => {
            const key = entry.file?.assetKey ?? entry.file?.id;
            if (key) {
              safeLocalStorage?.removeItem(evidenceStorageKey(key));
            }
          });
        }

        nextEvidence.forEach((entry) => {
          const key = entry.file?.assetKey ?? entry.file?.id;
          if (key && entry.file?.dataUrl) {
            safeLocalStorage?.setItem(
              evidenceStorageKey(key),
              entry.file.dataUrl,
            );
          }
        });

        return {
          ...ws,
          ...updates,
          capturedEvidence: nextEvidence,
          session: updates.session ? cloneSession(updates.session) : ws.session,
          updatedAt: now,
        };
      }),
    }));
  }, [setStore]);

  const removeWorkspace = useCallback((id: string) => {
    setStore((prev) => {
      const target = prev.workspaces.find((ws) => ws.id === id);
      if (target) {
        target.capturedEvidence.forEach((entry) => {
          const key = entry.file?.assetKey ?? entry.file?.id;
          if (key) {
            safeLocalStorage?.removeItem(evidenceStorageKey(key));
          }
        });
      }
      const next = prev.workspaces.filter((ws) => ws.id !== id);
      const activeId = prev.activeId === id ? next[0]?.id ?? null : prev.activeId;
      return {
        version: WORKSPACE_SCHEMA_VERSION,
        activeId,
        workspaces: next,
      };
    });
  }, [setStore]);

  const setActiveWorkspace = useCallback(
    (id: string | null) => {
      setStore((prev) => {
        if (id && !prev.workspaces.some((ws) => ws.id === id)) {
          return prev;
        }
        return { ...prev, activeId: id };
      });
    },
    [setStore],
  );

  const exportWorkspaces = useCallback(
    async (ids?: string[]) => {
      const selected = ids?.length
        ? workspaces.filter((ws) => ids.includes(ws.id))
        : workspaces;
      if (!selected.length) {
        throw new Error('No workspaces available to export.');
      }

      const clones = selected.map(cloneWorkspace);
      const bundle: WorkspaceBundle = {
        schemaVersion: WORKSPACE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        workspaces: clones.map((ws) => ({
          ...ws,
          capturedEvidence: ws.capturedEvidence.map((entry) => {
            if (!entry.file) return entry;
            const assetKey = entry.file.assetKey ?? entry.file.id ?? generateId('evidence');
            return {
              ...entry,
              file: {
                ...entry.file,
                assetKey,
              },
            };
          }),
        })),
        assets: {
          wallpapers: {},
          evidence: {},
        },
      };

      await Promise.all(
        bundle.workspaces.map(async (workspace) => {
          await resolveWallpaperAsset(workspace, bundle);
          await Promise.all(
            workspace.capturedEvidence.map((entry) =>
              resolveEvidenceAsset(entry, bundle),
            ),
          );
        }),
      );

      const serialized = JSON.stringify(bundle, null, 2);
      safeLocalStorage?.setItem(EXPORT_CACHE_KEY, serialized);

      try {
        const blob = new Blob([serialized], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const name =
          bundle.workspaces.length === 1
            ? bundle.workspaces[0].name.replace(/\s+/g, '-').toLowerCase()
            : 'workspaces';
        a.href = url;
        a.download = `${name}-bundle.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } finally {
        safeLocalStorage?.removeItem(EXPORT_CACHE_KEY);
      }
    },
    [workspaces],
  );

  const importWorkspaces = useCallback(
    async (input: File | string, mode: ImportMode = 'merge') => {
      const text =
        typeof input === 'string' ? input : await input.text();
      safeLocalStorage?.setItem(IMPORT_CACHE_KEY, text);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        safeLocalStorage?.removeItem(IMPORT_CACHE_KEY);
        throw new Error('Invalid workspace bundle.');
      }

      if (!isWorkspaceBundle(parsed)) {
        safeLocalStorage?.removeItem(IMPORT_CACHE_KEY);
        throw new Error('Unrecognized workspace bundle format.');
      }

      if (parsed.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
        safeLocalStorage?.removeItem(IMPORT_CACHE_KEY);
        throw new Error(
          `Unsupported workspace schema version: ${parsed.schemaVersion}`,
        );
      }

      const hydrated = parsed.workspaces.map((ws) =>
        hydrateWorkspace(ws, parsed.assets),
      );
      const incomingIds = new Set(hydrated.map((ws) => ws.id));

      setStore((prev) => {
        if (mode === 'replace') {
          prev.workspaces.forEach((ws) => {
            ws.capturedEvidence.forEach((entry) => {
              const key = entry.file?.assetKey ?? entry.file?.id;
              if (key) {
                safeLocalStorage?.removeItem(evidenceStorageKey(key));
              }
            });
          });
        } else {
          prev.workspaces.forEach((ws) => {
            if (!incomingIds.has(ws.id)) return;
            ws.capturedEvidence.forEach((entry) => {
              const key = entry.file?.assetKey ?? entry.file?.id;
              if (key) {
                safeLocalStorage?.removeItem(evidenceStorageKey(key));
              }
            });
          });
        }
        const workspacesList =
          mode === 'replace'
            ? hydrated
            : mergeWorkspaces(prev.workspaces, hydrated);
        const activeId =
          mode === 'replace'
            ? workspacesList[0]?.id ?? null
            : prev.activeId && workspacesList.some((ws) => ws.id === prev.activeId)
              ? prev.activeId
              : hydrated[0]?.id ?? workspacesList[0]?.id ?? null;

        return {
          version: WORKSPACE_SCHEMA_VERSION,
          activeId,
          workspaces: workspacesList,
        };
      });

      safeLocalStorage?.removeItem(IMPORT_CACHE_KEY);
    },
    [setStore],
  );

  const clear = useCallback(() => {
    setStore((prev) => {
      prev.workspaces.forEach((ws) => {
        ws.capturedEvidence.forEach((entry) => {
          const key = entry.file?.assetKey ?? entry.file?.id;
          if (key) {
            safeLocalStorage?.removeItem(evidenceStorageKey(key));
          }
        });
      });
      return createDefaultStore();
    });
  }, [setStore]);

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId: store.activeId,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    setActiveWorkspace,
    exportWorkspaces,
    importWorkspaces,
    clear,
  };
}

function cloneWorkspaceEvidence(value: WorkspaceEvidence): WorkspaceEvidence {
  return {
    ...value,
    tags: [...value.tags],
    file: value.file ? { ...value.file } : undefined,
  };
}


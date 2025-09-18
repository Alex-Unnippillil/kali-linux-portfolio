import { hasStorage } from './env';

export const safeLocalStorage: Storage | undefined =
  hasStorage ? localStorage : undefined;

export type InstallPhase =
  | 'pending'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'completed'
  | 'failed';

export interface InstallSnapshot {
  id: string;
  pluginId: string;
  phase: InstallPhase;
  packages: string[];
  completedPackages: string[];
  updatedAt: number;
  error?: string;
}

const INSTALL_KEY = 'installer/snapshots';

const parseSnapshots = (): InstallSnapshot[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(INSTALL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        ...item,
        packages: Array.isArray(item?.packages) ? [...item.packages] : [],
        completedPackages: Array.isArray(item?.completedPackages)
          ? [...item.completedPackages]
          : [],
        phase: item?.phase ?? 'pending',
        updatedAt: typeof item?.updatedAt === 'number' ? item.updatedAt : Date.now(),
      }))
      .filter((item): item is InstallSnapshot => !!item.id && !!item.pluginId);
  } catch {
    return [];
  }
};

const writeSnapshots = (snapshots: InstallSnapshot[]) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(INSTALL_KEY, JSON.stringify(snapshots));
  } catch {
    /* ignore */
  }
};

export const loadInstallSnapshots = (): InstallSnapshot[] => parseSnapshots();

export const saveInstallSnapshot = (snapshot: InstallSnapshot): InstallSnapshot[] => {
  const all = parseSnapshots();
  const next = { ...snapshot, packages: [...snapshot.packages], completedPackages: [...snapshot.completedPackages] };
  const index = all.findIndex((item) => item.id === snapshot.id);
  if (index >= 0) {
    all[index] = next;
  } else {
    all.push(next);
  }
  writeSnapshots(all);
  return all;
};

export const removeInstallSnapshot = (id: string): InstallSnapshot[] => {
  const remaining = parseSnapshots().filter((item) => item.id !== id);
  writeSnapshots(remaining);
  return remaining;
};

export const clearInstallSnapshots = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(INSTALL_KEY);
  } catch {
    /* ignore */
  }
};

import { useCallback, useEffect, useMemo, useState } from 'react';
import packagesCatalog from '../data/packages/index.json';
import { safeLocalStorage } from '../utils/safeStorage';

export interface PackageVersion {
  version: string;
  releaseDate?: string;
  notes?: string;
}

export interface PackageInfo {
  id: string;
  name: string;
  summary: string;
  description?: string;
  category?: string;
  homepage?: string;
  maintainer?: string;
  size?: string;
  defaultVersion?: string;
  dependencies?: string[];
  versions: PackageVersion[];
}

export interface PackageWithState extends PackageInfo {
  selectedVersion: string;
  effectiveVersion: string;
  pinnedVersion?: string;
  queued: boolean;
}

export interface DryRunPlanItem {
  id: string;
  name: string;
  summary: string;
  version: string;
  pinned: boolean;
  commands: string[];
}

interface UsePackageStoreResult {
  packages: PackageWithState[];
  selectedPackage: PackageWithState | null;
  selectedId: string;
  setSelectedId: (id: string) => void;
  setVersion: (pkgId: string, version: string) => void;
  pins: Record<string, string>;
  pinVersion: (pkgId: string, version: string) => void;
  clearPin: (pkgId: string) => void;
  queue: string[];
  toggleQueued: (pkgId: string) => void;
  plan: DryRunPlanItem[];
}

const PACKAGE_PIN_STORAGE_KEY = 'package-manager:pins';

type PackageMap = Map<string, PackageInfo>;

type Pins = Record<string, string>;

type VersionSelections = Record<string, string>;

const catalog: PackageInfo[] = packagesCatalog as PackageInfo[];

const loadPins = (): Pins => {
  if (!safeLocalStorage) return {};
  try {
    const stored = safeLocalStorage.getItem(PACKAGE_PIN_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return parsed as Pins;
    }
    return {};
  } catch {
    return {};
  }
};

const createInitialSelections = (map: PackageMap): VersionSelections => {
  const initial: VersionSelections = {};
  map.forEach((pkg, id) => {
    initial[id] = pkg.defaultVersion ?? pkg.versions[0]?.version ?? '';
  });
  return initial;
};

export default function usePackageStore(): UsePackageStoreResult {
  const packageMap = useMemo<PackageMap>(() => {
    const map: PackageMap = new Map();
    for (const pkg of catalog) {
      map.set(pkg.id, pkg);
    }
    return map;
  }, []);

  const [selectedId, setSelectedId] = useState<string>(() => catalog[0]?.id ?? '');
  const [selections, setSelections] = useState<VersionSelections>(() =>
    createInitialSelections(packageMap)
  );
  const [pins, setPins] = useState<Pins>(() => loadPins());
  const [queue, setQueue] = useState<string[]>(() => (catalog[0]?.id ? [catalog[0].id] : []));

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(PACKAGE_PIN_STORAGE_KEY, JSON.stringify(pins));
    } catch {
      // Ignore persistence errors (storage may be full or disabled)
    }
  }, [pins]);

  const getDefaultVersion = useCallback(
    (pkgId: string) => {
      const pkg = packageMap.get(pkgId);
      return pkg?.defaultVersion ?? pkg?.versions[0]?.version ?? '';
    },
    [packageMap]
  );

  const getSelectedVersion = useCallback(
    (pkgId: string) => selections[pkgId] ?? getDefaultVersion(pkgId),
    [selections, getDefaultVersion]
  );

  const getEffectiveVersion = useCallback(
    (pkgId: string) => pins[pkgId] ?? getSelectedVersion(pkgId),
    [pins, getSelectedVersion]
  );

  const setVersion = useCallback((pkgId: string, version: string) => {
    setSelections((prev) => {
      if (prev[pkgId] === version) return prev;
      return { ...prev, [pkgId]: version };
    });
  }, []);

  const pinVersion = useCallback((pkgId: string, version: string) => {
    setPins((prev) => {
      if (prev[pkgId] === version) return prev;
      return { ...prev, [pkgId]: version };
    });
  }, []);

  const clearPin = useCallback((pkgId: string) => {
    setPins((prev) => {
      if (!(pkgId in prev)) return prev;
      const next = { ...prev };
      delete next[pkgId];
      return next;
    });
  }, []);

  const toggleQueued = useCallback((pkgId: string) => {
    setQueue((prev) => {
      if (prev.includes(pkgId)) {
        const next = prev.filter((id) => id !== pkgId);
        return next.length ? next : [];
      }
      return [...prev, pkgId];
    });
  }, []);

  const packagesWithState = useMemo<PackageWithState[]>(() =>
    catalog.map((pkg) => ({
      ...pkg,
      selectedVersion: getSelectedVersion(pkg.id),
      effectiveVersion: getEffectiveVersion(pkg.id),
      pinnedVersion: pins[pkg.id],
      queued: queue.includes(pkg.id),
    })),
    [getEffectiveVersion, getSelectedVersion, pins, queue]
  );

  const selectedPackage = useMemo<PackageWithState | null>(() => {
    if (!selectedId) return null;
    return packagesWithState.find((pkg) => pkg.id === selectedId) ?? null;
  }, [packagesWithState, selectedId]);

  const plan = useMemo<DryRunPlanItem[]>(() => {
    const targets = queue.length ? queue : selectedId ? [selectedId] : [];
    return targets
      .map((id) => {
        const pkg = packageMap.get(id);
        if (!pkg) return null;
        const version = getEffectiveVersion(id);
        const pinned = Boolean(pins[id]);
        const versionLabel = version || 'latest';
        const commands: string[] = [
          `# Inspect available versions for ${pkg.id}`,
          `apt-cache policy ${pkg.id}`,
          `# Simulate installing ${pkg.id}${version ? `=${version}` : ''}`,
          `sudo apt-get install ${pkg.id}${version ? `=${version}` : ''} --dry-run`,
        ];
        if (pkg.dependencies?.length) {
          commands.push(`# Dependencies: ${pkg.dependencies.join(', ')}`);
        }
        return {
          id,
          name: pkg.name,
          summary: pkg.summary,
          version: versionLabel,
          pinned,
          commands,
        } satisfies DryRunPlanItem;
      })
      .filter((item): item is DryRunPlanItem => item !== null);
  }, [queue, selectedId, packageMap, getEffectiveVersion, pins]);

  return {
    packages: packagesWithState,
    selectedPackage,
    selectedId,
    setSelectedId,
    setVersion,
    pins,
    pinVersion,
    clearPin,
    queue,
    toggleQueued,
    plan,
  };
}

export { PACKAGE_PIN_STORAGE_KEY };

export interface PackageManifest {
  name: string;
  depends?: string[];
  description?: string;
}

export type PackageRepository = Record<string, PackageManifest>;

export type PackageReason =
  | { type: 'explicit' }
  | { type: 'dependency'; via: string };

export type PackageActionType = 'install' | 'already-installed';

export interface PackageAction {
  name: string;
  action: PackageActionType;
  reason: PackageReason;
}

export interface MissingDependency {
  name: string;
  requiredBy: string | null;
}

export interface PackagePlan {
  actions: PackageAction[];
  missing: MissingDependency[];
  cycles: string[];
}

export interface PackagePlannerRequest {
  install: string[];
  installed?: string[];
  repository: PackageRepository;
}

const normalizeDepends = (depends?: string[]): string[] => {
  if (!depends) return [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  depends.forEach((dep) => {
    const id = dep.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  });
  return ordered;
};

const applyReason = (
  map: Map<string, PackageReason>,
  pkg: string,
  reason: PackageReason,
) => {
  const current = map.get(pkg);
  if (!current) {
    map.set(pkg, reason);
    return;
  }
  if (current.type === 'dependency' && reason.type === 'explicit') {
    map.set(pkg, reason);
  }
};

export const describeReason = (reason: PackageReason): string => {
  if (reason.type === 'dependency') {
    return `Required by ${reason.via}`;
  }
  return 'Requested by user';
};

export function resolvePackagePlan({
  install,
  installed = [],
  repository,
}: PackagePlannerRequest): PackagePlan {
  const installedSet = new Set(installed.map((name) => name.trim()).filter(Boolean));
  const dedupedInstall = Array.from(new Set(install.map((name) => name.trim()).filter(Boolean)));

  const reasonMap = new Map<string, PackageReason>();
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];
  const missing = new Map<string, string | null>();
  const cycleMessages = new Set<string>();
  const actionOrder: { name: string; action: PackageActionType }[] = [];

  const visit = (pkg: string, parent: string | null) => {
    const manifest = repository[pkg];
    applyReason(
      reasonMap,
      pkg,
      parent ? { type: 'dependency', via: parent } : { type: 'explicit' },
    );

    if (visited.has(pkg)) return;

    if (visiting.has(pkg)) {
      const idx = path.indexOf(pkg);
      const cyclePath = idx >= 0 ? [...path.slice(idx), pkg] : [...path, pkg];
      cycleMessages.add(`Cycle detected: ${cyclePath.join(' -> ')}`);
      return;
    }

    if (!manifest) {
      if (!missing.has(pkg)) missing.set(pkg, parent);
      return;
    }

    visiting.add(pkg);
    path.push(pkg);

    const deps = normalizeDepends(manifest.depends);
    deps.forEach((dep) => visit(dep, pkg));

    path.pop();
    visiting.delete(pkg);
    visited.add(pkg);

    const action: PackageActionType = installedSet.has(pkg)
      ? 'already-installed'
      : 'install';
    actionOrder.push({ name: pkg, action });
  };

  dedupedInstall.forEach((pkg) => visit(pkg, null));

  const actions: PackageAction[] = actionOrder.map(({ name, action }) => ({
    name,
    action,
    reason: reasonMap.get(name) ?? { type: 'explicit' },
  }));

  return {
    actions,
    missing: Array.from(missing.entries()).map(([name, requiredBy]) => ({
      name,
      requiredBy: requiredBy ?? null,
    })),
    cycles: Array.from(cycleMessages),
  };
}

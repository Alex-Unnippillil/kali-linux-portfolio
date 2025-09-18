import { getPackage, packageList } from './packageMetadata';

export interface HeldPackageWarning {
  name: string;
  reason: string;
}

export type PlannerConflictType = 'pinned-package' | 'pinned-dependent';

export interface PlannerConflict {
  package: string;
  type: PlannerConflictType;
  /** Additional context when the conflict is triggered by dependents. */
  dependents?: string[];
  reason: string;
}

export interface ToggleEvaluation {
  nextPlan: string[];
  conflicts: PlannerConflict[];
  isRemoval: boolean;
}

const dependentsGraph: Map<string, string[]> = new Map();

packageList.forEach((pkg) => {
  pkg.deps.forEach((dep) => {
    const list = dependentsGraph.get(dep) ?? [];
    list.push(pkg.name);
    dependentsGraph.set(dep, list);
  });
});

const unique = (values: string[]): string[] => Array.from(new Set(values));

const findPinnedDependents = (name: string, plan: string[]): string[] => {
  const visited = new Set<string>();
  const pinned: string[] = [];
  const queue = [...(dependentsGraph.get(name) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const meta = getPackage(current);
    if (!meta) continue;

    if (plan.includes(current) && meta.pinned) {
      pinned.push(current);
    }

    const dependents = dependentsGraph.get(current) ?? [];
    dependents.forEach((dep) => {
      if (!visited.has(dep)) {
        queue.push(dep);
      }
    });
  }

  return unique(pinned);
};

export const getHeldPackages = (selection: string[]): HeldPackageWarning[] =>
  selection
    .map((name) => getPackage(name))
    .filter(
      (pkg): pkg is NonNullable<ReturnType<typeof getPackage>> & {
        held: { reason: string };
      } => Boolean(pkg?.held),
    )
    .map((pkg) => ({ name: pkg.name, reason: pkg.held!.reason }));

export const evaluateToggle = (
  plan: string[],
  name: string,
): ToggleEvaluation => {
  const pkg = getPackage(name);
  const isRemoval = plan.includes(name);
  const nextPlan = isRemoval ? plan.filter((p) => p !== name) : [...plan, name];

  if (!pkg) {
    return { nextPlan, conflicts: [], isRemoval };
  }

  const conflicts: PlannerConflict[] = [];

  if (isRemoval) {
    if (pkg.pinned) {
      conflicts.push({
        package: pkg.name,
        type: 'pinned-package',
        reason: pkg.pinned.reason,
      });
    }

    const pinnedDependents = findPinnedDependents(pkg.name, plan);
    if (pinnedDependents.length > 0) {
      conflicts.push({
        package: pkg.name,
        type: 'pinned-dependent',
        dependents: pinnedDependents,
        reason:
          pinnedDependents.length === 1
            ? `${pinnedDependents[0]} is pinned and depends on ${pkg.name}.`
            : `Pinned packages ${pinnedDependents.join(', ')} depend on ${
                pkg.name
              }.`,
      });
    }
  }

  return { nextPlan, conflicts, isRemoval };
};

export const describeConflict = (conflict: PlannerConflict): string => {
  if (conflict.type === 'pinned-package') {
    return `${conflict.package} is pinned: ${conflict.reason}`;
  }
  if (conflict.dependents && conflict.dependents.length > 0) {
    return `${conflict.reason}`;
  }
  return conflict.reason;
};

export const hasConflicts = (conflicts: PlannerConflict[]): boolean =>
  conflicts.length > 0;

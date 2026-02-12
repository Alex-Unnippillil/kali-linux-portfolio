'use client';

import { useEffect, useMemo, useState } from 'react';
import logger from '../../utils/logger';
import {
  describeReason,
  resolvePackagePlan,
  type MissingDependency,
  type PackageActionType,
  type PackageManifest,
  type PackagePlan,
  type PackageReason,
} from '../../utils/packagePlanner';

interface AvailablePackage {
  name: string;
  title: string;
  description: string;
}

interface MockInstallAction {
  name: string;
  action: PackageActionType;
  reason: PackageReason;
}

interface MockInstallResult {
  actions: MockInstallAction[];
  missing: MissingDependency[];
  cycles: string[];
}

interface VerificationSummary {
  matches: boolean;
  accuracy: number;
  stepDifferences: string[];
  missingDifferences: string[];
  cycleDifferences: string[];
}

const PACKAGE_REPOSITORY: Record<string, PackageManifest> = {
  nmap: {
    name: 'nmap',
    description: 'Network mapper for reconnaissance and service enumeration.',
    depends: ['libpcap', 'libssl'],
  },
  hydra: {
    name: 'hydra',
    description: 'Parallelized login cracker with protocol modules.',
    depends: ['libssl', 'libssh'],
  },
  wireshark: {
    name: 'wireshark',
    description: 'Packet analyzer with a Qt interface.',
    depends: ['libpcap', 'qtbase'],
  },
  nikto: {
    name: 'nikto',
    description: 'Web server scanner for enumerating risky configurations.',
    depends: ['perl', 'libssl'],
  },
  libpcap: {
    name: 'libpcap',
    description: 'Packet capture library used by network tools.',
    depends: ['libc6'],
  },
  libssl: {
    name: 'libssl',
    description: 'TLS/SSL encryption library from OpenSSL.',
    depends: ['libc6', 'ca-certificates'],
  },
  libssh: {
    name: 'libssh',
    description: 'SSH client library for secure remote access.',
    depends: ['libc6'],
  },
  qtbase: {
    name: 'qtbase',
    description: 'Qt base module required for graphical utilities.',
    depends: ['libc6'],
  },
  perl: {
    name: 'perl',
    description: 'Perl runtime required by scripting tools.',
    depends: ['libc6'],
  },
  'ca-certificates': {
    name: 'ca-certificates',
    description: 'Certificate bundle for SSL/TLS validation.',
    depends: [],
  },
  libc6: {
    name: 'libc6',
    description: 'GNU C Library base dependency for most binaries.',
    depends: [],
  },
};

const AVAILABLE_PACKAGES: AvailablePackage[] = [
  {
    name: 'nmap',
    title: 'nmap',
    description: 'Audit exposed services with rapid host discovery.',
  },
  {
    name: 'hydra',
    title: 'hydra',
    description: 'Brute-force authentication against network protocols.',
  },
  {
    name: 'wireshark',
    title: 'wireshark',
    description: 'Interactive packet capture and protocol dissection.',
  },
  {
    name: 'nikto',
    title: 'nikto',
    description: 'Scan HTTP servers for dangerous defaults and CVEs.',
  },
];

const BASE_INSTALLED = ['libc6'];

const runMockInstall = (
  requested: string[],
  repository: Record<string, PackageManifest>,
  installed: string[],
): MockInstallResult => {
  const installedSet = new Set(installed.map((name) => name.trim()).filter(Boolean));
  const deduped = Array.from(new Set(requested.map((name) => name.trim()).filter(Boolean)));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];
  const reasonMap = new Map<string, PackageReason>();
  const missing = new Map<string, string | null>();
  const cycleMessages = new Set<string>();
  const actionOrder: { name: string; action: PackageActionType }[] = [];

  const applyReason = (pkg: string, reason: PackageReason) => {
    const current = reasonMap.get(pkg);
    if (!current || (current.type === 'dependency' && reason.type === 'explicit')) {
      reasonMap.set(pkg, reason);
    }
  };

  const install = (pkg: string, parent: string | null) => {
    applyReason(pkg, parent ? { type: 'dependency', via: parent } : { type: 'explicit' });

    if (visited.has(pkg)) return;

    if (visiting.has(pkg)) {
      const idx = path.indexOf(pkg);
      const cyclePath = idx >= 0 ? [...path.slice(idx), pkg] : [...path, pkg];
      cycleMessages.add(`Cycle detected: ${cyclePath.join(' -> ')}`);
      return;
    }

    const manifest = repository[pkg];
    if (!manifest) {
      if (!missing.has(pkg)) missing.set(pkg, parent);
      return;
    }

    visiting.add(pkg);
    path.push(pkg);

    const deps = manifest.depends ?? [];
    const dedupDeps = new Set<string>();
    deps.forEach((dep) => {
      const id = dep.trim();
      if (!id || dedupDeps.has(id)) return;
      dedupDeps.add(id);
      install(id, pkg);
    });

    path.pop();
    visiting.delete(pkg);
    visited.add(pkg);

    const action: PackageActionType = installedSet.has(pkg)
      ? 'already-installed'
      : 'install';
    actionOrder.push({ name: pkg, action });
    installedSet.add(pkg);
  };

  deduped.forEach((pkg) => install(pkg, null));

  const actions: MockInstallAction[] = actionOrder.map(({ name, action }) => ({
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
};

const comparePlanWithExecution = (
  plan: PackagePlan,
  execution: MockInstallResult,
): VerificationSummary => {
  const planSteps = plan.actions.map((action) => `${action.action}:${action.name}`);
  const executionSteps = execution.actions.map((action) => `${action.action}:${action.name}`);
  const totalSteps = Math.max(planSteps.length, executionSteps.length);
  const stepDifferences: string[] = [];

  for (let i = 0; i < totalSteps; i += 1) {
    const planned = planSteps[i] ?? '∅';
    const executed = executionSteps[i] ?? '∅';
    if (planned !== executed) {
      stepDifferences.push(`Step ${i + 1}: planned ${planned}, executed ${executed}`);
    }
  }

  const missingFromPlan = plan.missing
    .map((item) => `${item.name}|${item.requiredBy ?? ''}`)
    .sort();
  const missingFromExecution = execution.missing
    .map((item) => `${item.name}|${item.requiredBy ?? ''}`)
    .sort();

  const missingDifferences: string[] = [];
  if (
    missingFromPlan.length !== missingFromExecution.length ||
    missingFromPlan.some((value, index) => value !== missingFromExecution[index])
  ) {
    const planOnly = missingFromPlan.filter((value) => !missingFromExecution.includes(value));
    const execOnly = missingFromExecution.filter((value) => !missingFromPlan.includes(value));
    if (planOnly.length > 0) {
      missingDifferences.push(`Only in plan: ${planOnly.join(', ')}`);
    }
    if (execOnly.length > 0) {
      missingDifferences.push(`Only in execution: ${execOnly.join(', ')}`);
    }
  }

  const planCycles = [...plan.cycles].sort();
  const executionCycles = [...execution.cycles].sort();
  const cycleDifferences: string[] = [];
  if (
    planCycles.length !== executionCycles.length ||
    planCycles.some((value, index) => value !== executionCycles[index])
  ) {
    const planOnly = planCycles.filter((value) => !executionCycles.includes(value));
    const execOnly = executionCycles.filter((value) => !planCycles.includes(value));
    if (planOnly.length > 0) {
      cycleDifferences.push(`Only in plan: ${planOnly.join(' | ')}`);
    }
    if (execOnly.length > 0) {
      cycleDifferences.push(`Only in execution: ${execOnly.join(' | ')}`);
    }
  }

  const matches =
    stepDifferences.length === 0 &&
    missingDifferences.length === 0 &&
    cycleDifferences.length === 0;

  const accuracy = totalSteps === 0
    ? 100
    : Math.round(((totalSteps - stepDifferences.length) / totalSteps) * 1000) / 10;

  return {
    matches,
    accuracy,
    stepDifferences,
    missingDifferences,
    cycleDifferences,
  };
};

const formatRequiredBy = (item: MissingDependency) =>
  item.requiredBy ? `Required by ${item.requiredBy}` : 'Requested directly';

const formatActionLabel = (action: PackageActionType) =>
  action === 'install' ? 'Install' : 'Already installed';

const PlanList = ({ plan }: { plan: PackagePlan }) => {
  if (plan.actions.length === 0) {
    return (
      <p className="text-sm text-white/70">
        Select a package to generate an installation plan. Dependencies will automatically
        appear in the correct order, just like <code>apt-get</code>.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {plan.actions.map((action, index) => (
        <li
          key={action.name}
          className="rounded border border-white/10 bg-black/30 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-white/60">{index + 1}.</span>
              <span>{action.name}</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                action.action === 'install'
                  ? 'bg-green-400 text-black'
                  : 'bg-slate-500 text-white'
              }`}
            >
              {formatActionLabel(action.action)}
            </span>
          </div>
          <p className="mt-2 text-sm text-white/70">{describeReason(action.reason)}</p>
        </li>
      ))}
    </ol>
  );
};

const Warnings = ({ plan }: { plan: PackagePlan }) => {
  if (plan.missing.length === 0 && plan.cycles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {plan.missing.length > 0 && (
        <div className="rounded border border-amber-500/60 bg-amber-900/40 p-3 text-sm">
          <h3 className="font-semibold text-amber-200">Missing packages</h3>
          <ul className="mt-2 space-y-1 text-amber-100">
            {plan.missing.map((item) => (
              <li key={item.name}>
                <span className="font-medium">{item.name}</span>{' '}
                <span className="text-amber-200/80">({formatRequiredBy(item)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.cycles.length > 0 && (
        <div className="rounded border border-red-500/60 bg-red-900/40 p-3 text-sm">
          <h3 className="font-semibold text-red-200">Dependency cycles</h3>
          <ul className="mt-2 space-y-1 text-red-100">
            {plan.cycles.map((cycle) => (
              <li key={cycle}>{cycle}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const VerificationPanel = ({ summary }: { summary: VerificationSummary }) => {
  const differences = [
    ...summary.stepDifferences.map((diff) => `Action mismatch: ${diff}`),
    ...summary.missingDifferences.map((diff) => `Missing delta: ${diff}`),
    ...summary.cycleDifferences.map((diff) => `Cycle delta: ${diff}`),
  ];

  return (
    <div
      className={`rounded border p-3 text-sm ${
        summary.matches
          ? 'border-green-500/60 bg-green-900/30 text-green-100'
          : 'border-yellow-500/60 bg-yellow-900/30 text-yellow-100'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold uppercase tracking-wide text-xs text-white/80">
          Verification
        </h3>
        <span className="text-xs font-semibold text-white/70">
          Accuracy {summary.accuracy.toFixed(1)}% (target ≥ 99%)
        </span>
      </div>
      <p className="mt-2 text-white/80">
        {summary.matches
          ? 'Simulated plan matches the mock installer output.'
          : 'Plan diverges from the mock installer output. Review the differences below.'}
      </p>
      {differences.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
          {differences.map((diff) => (
            <li key={diff}>{diff}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

const InstalledSummary = ({ selected }: { selected: string[] }) => (
  <p className="text-xs text-white/60">
    <span className="font-semibold text-white/80">Pre-installed:</span>{' '}
    {BASE_INSTALLED.length > 0 ? BASE_INSTALLED.join(', ') : 'None'}
    {selected.length > 0 && (
      <>
        {' '}
        · <span className="font-semibold text-white/80">Requested:</span>{' '}
        {selected.join(', ')}
      </>
    )}
  </p>
);

export default function PackageManagerApp() {
  const [selected, setSelected] = useState<string[]>(['nmap']);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const plan = useMemo(
    () =>
      resolvePackagePlan({
        install: selected,
        installed: BASE_INSTALLED,
        repository: PACKAGE_REPOSITORY,
      }),
    [selected],
  );

  const execution = useMemo(
    () => runMockInstall(selected, PACKAGE_REPOSITORY, BASE_INSTALLED),
    [selected],
  );

  const summary = useMemo(
    () => comparePlanWithExecution(plan, execution),
    [plan, execution],
  );

  useEffect(() => {
    if (!summary.matches) {
      logger.error('Package plan deviates from mock install (target ≥ 99%)', {
        selection: selected,
        stepDifferences: summary.stepDifferences,
        missingDifferences: summary.missingDifferences,
        cycleDifferences: summary.cycleDifferences,
      });
    }
  }, [summary, selected]);

  const togglePackage = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter((pkg) => pkg !== name);
      }
      return [...prev, name];
    });
  };

  const clearSelection = () => setSelected([]);

  const newInstalls = plan.actions.filter((action) => action.action === 'install').length;

  return (
    <div className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Package Manager</h1>
          <p className="text-sm text-white/70">
            Preview the <code>apt-get</code> plan generated by the dependency resolver. Each step
            surfaces why a package is scheduled so you can explain the install to stakeholders.
          </p>
        </header>

        <section className="rounded border border-white/10 bg-black/20">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Package selection
            </h2>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/20"
            >
              Clear
            </button>
          </div>
          <div className="space-y-4 p-4">
            <InstalledSummary selected={selected} />
            <div className="grid gap-3 md:grid-cols-2">
              {AVAILABLE_PACKAGES.map((pkg) => {
                const isSelected = selectedSet.has(pkg.name);
                const depends = PACKAGE_REPOSITORY[pkg.name]?.depends ?? [];
                return (
                  <label
                    key={pkg.name}
                    className={`block cursor-pointer rounded border p-3 transition ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/20 shadow-[0_0_0_1px_rgba(96,165,250,0.4)]'
                        : 'border-white/10 bg-white/5 hover:border-blue-400/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePackage(pkg.name)}
                      aria-label={`Toggle ${pkg.title}`}
                      className="sr-only"
                    />
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-lg font-semibold">{pkg.title}</p>
                          <p className="text-sm text-white/70">{pkg.description}</p>
                        </div>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                            isSelected
                              ? 'border-blue-300 bg-blue-400 text-black'
                              : 'border-white/40 text-white/60'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                      {depends.length > 0 && (
                        <p className="text-xs text-white/50">
                          Depends on: <span className="text-white/70">{depends.join(', ')}</span>
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Install plan
            </h2>
            <span className="text-xs text-white/60">
              {plan.actions.length} steps · {newInstalls} new package
              {newInstalls === 1 ? '' : 's'}
            </span>
          </div>
          <div className="mt-3">
            <PlanList plan={plan} />
          </div>
        </section>

        <Warnings plan={plan} />

        <VerificationPanel summary={summary} />
      </div>
    </div>
  );
}

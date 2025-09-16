import { Suspense, cache } from 'react';
import type { ReactElement } from 'react';
import { readJsonFile } from '@/lib/readJsonFile';

interface ModuleLogEntry {
  level: string;
  message: string;
}

interface ModuleResult {
  target: string;
  status: string;
}

interface ModuleOption {
  name: string;
  label: string;
}

interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  tags: string[];
  log: ModuleLogEntry[];
  results: ModuleResult[];
  data: string;
  inputs: string[];
  lab: string;
  options: ModuleOption[];
}

interface ModuleVersion {
  version: string;
}

const loadModules = cache(async () => readJsonFile<ModuleDefinition[]>('data/module-index.json'));
const loadModuleVersion = cache(async () => readJsonFile<ModuleVersion>('data/module-version.json'));

function logStyle(level: string): string {
  switch (level) {
    case 'success':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    case 'warning':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    case 'error':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
    default:
      return 'border-slate-700/60 bg-slate-900/70 text-slate-200';
  }
}

function OptionBadge({ option }: { option: ModuleOption }): ReactElement {
  return (
    <span className="rounded-full border border-slate-800/70 bg-slate-950/70 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
      {option.label}
    </span>
  );
}

async function ModulesContent(): Promise<ReactElement> {
  const [modules, version] = await Promise.all([loadModules(), loadModuleVersion()]);

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
        <div>
          <p className="text-sm font-medium text-slate-200">Streaming module registry</p>
          <p className="text-xs text-slate-400">{modules.length} modules available • version {version.version}</p>
        </div>
        <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">Synchronized</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {modules.map((module) => (
          <article
            key={module.id}
            className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-lg shadow-slate-950/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{module.id}</p>
                <h3 className="text-lg font-semibold text-slate-50">{module.name}</h3>
                <p className="text-sm text-slate-300">{module.description}</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">Ready</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {module.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] uppercase tracking-wide text-emerald-200"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="space-y-2 rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-xs text-slate-200">
              <p className="font-semibold text-slate-200">Log excerpts</p>
              <ul className="space-y-2">
                {module.log.slice(0, 3).map((entry, index) => (
                  <li
                    key={index}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${logStyle(entry.level)}`}
                  >
                    <span className="min-w-[72px] text-[11px] uppercase tracking-wide">{entry.level}</span>
                    <span className="text-left">{entry.message}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 text-xs text-slate-200 md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Inputs</p>
                <ul className="list-disc space-y-1 pl-4">
                  {module.inputs.map((input) => (
                    <li key={input}>{input}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Sample results</p>
                <ul className="space-y-1">
                  {module.results.slice(0, 2).map((result) => (
                    <li key={`${result.target}-${result.status}`} className="rounded-lg border border-slate-800/70 bg-slate-950/70 p-2">
                      <p className="font-medium text-slate-100">{result.target}</p>
                      <p className="text-slate-300">{result.status}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {module.options.map((option) => (
                <OptionBadge key={option.name} option={option} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <a
                href={module.lab}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-300 transition hover:text-emerald-200"
              >
                Launch lab
              </a>
              <span className="text-slate-400">{module.data}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ModulesShellSkeleton(): ReactElement {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-slate-800/70" />
          <div className="h-3 w-56 rounded bg-slate-900/70" />
        </div>
        <span className="h-6 w-20 rounded-full bg-slate-800/60" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 animate-pulse"
          >
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-800/70" />
              <div className="h-4 w-32 rounded bg-slate-800/70" />
              <div className="h-3 w-full rounded bg-slate-900/70" />
            </div>
            <div className="flex gap-2">
              <span className="h-5 w-16 rounded-full bg-emerald-500/10" />
              <span className="h-5 w-16 rounded-full bg-emerald-500/10" />
            </div>
            <div className="space-y-2 rounded-xl border border-slate-800/70 bg-slate-950/70 p-3">
              <div className="h-3 w-24 rounded bg-slate-800/70" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-slate-900/70" />
                <div className="h-4 w-full rounded bg-slate-900/70" />
                <div className="h-4 w-full rounded bg-slate-900/70" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-slate-800/70" />
                <div className="h-3 w-full rounded bg-slate-900/70" />
                <div className="h-3 w-3/4 rounded bg-slate-900/70" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-slate-800/70" />
                <div className="h-12 w-full rounded bg-slate-900/70" />
              </div>
            </div>
            <div className="flex gap-2">
              <span className="h-5 w-16 rounded-full bg-slate-800/70" />
              <span className="h-5 w-16 rounded-full bg-slate-800/70" />
              <span className="h-5 w-16 rounded-full bg-slate-800/70" />
            </div>
            <div className="h-3 w-32 rounded bg-emerald-500/20" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading modules…</span>
    </div>
  );
}

export function ModulesShell(): ReactElement {
  return (
    <section
      id="modules"
      className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/40 backdrop-blur"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Module operations shell</h2>
          <p className="text-sm text-slate-400">Inspect module registry, logs, and sample telemetry over streaming data.</p>
        </div>
        <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300">Real-time</span>
      </header>
      <Suspense fallback={<ModulesShellSkeleton />}>
        <ModulesContent />
      </Suspense>
    </section>
  );
}

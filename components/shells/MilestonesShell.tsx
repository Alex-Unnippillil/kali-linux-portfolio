import { Suspense, cache } from 'react';
import type { ReactElement } from 'react';
import { readJsonFile } from '@/lib/readJsonFile';

interface Milestone {
  date: string;
  title: string;
  image: string;
  link: string;
  tags: string[];
}

const loadMilestones = cache(async () => {
  const milestones = await readJsonFile<Milestone[]>('data/milestones.json');
  return milestones.sort((a, b) => a.date.localeCompare(b.date));
});

function formatDateLabel(input: string): string {
  const [year, month] = input.split('-');
  if (!year) return input;
  const parsedMonth = Number.parseInt(month ?? '1', 10) - 1;
  const safeDate = new Date(Number.parseInt(year, 10), Number.isNaN(parsedMonth) ? 0 : parsedMonth);
  return safeDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function MilestoneTag({ label }: { label: string }): ReactElement {
  return (
    <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[11px] uppercase tracking-wide text-indigo-200">
      {label}
    </span>
  );
}

async function MilestonesContent(): Promise<ReactElement> {
  const milestones = await loadMilestones();

  return (
    <ol className="relative space-y-6 border-l border-slate-800/70 pl-6" aria-live="polite">
      {milestones.map((milestone) => (
        <li key={milestone.date} className="ml-4 space-y-3">
          <span className="absolute -left-[10px] mt-1 h-5 w-5 rounded-full border-2 border-indigo-400 bg-slate-950" aria-hidden />
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 className="text-base font-semibold text-slate-50">{milestone.title}</h3>
            <time className="text-xs uppercase tracking-wide text-slate-400">{formatDateLabel(milestone.date)}</time>
          </div>
          <div className="flex flex-wrap gap-2">
            {milestone.tags.map((tag) => (
              <MilestoneTag key={tag} label={tag} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <a
              href={milestone.link}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-300 transition hover:text-indigo-200"
            >
              View milestone
            </a>
            <span className="text-slate-400">Snapshot ready</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function MilestonesShellSkeleton(): ReactElement {
  return (
    <div role="status" aria-live="polite" className="relative space-y-6 border-l border-slate-800/70 pl-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="ml-4 space-y-3 animate-pulse">
          <span className="absolute -left-[10px] mt-1 h-5 w-5 rounded-full border-2 border-indigo-400/50 bg-slate-950" aria-hidden />
          <div className="h-4 w-48 rounded bg-slate-800/70" />
          <div className="flex gap-2">
            <span className="h-5 w-16 rounded-full bg-indigo-500/10" />
            <span className="h-5 w-16 rounded-full bg-indigo-500/10" />
          </div>
          <div className="h-3 w-32 rounded bg-slate-900/70" />
        </div>
      ))}
      <span className="sr-only">Loading milestones…</span>
    </div>
  );
}

export function MilestonesShell(): ReactElement {
  return (
    <section
      id="milestones"
      className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/40 backdrop-blur"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Milestone timeline shell</h2>
          <p className="text-sm text-slate-400">Streaming highlights from a curated milestone feed.</p>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-200">Live feed</span>
      </header>
      <Suspense fallback={<MilestonesShellSkeleton />}>
        <MilestonesContent />
      </Suspense>
    </section>
  );
}

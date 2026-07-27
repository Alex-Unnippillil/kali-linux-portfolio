import { MilestonesShellSkeleton, ModulesShellSkeleton, ProjectsShellSkeleton } from '@/components/shells';

export default function ShellsLoading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <section className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/40 backdrop-blur animate-pulse">
        <div className="h-5 w-64 rounded bg-slate-800/70" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-slate-900/70" />
          <div className="h-4 w-5/6 rounded bg-slate-900/70" />
          <div className="h-4 w-4/6 rounded bg-slate-900/70" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded bg-slate-900/70" />
          <div className="h-3 w-2/3 rounded bg-slate-900/70" />
          <div className="h-3 w-1/2 rounded bg-slate-900/70" />
        </div>
      </section>
      <ProjectsShellSkeleton />
      <MilestonesShellSkeleton />
      <ModulesShellSkeleton />
      <span className="sr-only">Loading streaming shells…</span>
    </div>
  );
}

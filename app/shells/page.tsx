import type { Metadata } from 'next';
import { MilestonesShell, ModulesShell, ProjectsShell } from '@/components/shells';

export const metadata: Metadata = {
  title: 'Streaming shells showcase',
  description: 'Live portfolio shells rendered via React Suspense boundaries with responsive skeleton fallbacks.',
};

export const dynamic = 'force-dynamic';

export default function ShellsPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/40 backdrop-blur">
        <h2 className="text-xl font-semibold text-slate-50">How to validate streaming shells</h2>
        <p className="text-sm text-slate-300">
          Each section below suspends while its server data loads. The skeleton fallback engages immediately, typically within
          200&nbsp;ms, providing clear feedback as the streamed payload arrives. Use the anchor controls in the header to jump
          between shells and observe the staggered reveals.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>Project delivery shell streams featured builds with syntax-ready snippets.</li>
          <li>Milestone timeline shell renders chronological highlights with live badges.</li>
          <li>Module operations shell aggregates module telemetry, options, and sample outputs.</li>
        </ul>
      </section>
      <ProjectsShell />
      <MilestonesShell />
      <ModulesShell />
    </div>
  );
}

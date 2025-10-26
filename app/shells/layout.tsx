import type { ReactNode } from 'react';

const anchors = [
  { href: '#projects', label: 'Projects' },
  { href: '#milestones', label: 'Milestones' },
  { href: '#modules', label: 'Modules' },
];

export default function ShellsLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <header className="border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Streaming shells</p>
            <h1 className="text-3xl font-semibold text-slate-50">Server-first experience hub</h1>
            <p className="max-w-2xl text-sm text-slate-400">
              Explore Suspense boundaries that stream server-rendered responses with immediate skeleton feedback. Each shell below
              demonstrates a different slice of the portfolio data infrastructure.
            </p>
          </div>
          <nav aria-label="Shell sections" className="flex flex-wrap gap-3">
            {anchors.map((anchor) => (
              <a
                key={anchor.href}
                href={anchor.href}
                className="rounded-full border border-slate-800/70 bg-slate-900/70 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-200 transition hover:border-slate-700 hover:text-slate-50"
              >
                {anchor.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">{children}</main>
    </div>
  );
}

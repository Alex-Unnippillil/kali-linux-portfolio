import { Suspense, cache } from 'react';
import type { ReactElement } from 'react';
import { readJsonFile } from '@/lib/readJsonFile';

interface Project {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo: string;
  demo: string;
  snippet: string;
  language: string;
}

const loadProjects = cache(async () => {
  const projects = await readJsonFile<Project[]>('data/projects.json');
  return projects.sort((a, b) => b.year - a.year);
});

function TagBadge({ label }: { label: string }): ReactElement {
  return (
    <span className="rounded-full border border-slate-800/80 bg-slate-900/80 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
      {label}
    </span>
  );
}

function StackBadge({ label }: { label: string }): ReactElement {
  return (
    <span className="rounded-full bg-slate-800/70 px-2 py-1 text-xs text-slate-200">{label}</span>
  );
}

async function ProjectsContent(): Promise<ReactElement> {
  const projects = await loadProjects();

  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-live="polite">
      {projects.map((project) => (
        <li
          key={project.id}
          className="group flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/30 transition hover:border-slate-700 hover:bg-slate-900/60"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{project.type}</p>
              <h3 className="text-lg font-semibold text-slate-50">{project.title}</h3>
            </div>
            <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-200">{project.year}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{project.description}</p>
          <div className="flex flex-wrap gap-2">
            {project.stack.map((item) => (
              <StackBadge key={item} label={item} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <TagBadge key={tag} label={tag} />
            ))}
          </div>
          <pre className="max-h-48 overflow-auto rounded-xl border border-slate-800/70 bg-slate-950/80 p-3 text-xs text-slate-200">
            <code>{project.snippet}</code>
          </pre>
          <div className="flex flex-wrap gap-4 text-xs">
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sky-300 transition hover:text-sky-200"
            >
              View repository
            </a>
            <a
              href={project.demo}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-emerald-300 transition hover:text-emerald-200"
            >
              Open demo
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProjectsShellSkeleton(): ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-4 sm:grid-cols-2"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 rounded bg-slate-800/70" />
            <div className="h-6 w-12 rounded-full bg-slate-800/70" />
          </div>
          <div className="h-4 w-3/4 rounded bg-slate-800/70" />
          <div className="h-4 w-2/3 rounded bg-slate-900/70" />
          <div className="flex gap-2 pt-1">
            <span className="h-6 w-16 rounded-full bg-slate-800/70" />
            <span className="h-6 w-16 rounded-full bg-slate-800/70" />
          </div>
          <div className="flex gap-2">
            <span className="h-5 w-20 rounded-full bg-slate-900/70" />
            <span className="h-5 w-20 rounded-full bg-slate-900/70" />
            <span className="h-5 w-20 rounded-full bg-slate-900/70" />
          </div>
          <div className="h-24 w-full rounded bg-slate-900/60" />
          <div className="flex gap-3">
            <span className="h-4 w-24 rounded bg-slate-900/70" />
            <span className="h-4 w-20 rounded bg-slate-900/70" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading projects…</span>
    </div>
  );
}

export function ProjectsShell(): ReactElement {
  return (
    <section
      id="projects"
      className="space-y-5 rounded-3xl border border-slate-800/70 bg-slate-950/40 p-6 shadow-xl shadow-slate-950/40 backdrop-blur"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Project delivery shell</h2>
          <p className="text-sm text-slate-400">
            Streams featured builds directly from the server with syntax-highlight ready snippets.
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">Streaming</span>
      </header>
      <Suspense fallback={<ProjectsShellSkeleton />}>
        <ProjectsContent />
      </Suspense>
    </section>
  );
}

import Image from 'next/image';
import Link from 'next/link';

import type { Project } from '../_lib/projects';

type ProjectGridProps = {
  projects: Project[];
  activeId?: number;
};

export default function ProjectGrid({ projects, activeId }: ProjectGridProps) {
  return (
    <>
      <header className="mb-10 space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-400">Project gallery</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Interactive security tooling portfolio</h1>
        <p className="max-w-3xl text-base text-slate-300">
          Explore recent simulations, utilities, and experiments. Select a project to view deep-dive notes,
          technology stacks, and links without leaving the gallery. Modals keep the grid in place so you can
          continue browsing after closing a detail view.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const isActive = project.id === activeId;
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 transition duration-200 hover:border-sky-400/60 hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isActive ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950' : ''
              }`}
              aria-labelledby={`project-${project.id}-title`}
            >
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={project.thumbnail}
                  alt={project.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-200 group-hover:scale-105"
                  priority={Boolean(isActive)}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 text-xs text-slate-200">
                  <span className="font-semibold">{project.year}</span>
                  <span className="ml-3 inline-flex items-center rounded-full bg-slate-950/70 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-sky-300">
                    {project.type}
                  </span>
                </div>
              </div>

              <article className="flex flex-1 flex-col gap-3 p-5" aria-describedby={`project-${project.id}-summary`}>
                <h2 id={`project-${project.id}-title`} className="text-xl font-semibold text-slate-50">
                  {project.title}
                </h2>
                <p id={`project-${project.id}-summary`} className="text-sm leading-relaxed text-slate-300">
                  {project.description}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {project.stack.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.stack.length > 4 ? (
                    <span className="rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                      +{project.stack.length - 4} more
                    </span>
                  ) : null}
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </>
  );
}

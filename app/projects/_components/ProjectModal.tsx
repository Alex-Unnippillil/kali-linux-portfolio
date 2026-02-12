'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import type { Project } from '../_lib/projects';

type ProjectModalProps = {
  project: Project;
  isStandalone?: boolean;
};

export default function ProjectModal({ project, isStandalone = false }: ProjectModalProps) {
  const router = useRouter();

  const closeModal = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.replace('/projects');
    }
  }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeModal]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={closeModal}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`project-${project.id}-modal-title`}
        className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-slate-200 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-label="Close project details"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
          <Image
            src={project.thumbnail}
            alt={project.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
            priority
          />
        </div>

        <div className="space-y-6 p-6">
          <header className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-400">{project.type}</p>
            <h2 id={`project-${project.id}-modal-title`} className="text-2xl font-semibold text-slate-50">
              {project.title}
            </h2>
            <p className="text-sm text-slate-300">{project.description}</p>
          </header>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Stack</h3>
            <div className="flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-100"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {project.tags.length ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Highlights</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="rounded-lg bg-slate-800/50 px-3 py-1 text-xs text-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {project.snippet ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Sample snippet</h3>
              <pre className="max-h-60 overflow-auto rounded-xl bg-slate-950/70 p-4 text-xs text-slate-100">
                <code>{project.snippet}</code>
              </pre>
            </section>
          ) : null}

          <footer className="flex flex-wrap gap-3 text-sm">
            {project.repo ? (
              <Link
                href={project.repo}
                className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-slate-100 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                target="_blank"
                rel="noreferrer noopener"
              >
                <span>View repository</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m13.5 4.5 6 6m0 0-6 6m6-6H6"
                  />
                </svg>
              </Link>
            ) : null}
            {project.demo ? (
              <Link
                href={project.demo}
                className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 px-4 py-2 text-sky-300 transition hover:border-sky-400 hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                target="_blank"
                rel="noreferrer noopener"
              >
                <span>Launch demo</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25h13.5v13.5M18.75 5.25 5.25 18.75" />
                </svg>
              </Link>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}

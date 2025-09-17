import { useCallback, useMemo, useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

import aboutJson from '@/components/apps/alex/data.json';
import resumeJson from '@/components/apps/alex/resume.json';
import { trackEvent } from '@/lib/analytics-client';
import { createLogger } from '@/lib/logger';

interface ResumeExperience {
  date: string;
  description: string;
  tags: string[];
}

interface ResumeProject {
  name: string;
  link: string;
}

interface ResumeData {
  skills: string[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
}

interface Milestone {
  year: string;
  description: string;
}

const resumeData = resumeJson as ResumeData;
const milestones = (aboutJson as { milestones?: Milestone[] }).milestones ?? [];
const resumeTags = Array.from(
  new Set(resumeData.experience.flatMap((experience) => experience.tags)),
);

const ResumePage: NextPage = () => {
  const [filter, setFilter] = useState<string>('all');
  const logger = useMemo(() => createLogger('resume-page'), []);

  const experiences = useMemo(() => {
    if (filter === 'all') {
      return resumeData.experience;
    }

    return resumeData.experience.filter((experience) => experience.tags.includes(filter));
  }, [filter]);

  const handlePrint = useCallback(() => {
    logger.info('Exporting resume to PDF', { filter });
    trackEvent('download_click', { location: 'resume_page_export_pdf', filter });

    if (typeof window === 'undefined' || typeof window.print !== 'function') {
      logger.warn('window.print is unavailable; skipping export', { filter });
      return;
    }

    window.print();
  }, [filter, logger]);

  return (
    <>
      <Head>
        <title>Resume | Kali Linux Portfolio</title>
        <meta
          name="description"
          content="Detailed resume for Alex Unnippillil including milestones, skills, projects, and experience."
        />
      </Head>
      <main className="min-h-screen bg-ub-cool-grey text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Resume</h1>
              <p className="text-sm text-gray-300">
                Explore milestones, core skills, and recent experience in a printer-friendly layout.
              </p>
            </div>
            <div className="no-print flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded bg-ub-gedit-light px-4 py-2 text-sm font-medium text-black transition hover:bg-ub-gedit-light/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
              >
                Export to PDF
              </button>
            </div>
          </header>

          <section
            id="resume-content"
            className="rounded-lg border border-white/10 bg-ub-grey px-6 py-8 shadow-xl print:border-none print:shadow-none"
          >
            <div className="grid gap-10">
              <section>
                <h2 className="text-xl font-semibold tracking-tight">Milestones</h2>
                <ol className="mt-4 space-y-3 border-l border-ubt-blue/70 pl-4">
                  {milestones.map((milestone) => (
                    <li key={`${milestone.year}-${milestone.description}`} className="relative pl-4">
                      <span
                        aria-hidden="true"
                        className="absolute -left-2 top-2 h-3 w-3 rounded-full bg-ubt-blue"
                      />
                      <p className="text-sm font-semibold text-ubt-blue">{milestone.year}</p>
                      <p className="text-sm text-gray-200">{milestone.description}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold tracking-tight">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-ub-gedit-light/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ub-gedit-light"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">Experience</h2>
                  <div className="no-print flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className={`rounded-full px-3 py-1 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-grey ${
                        filter === 'all'
                          ? 'bg-ubt-blue text-white'
                          : 'bg-ub-gedit-light/20 text-gray-200 hover:bg-ub-gedit-light/30'
                      }`}
                      aria-pressed={filter === 'all'}
                    >
                      All
                    </button>
                    {resumeTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFilter(tag)}
                        className={`rounded-full px-3 py-1 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-grey ${
                          filter === tag
                            ? 'bg-ubt-blue text-white'
                            : 'bg-ub-gedit-light/20 text-gray-200 hover:bg-ub-gedit-light/30'
                        }`}
                        aria-pressed={filter === tag}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <ol className="mt-4 space-y-6 border-l border-ubt-blue/70 pl-4">
                  {experiences.map((experience) => (
                    <li
                      key={`${experience.date}-${experience.description}`}
                      className="relative pl-4 text-sm text-gray-200"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -left-2 top-2 h-3 w-3 rounded-full bg-ubt-blue"
                      />
                      <p className="font-semibold text-ubt-blue">{experience.date}</p>
                      <p>{experience.description}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {resumeData.projects.map((project) => (
                    <li key={project.name} className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className="font-medium text-white">{project.name}</span>
                      <Link
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-ubt-blue underline underline-offset-2"
                      >
                        View project
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default ResumePage;

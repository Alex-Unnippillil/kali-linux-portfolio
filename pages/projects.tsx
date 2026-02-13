import Head from 'next/head';
import type { GetStaticProps, NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  fetchGitHubRepoMetadata,
  GitHubRepoMetadata,
  normalizeRepoSlug,
} from '../lib/integrations/github';

interface RawProject {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  thumbnail: string;
  repo?: string;
  demo?: string;
  snippet?: string;
  language?: string;
}

interface ProjectWithMetadata extends RawProject {
  githubRepo: string | null;
  github?: GitHubRepoMetadata | null;
}

interface ProjectsPageProps {
  projects: ProjectWithMetadata[];
  generatedAt: string;
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now';
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (diff < minute) return 'Just now';
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diff < week) {
    const days = Math.round(diff / day);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  const weeks = Math.round(diff / week);
  if (weeks < 5) {
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleDateString();
}

function formatNumber(value: number | null): string {
  if (value == null) return '—';
  if (value < 1000) return value.toString();
  if (value < 10000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (value < 1_000_000) return Math.round(value / 1000) + 'k';
  return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

function mergeMetadata(
  project: ProjectWithMetadata,
  runtimeOverrides: Record<string, GitHubRepoMetadata>,
): GitHubRepoMetadata | null {
  if (!project.githubRepo) return null;
  const key = project.githubRepo.toLowerCase();
  const runtime = runtimeOverrides[key];
  if (runtime) return runtime;
  if (!project.github) return null;
  return project.github;
}

function buildRuntimeMetadata(repo: string, data: any): GitHubRepoMetadata {
  const fetchedAt = new Date().toISOString();
  const watchers =
    typeof data.subscribers_count === 'number'
      ? data.subscribers_count
      : typeof data.watchers_count === 'number'
      ? data.watchers_count
      : null;
  const lastCommit = typeof data.pushed_at === 'string' ? data.pushed_at : data.updated_at ?? null;
  return {
    repo,
    stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
    forks: typeof data.forks_count === 'number' ? data.forks_count : null,
    openIssues: typeof data.open_issues_count === 'number' ? data.open_issues_count : null,
    watchers,
    lastCommitDate: typeof lastCommit === 'string' ? lastCommit : null,
    defaultBranch: typeof data.default_branch === 'string' ? data.default_branch : null,
    fetchedAt,
    stale: false,
    source: 'runtime',
  };
}

const ProjectsPage: NextPage<ProjectsPageProps> = ({ projects, generatedAt }) => {
  const [runtimeMetadata, setRuntimeMetadata] = useState<Record<string, GitHubRepoMetadata>>({});
  const [rateLimited, setRateLimited] = useState(false);

  const staleProjects = useMemo(
    () =>
      projects.filter(
        (project) => project.githubRepo && (!project.github || project.github.stale),
      ),
    [projects],
  );

  useEffect(() => {
    if (!staleProjects.length) return;
    let cancelled = false;

    async function refreshMetadata() {
      for (const project of staleProjects) {
        const repo = project.githubRepo;
        if (!repo) continue;
        try {
          const response = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
              Accept: 'application/vnd.github+json',
            },
          });

          if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
            setRateLimited(true);
            break;
          }

          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          if (cancelled) return;
          setRuntimeMetadata((prev) => ({
            ...prev,
            [repo.toLowerCase()]: buildRuntimeMetadata(repo, data),
          }));
        } catch (err) {
          // Ignore runtime fetch errors; cached data (if any) will continue to render.
          if (process.env.NODE_ENV !== 'production') {
            console.debug('Failed to refresh GitHub metadata', err);
          }
        }
      }
    }

    refreshMetadata();
    return () => {
      cancelled = true;
    };
  }, [staleProjects]);

  return (
    <>
      <Head>
        <title>Projects | Kali Linux Portfolio</title>
        <meta name="description" content="Projects, experiments, and open-source contributions." />
      </Head>
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-slate-300">
              Build snapshot generated on {new Date(generatedAt).toLocaleString()}.
            </p>
            {rateLimited && (
              <p className="text-sm text-amber-300">
                GitHub API rate limit reached. Displaying cached data until limits reset.
              </p>
            )}
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            {projects.map((project) => {
              const metadata = mergeMetadata(project, runtimeMetadata);
              return (
                <article
                  key={project.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 transition hover:border-slate-700"
                >
                  <header className="mb-3">
                    <h2 className="text-xl font-semibold text-slate-50">{project.title}</h2>
                    <p className="text-sm text-slate-300">{project.description}</p>
                  </header>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-200">
                    <div>
                      <dt className="text-slate-400">Year</dt>
                      <dd>{project.year}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Type</dt>
                      <dd className="capitalize">{project.type}</dd>
                    </div>
                    {project.language && (
                      <div>
                        <dt className="text-slate-400">Language</dt>
                        <dd className="capitalize">{project.language}</dd>
                      </div>
                    )}
                    {project.stack?.length ? (
                      <div>
                        <dt className="text-slate-400">Stack</dt>
                        <dd>{project.stack.join(', ')}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {metadata ? (
                    <div className="mt-5 space-y-2 rounded-md border border-slate-800 bg-slate-900/80 p-4 text-sm">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Stars</span>
                        <span className="font-semibold text-slate-100">{formatNumber(metadata.stars)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Forks</span>
                        <span className="font-semibold text-slate-100">{formatNumber(metadata.forks)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Open issues</span>
                        <span className="font-semibold text-slate-100">{formatNumber(metadata.openIssues)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Watchers</span>
                        <span className="font-semibold text-slate-100">{formatNumber(metadata.watchers)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Last commit</span>
                        <span className="font-semibold text-slate-100">
                          {formatRelativeTime(metadata.lastCommitDate)}
                        </span>
                      </div>
                      {metadata.stale && (
                        <p className="text-xs text-amber-300">
                          Cached data may be older than 24 hours. A fresh copy will be loaded when available.
                        </p>
                      )}
                      {metadata.rateLimited && (
                        <p className="text-xs text-amber-300">
                          GitHub rate limiting prevented retrieving the latest data.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-5 rounded-md border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
                      GitHub metadata is unavailable for this project.
                    </p>
                  )}

                  {project.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 uppercase tracking-wide"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <footer className="mt-6 flex flex-wrap gap-3 text-sm">
                    {project.repo && (
                      <Link
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-slate-100 px-3 py-1 font-medium text-slate-900 transition hover:bg-slate-200"
                      >
                        View repository
                      </Link>
                    )}
                    {project.demo && (
                      <Link
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-slate-600 px-3 py-1 font-medium text-slate-200 transition hover:border-slate-400"
                      >
                        Live demo
                      </Link>
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps<ProjectsPageProps> = async () => {
  const rawProjects: RawProject[] = (await import('../data/projects.json')).default;

  const projectsWithMetadata: ProjectWithMetadata[] = await Promise.all(
    rawProjects.map(async (project) => {
      const repoSlug = normalizeRepoSlug(project.repo);
      if (!repoSlug) {
        return {
          ...project,
          githubRepo: null,
          github: null,
        };
      }

      const metadata = await fetchGitHubRepoMetadata(repoSlug);
      return {
        ...project,
        githubRepo: repoSlug,
        github: metadata ? { ...metadata, source: 'build' } : null,
      };
    }),
  );

  return {
    props: {
      projects: projectsWithMetadata,
      generatedAt: new Date().toISOString(),
    },
    revalidate: 60 * 60,
  };
};

export default ProjectsPage;

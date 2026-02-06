'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ChangeCategory, ChangelogRelease } from '@/data/updates/changelogs';

interface ChangelogDrawerProps {
  open: boolean;
  onClose: () => void;
}

type BadgeLookupKey = ChangeCategory | 'default';

const badgeStyles: Record<BadgeLookupKey, string> = {
  security: 'bg-red-500/20 text-red-200 border border-red-400/40',
  feature: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40',
  bugfix: 'bg-blue-500/20 text-blue-200 border border-blue-400/40',
  default: 'bg-slate-500/20 text-slate-200 border border-slate-400/40',
};

const FALLBACK_SUMMARY = 'Release notes for this package are still on the way. Check back soon for more details.';
const FALLBACK_SIZE = 'Size pending';
const FALLBACK_ETA = 'ETA pending';
const FALLBACK_RESTART = 'Restart impact to be confirmed.';

const skeletonCard = (
  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 w-28 bg-slate-700 rounded" />
      <div className="h-5 w-20 bg-slate-700 rounded-full" />
    </div>
    <div className="h-3 w-full bg-slate-800 rounded" />
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
      <div className="h-3 w-24 bg-slate-800 rounded" />
      <div className="h-3 w-20 bg-slate-800 rounded" />
      <div className="h-3 w-28 bg-slate-800 rounded" />
      <div className="h-3 w-16 bg-slate-800 rounded" />
    </div>
  </div>
);

function resolveBadgeStyle(category?: string): string {
  if (!category) {
    return badgeStyles.default;
  }

  const key = category.toLowerCase() as ChangeCategory;
  return badgeStyles[key] ?? badgeStyles.default;
}

function formatCategory(category?: string): string {
  if (!category) {
    return 'Update';
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatEta(etaMinutes?: number): string {
  if (typeof etaMinutes !== 'number' || Number.isNaN(etaMinutes)) {
    return FALLBACK_ETA;
  }

  if (etaMinutes < 1) {
    return '< 1 min';
  }

  return `${etaMinutes} min`;
}

function formatRestart(requiresRestart?: boolean, restartType?: string): string {
  if (requiresRestart === undefined) {
    return FALLBACK_RESTART;
  }

  if (!requiresRestart) {
    return 'No restart required';
  }

  if (restartType) {
    return restartType;
  }

  return 'Restart required';
}

function formatReleaseDate(value?: string): string {
  if (!value) {
    return 'Release date TBD';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ChangelogDrawer({ open, onClose }: ChangelogDrawerProps) {
  const [releases, setReleases] = useState<ChangelogRelease[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    async function loadChangelog() {
      setLoading(true);
      try {
        const module = await import('@/data/updates/changelogs');
        const dataset = module.getChangelogReleases
          ? await module.getChangelogReleases()
          : (module.default as ChangelogRelease[] | undefined);

        if (!active) {
          return;
        }

        if (dataset && dataset.length > 0) {
          setReleases(dataset);
          setError(false);
        } else {
          setReleases([]);
          setError(false);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setError(true);
        setReleases([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadChangelog();

    return () => {
      active = false;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`skeleton-${index}`}>{skeletonCard}</div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <p className="text-sm text-slate-300">
          We couldn't load the changelog just now. Try refreshing the drawer in a moment.
        </p>
      );
    }

    if (!releases || releases.length === 0) {
      return (
        <p className="text-sm text-slate-300">
          There are no recorded updates yet. Check back later for new package releases.
        </p>
      );
    }

    return (
      <div className="space-y-6">
        {releases.map((release) => {
          const packages = release.packages ?? [];

          return (
            <section key={release.id} className="space-y-3">
              <header>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {formatReleaseDate(release.releasedAt)}
                </p>
                <h3 className="text-lg font-semibold text-slate-100">
                  {release.release ?? 'Unnamed release'}
                </h3>
              </header>
              <div className="space-y-3">
                {packages.length === 0 ? (
                  <p className="text-sm text-slate-300">
                    This release does not list any package changes yet.
                  </p>
                ) : (
                  packages.map((pkg) => (
                    <article
                      key={`${release.id}-${pkg.id}`}
                      className="rounded-lg border border-slate-700 bg-slate-900/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-slate-100 truncate">
                              {pkg.name ?? 'Unnamed package'}
                            </h4>
                            {pkg.version ? (
                              <span className="text-xs text-slate-400">v{pkg.version}</span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-300">
                            {pkg.summary ?? FALLBACK_SUMMARY}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${resolveBadgeStyle(pkg.category)}`}>
                          {formatCategory(pkg.category)}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-200 sm:grid-cols-3">
                        <div>
                          <dt className="font-semibold text-slate-400">Size</dt>
                          <dd>{pkg.size ?? FALLBACK_SIZE}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-400">ETA</dt>
                          <dd>{formatEta(pkg.etaMinutes)}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-400">Restart</dt>
                          <dd>{formatRestart(pkg.requiresRestart, pkg.restartType)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 text-xs">
                        {(pkg.cves ?? []).length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-400">CVEs:</span>
                            {pkg.cves!.map((cve) => (
                              <Link
                                key={`${pkg.id}-${cve}`}
                                href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold text-blue-200 transition hover:border-blue-400 hover:text-blue-100"
                              >
                                {cve}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400">No CVEs are associated with this update.</p>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  }, [error, loading, releases]);

  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Update center changelog"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-slate-950 shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Update Center</p>
            <h2 className="text-xl font-semibold text-slate-100">Changelog</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-2 py-1 text-lg leading-none text-slate-300 transition hover:border-slate-500 hover:text-white"
            aria-label="Close changelog"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{content}</div>
      </aside>
    </div>
  );
}

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, type ChangeEvent } from 'react';

import {
  DOCS_LATEST_VERSION,
  DOCS_LATEST_VERSION_ID,
  type DocsVersion,
} from '../../lib/docs/versions';
import type { DocNavSection } from '../../lib/docs/types';
import { buildDocsVersionPath } from '../../lib/docs/urls';

import VersionBanner from './VersionBanner';

export interface DocPageProps {
  routeVersionId: string;
  requestedVersionId: string;
  requestedVersionLabel: string;
  resolvedVersionId: string;
  resolvedVersionLabel: string;
  latestVersionId: string;
  latestVersionLabel: string;
  nav: DocNavSection[];
  doc?: { slug: string; title: string; html: string } | null;
  fallbackVersionId?: string | null;
  activeSlug?: string | null;
  isIndex: boolean;
  availableVersions: DocsVersion[];
  docCount: number;
  aliasForLatest?: boolean;
}

const DocVersionPage = ({
  routeVersionId,
  requestedVersionId,
  requestedVersionLabel,
  resolvedVersionId,
  resolvedVersionLabel,
  latestVersionId,
  latestVersionLabel,
  nav,
  doc,
  fallbackVersionId,
  activeSlug,
  isIndex,
  availableVersions,
  docCount,
  aliasForLatest,
}: DocPageProps) => {
  const router = useRouter();
  const currentSelection = aliasForLatest ? 'latest' : routeVersionId;
  const routeVersionForLinks = aliasForLatest ? 'latest' : routeVersionId;
  const normalizedActiveSlug = activeSlug ?? undefined;

  const versionOptions = useMemo(
    () => [
      { id: 'latest', label: `Latest (${DOCS_LATEST_VERSION.label})` },
      ...availableVersions.map((version) => ({ id: version.id, label: version.label })),
    ],
    [availableVersions]
  );

  const handleVersionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === currentSelection) return;
    const targetPath = value === 'latest'
      ? buildDocsVersionPath('latest', normalizedActiveSlug)
      : buildDocsVersionPath(value, normalizedActiveSlug);
    void router.push(targetPath);
  };

  const pageTitle = doc?.title
    ? `${doc.title} | ${resolvedVersionLabel} Docs`
    : `${requestedVersionLabel} Docs`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="lg:w-64">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="docs-version-select">
              Version
            </label>
            <select
              id="docs-version-select"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={currentSelection}
              onChange={handleVersionChange}
            >
              {versionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <nav className="mt-6 space-y-4">
            {nav.map((section) => (
              <div key={section.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</p>
                <ul className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const href = buildDocsVersionPath(routeVersionForLinks, item.slug);
                    const isActive = normalizedActiveSlug === item.slug;
                    const baseClasses =
                      'block rounded-md px-3 py-2 text-sm transition hover:bg-slate-100 hover:text-slate-900';
                    const activeClasses = isActive ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-600';
                    const unavailableClasses = item.unavailable ? 'border border-dashed border-yellow-400' : '';
                    return (
                      <li key={item.slug}>
                        <Link className={`${baseClasses} ${activeClasses} ${unavailableClasses}`} href={href}>
                          {item.title}
                        </Link>
                        {item.unavailable && (
                          <p className="mt-1 px-3 text-xs text-yellow-700">
                            Not available in {requestedVersionLabel}; showing {latestVersionLabel}.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="mb-6 border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900">{requestedVersionLabel}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {isIndex
                ? `${docCount} documents available in ${resolvedVersionLabel}. Use the sidebar to navigate by topic.`
                : resolvedVersionId !== requestedVersionId && fallbackVersionId
                ? `Content shown from ${resolvedVersionLabel} because this page was not published in ${requestedVersionLabel}.`
                : `You are viewing guidance for ${resolvedVersionLabel}.`}
            </p>
          </header>

          <VersionBanner
            requestedVersionId={requestedVersionId}
            requestedVersionLabel={requestedVersionLabel}
            resolvedVersionId={resolvedVersionId}
            resolvedVersionLabel={resolvedVersionLabel}
            latestVersionId={latestVersionId}
            latestVersionLabel={latestVersionLabel}
            fallbackVersionId={fallbackVersionId ?? undefined}
            isAliasRequest={aliasForLatest}
          />

          {isIndex ? (
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Start exploring</h2>
              <p className="mt-2 text-sm text-slate-600">
                Select a document from the sidebar or jump to frequently referenced guides below.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {nav
                  .flatMap((section) => section.items.filter((item) => !item.unavailable).slice(0, 3))
                  .map((item) => {
                    const href = buildDocsVersionPath(routeVersionForLinks, item.slug);
                    return (
                      <Link
                        key={`summary-${item.slug}`}
                        className="rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-blue-600 hover:border-blue-400 hover:text-blue-500"
                        href={href}
                      >
                        {item.title}
                      </Link>
                    );
                  })}
              </div>
            </section>
          ) : doc ? (
            <article className="prose prose-slate max-w-none">
              <div dangerouslySetInnerHTML={{ __html: doc.html }} />
            </article>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
              The requested document could not be loaded.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default DocVersionPage;

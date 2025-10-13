import Head from 'next/head';
import Link from 'next/link';

import { DOCS_LATEST_VERSION, DOCS_VERSIONS } from '../../lib/docs/versions';
import { buildDocsLatestPath, buildDocsVersionPath } from '../../lib/docs/urls';

export default function DocsIndexPage() {
  return (
    <>
      <Head>
        <title>Documentation | Kali Portfolio</title>
      </Head>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Documentation</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Browse the Kali Portfolio documentation by version. The latest release bundles active guidance, while older snapshots
          remain available for reference.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-800">Latest</h2>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{DOCS_LATEST_VERSION.label}</h3>
            <p className="mt-2 text-sm text-slate-600">{DOCS_LATEST_VERSION.summary}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Released {DOCS_LATEST_VERSION.releaseDate}</p>
            <Link className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500" href={buildDocsLatestPath()}>
              View latest docs
            </Link>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-800">All versions</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {DOCS_VERSIONS.map((version) => (
              <div key={version.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{version.label}</h3>
                <p className="mt-2 text-sm text-slate-600">{version.summary}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">Released {version.releaseDate}</p>
                <Link
                  className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  href={buildDocsVersionPath(version.id)}
                >
                  Browse version
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

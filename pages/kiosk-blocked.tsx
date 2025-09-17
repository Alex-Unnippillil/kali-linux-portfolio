import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { kioskAllowedApps, kioskAllowedRoutes, kioskAppLabel } from '../lib/kiosk';

function humanizeSlug(slug: string): string {
  return slug
    .split('/')
    .map((segment) =>
      segment
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
    )
    .join(' / ');
}

const kioskRoutesForDisplay = kioskAllowedRoutes.filter((route) => route.path !== '/kiosk-blocked');

export default function KioskBlockedPage() {
  const router = useRouter();
  const attemptedPathParam = router.query.from;
  const attemptedAppParam = router.query.app;

  const attemptedPath =
    router.isReady && typeof attemptedPathParam === 'string' ? attemptedPathParam : undefined;
  const attemptedApp =
    router.isReady && typeof attemptedAppParam === 'string' ? attemptedAppParam : undefined;
  const attemptedAppName = attemptedApp
    ? kioskAppLabel(attemptedApp) ?? humanizeSlug(attemptedApp)
    : undefined;

  return (
    <>
      <Head>
        <title>Kiosk mode restriction</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 py-12 text-white">
        <div className="w-full max-w-3xl space-y-6 rounded-lg border border-gray-700 bg-black/50 p-8 shadow-xl">
          <header className="space-y-2 text-center">
            <p className="text-sm uppercase tracking-widest text-indigo-300">Kiosk mode active</p>
            <h1 className="text-3xl font-semibold">This experience is locked</h1>
            <p className="text-lg text-gray-300">
              {attemptedAppName
                ? `The ${attemptedAppName} app is not available in this kiosk session.`
                : 'This kiosk session is limited to a curated list of apps.'}
            </p>
          </header>

          {attemptedPath && (
            <p className="rounded border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm text-gray-300">
              Requested URL:
              <code className="ml-2 rounded bg-black/70 px-2 py-1 font-mono text-indigo-200">{attemptedPath}</code>
            </p>
          )}

          <p className="text-gray-300">
            To keep the kiosk focused, only a few destinations are available. Choose one of the options below to continue.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {kioskRoutesForDisplay.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className="rounded bg-indigo-600 px-4 py-3 text-center font-medium shadow transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                {route.label}
              </Link>
            ))}
          </div>

          <section aria-labelledby="available-apps" className="space-y-3">
            <div className="space-y-1 text-center sm:text-left">
              <h2 id="available-apps" className="text-2xl font-semibold">
                Apps available in kiosk mode
              </h2>
              <p className="text-sm text-gray-400">
                These links open the apps that remain accessible for this session.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {kioskAllowedApps.map((app) => (
                <li
                  key={app.slug}
                  className="flex items-center justify-between rounded border border-gray-700 bg-gray-900/60 px-4 py-3"
                >
                  <span>{app.title}</span>
                  <Link
                    href={`/apps/${app.slug}`}
                    className="text-sm text-indigo-300 underline transition hover:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <footer className="text-center text-xs text-gray-500">
            Need broader access? Contact the kiosk owner for help.
          </footer>
        </div>
      </main>
    </>
  );
}

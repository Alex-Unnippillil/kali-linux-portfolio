import Head from 'next/head';
import Link from 'next/link';

const TroubleshootingPage = () => {
  return (
    <>
      <Head>
        <title>Troubleshooting · Kali Portfolio</title>
        <meta
          name="description"
          content="Step-by-step instructions for recovering from app errors and capturing sanitized logs."
        />
      </Head>
      <main className="mx-auto max-w-4xl space-y-12 px-4 py-12 text-slate-100">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-emerald-300">Support</p>
          <h1 className="text-3xl font-semibold">Troubleshooting errors</h1>
          <p className="text-base text-slate-300">
            Use this guide to recover when an app window or the entire desktop shell fails. The new error screen surfaces a
            stack trace, a retry action, and a link back to this reference so you can follow deeper recovery steps.
          </p>
        </header>

        <section id="error-screen" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Understand the error screen</h2>
          <ul className="list-disc space-y-2 pl-5 text-slate-300">
            <li>
              <strong>Summary.</strong> The header highlights where the failure happened (desktop shell vs. individual app)
              and outlines the next recommended step.
            </li>
            <li>
              <strong>Code frame.</strong> The stack trace preview is trimmed and already sanitized by the logger so it can be
              safely shared with maintainers.
            </li>
            <li>
              <strong>Actions.</strong> Retry reloads the surface, while the troubleshooting link routes back to this page for
              additional recovery options.
            </li>
          </ul>
        </section>

        <section id="retry-flow" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Retry workflow</h2>
          <ol className="list-decimal space-y-2 pl-5 text-slate-300">
            <li>
              Select <strong>Retry</strong> on the error screen. App windows reset their boundary state, while the global desktop
              shell triggers a full page refresh.
            </li>
            <li>Resume your session if the retry succeeds.</li>
            <li>If the error immediately reappears, proceed to the log capture steps.</li>
          </ol>
        </section>

        <section id="app-catalog" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. App catalog recovery</h2>
          <p className="text-slate-300">
            When the app catalog fails to load, use the retry button to trigger another fetch. The boundary clears the cached
            data and runs the import again. Persistent failures usually indicate a build or deployment issue—capture logs and
            escalate.
          </p>
        </section>

        <section id="app-recovery" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Recover a single app</h2>
          <p className="text-slate-300">
            A crashing window keeps the rest of the desktop alive. Use Retry to relaunch the module. You can also open a
            different app to verify the workspace remains stable while you gather logs for the failing module.
          </p>
        </section>

        <section id="log-export" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Capture sanitized logs</h2>
          <ol className="list-decimal space-y-2 pl-5 text-slate-300">
            <li>Open the browser developer tools and switch to the <strong>Console</strong> tab.</li>
            <li>
              Locate the JSON-formatted entries. Each entry includes a <code>correlationId</code> so you can link multiple
              logs to the same incident.
            </li>
            <li>
              Secrets are automatically replaced with <code>[REDACTED]</code>, circular structures show up as <code>[Circular]</code>,
              and very long strings are truncated. This keeps the logs shareable by design.
            </li>
            <li>Copy the relevant entries and attach them to your bug report or support request.</li>
          </ol>
        </section>

        <section id="manual-checklist" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Manual recovery checklist</h2>
          <ol className="list-decimal space-y-2 pl-5 text-slate-300">
            <li>Refresh the browser tab to clear cached bundles.</li>
            <li>
              Clear local storage (<code>localStorage.clear()</code>) if layout data may be corrupt. Sign back in afterward if
              required.
            </li>
            <li>Perform a hard refresh (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>) to force the service worker to fetch the latest build.</li>
            <li>If several apps fail, gather logs and escalate—this usually signals a wider build issue.</li>
          </ol>
        </section>

        <section id="reporting" className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">7. Report the issue</h2>
          <p className="text-slate-300">
            Include the failing app, timestamp, screenshots of the error screen, sanitized logs, and the recovery steps you
            tried. Sharing the <code>correlationId</code> accelerates triage.
          </p>
          <p className="text-slate-400">
            Need to file a ticket? Head to{' '}
            <Link
              className="text-emerald-300 underline decoration-dotted underline-offset-4 hover:text-emerald-200"
              href="https://github.com/Alex-Unnippillil/kali-linux-portfolio/issues/new/choose"
              target="_blank"
              rel="noreferrer"
            >
              the GitHub issue tracker
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
};

export default TroubleshootingPage;

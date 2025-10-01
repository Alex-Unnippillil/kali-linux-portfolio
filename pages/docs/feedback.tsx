import Head from 'next/head';

const FeedbackDocs = () => (
  <>
    <Head>
      <title>Feedback workflow</title>
    </Head>
    <main className="mx-auto max-w-3xl px-6 py-10 text-slate-100">
      <h1 className="text-3xl font-semibold">Feedback workflow</h1>
      <p className="mt-4 text-slate-300">
        Use the desktop feedback dialog to report bugs, request features, or attach diagnostics that help the maintainer triage
        issues quickly.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">How to submit</h2>
        <ol className="ml-5 list-decimal space-y-2 text-slate-200">
          <li>Open the Whisker menu and choose an app or press the feedback shortcut to open the dialog.</li>
          <li>Describe the problem in the summary and details fields. The more context you add, the faster we can reproduce it.</li>
          <li>
            Tick the diagnostics checkbox if you consent to share an anonymized bundle that includes a state hash and vitals
            snapshot.
          </li>
          <li>Press “Send report”. You will see a confirmation message when the submission succeeds.</li>
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">What diagnostics include</h2>
        <p className="text-slate-300">
          Diagnostics never contain raw logs or credentials. We hash a sanitized version of the active desktop state and capture a
          lightweight vitals snapshot (user agent, viewport, memory stats, and timestamp). Redaction utilities replace obvious
          emails, tokens, and keys before hashing or sending.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold">Privacy and support endpoints</h2>
        <p className="text-slate-300">
          Reports are posted to the support endpoint when available. In local or offline builds we fall back to the simulated
          `/api/dummy` route so you can still test the flow without leaking data. Analytics events emit only if tracking is
          enabled in your environment.
        </p>
      </section>
    </main>
  </>
);

export default FeedbackDocs;

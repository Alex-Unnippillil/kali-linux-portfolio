import Head from 'next/head';
import Link from 'next/link';

export default function EmbedConsentDoc() {
  return (
    <>
      <Head>
        <title>Embedded media consent | Kali Linux Portfolio</title>
        <meta
          name="description"
          content="Learn how to control third-party embeds and manage privacy preferences within the Kali Linux Portfolio."
        />
      </Head>
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12 text-ubt-grey">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-ubt-grey/70">Privacy controls</p>
          <h1 className="text-3xl font-semibold text-white">Embedded media consent</h1>
          <p className="max-w-2xl">
            The portfolio ships with simulated tools that depend on external services (for example, StackBlitz or Twitter embeds).
            These integrations are opt-in to reduce unsolicited tracking. By default, third-party frames and script embeds are blocked
            until you explicitly opt in.
          </p>
        </header>
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">How consent works</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>A banner appears on first load explaining why embedded content is disabled and provides a quick toggle to enable it.</li>
            <li>Individual embeds include inline prompts so you can load a single item once or enable embeds globally.</li>
            <li>Preferences persist in your browser via <code>localStorage</code> under the <code>allow-embeds</code> key.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Update the preference</h2>
          <p>
            Open the <strong>Settings</strong> app from the launcher and enable <strong>Allow Embedded Media</strong> under the accessibility and
            privacy controls. Disabling the toggle immediately blocks new embeds while keeping currently rendered content until refresh.
          </p>
          <p>
            For automated demos you can seed the preference with{' '}
            <code>window.localStorage.setItem(&apos;allow-embeds&apos;, &apos;true&apos;)</code> before bootstrapping the desktop.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Per-embed overrides</h2>
          <p>
            Each embed component checks the global setting before fetching remote code. If you prefer not to allow all embeds, choose
            <strong> Load once</strong> directly within the component to fetch a single time without changing persistent storage.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">Adding new embeds</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Import <code>useSettings</code> and honor the <code>allowEmbeds</code> flag before starting any network request.</li>
            <li>
              Provide fallback UI with buttons to &ldquo;Always allow embeds&rdquo; (calling <code>setAllowEmbeds(true)</code>) and
              &ldquo;Load once&rdquo;.
            </li>
            <li>Avoid prefetching or injecting scripts prior to consent, and document the provider’s data practices.</li>
          </ol>
        </section>
        <footer className="border-t border-ubt-cool-grey pt-6 text-sm text-ubt-grey/80">
          <p>
            Need to adjust other privacy settings? Visit the{' '}
            <Link className="underline" href="/apps/settings">
              Settings app
            </Link>{' '}
            or review the project documentation in the repository.
          </p>
        </footer>
      </main>
    </>
  );
}

import Head from 'next/head';
import type { ReactNode } from 'react';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="flex flex-wrap items-start gap-3">{children}</div>
  </section>
);

export default function ButtonGallery() {
  return (
    <>
      <Head>
        <title>Button Tokens</title>
      </Head>
      <main
        className="min-h-screen bg-ub-grey/95 p-6 text-sm text-white"
        data-testid="button-gallery"
      >
        <div className="max-w-3xl space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold">Button variants</h1>
            <p className="text-ubt-grey">
              This gallery exercises the shared button tokens. Each sample uses the <code>btn</code> base
              class and applies variants to demonstrate hover, pressed, and disabled states.
            </p>
          </header>
          <Section title="Neutral actions">
            <button type="button" className="btn">
              Default surface
            </button>
            <button type="button" className="btn" disabled>
              Disabled surface
            </button>
            <button type="button" className="btn btn--dense">
              Dense surface
            </button>
          </Section>
          <Section title="Emphasised actions">
            <button type="button" className="btn btn--primary">
              Primary
            </button>
            <button type="button" className="btn btn--success">
              Success
            </button>
            <button type="button" className="btn btn--warning">
              Warning
            </button>
            <button type="button" className="btn btn--danger">
              Danger
            </button>
          </Section>
          <Section title="Ghost and toolbar buttons">
            <button type="button" className="btn btn--ghost">
              Ghost
            </button>
            <button type="button" className="btn btn--ghost" aria-pressed="true">
              Pressed ghost
            </button>
            <button type="button" className="btn btn--ghost btn--toolbar" aria-expanded="false">
              Toolbar
            </button>
            <button type="button" className="btn btn--ghost btn--toolbar is-active" aria-expanded="true">
              Toolbar active
            </button>
          </Section>
          <Section title="Icon buttons">
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Copy">
              📋
            </button>
            <button type="button" className="btn btn--primary btn--icon" aria-label="Confirm">
              ✓
            </button>
            <button
              type="button"
              className="btn btn--danger btn--icon"
              aria-label="Delete"
              disabled
            >
              ✕
            </button>
          </Section>
        </div>
      </main>
    </>
  );
}

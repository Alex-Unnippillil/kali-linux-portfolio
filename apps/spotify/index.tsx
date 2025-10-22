import { SpotifyWebPlayerLayout } from "../../components/apps/spotify";

const SpotifyPage = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[color:var(--color-text)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:px-12">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--kali-text-muted)]">
            Spotify playlist
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold">Spotify Web Player &mdash; Synthwave Control Room</h1>
            <p className="text-sm text-[color:var(--kali-text-subtle)]">
              Experience the same embedded playlist used on the desktop inside a Spotify-inspired shell. The layout mirrors the
              familiar navigation rail, queue, and playlist hero so visitors immediately recognise the interface.
            </p>
          </div>
        </header>

        <SpotifyWebPlayerLayout
          className="min-h-[32rem]"
          description="Resize the window, keep it pinned, or pop it out entirely — the embed remains active so your soundtrack keeps pace with the rest of the portfolio."
        />

        <section className="grid gap-4 rounded-2xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_92%,transparent)] p-6 text-sm text-[color:color-mix(in_srgb,var(--color-text)_72%,transparent)]">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[color:var(--kali-text-muted)]">Why embed?</h2>
            <p className="mt-2 leading-relaxed">
              The Spotify Web Player offers the richest, most recognisable experience for music inside the portfolio. Embedding
              keeps playback managed by Spotify while the Kali-style chrome frames the experience.
            </p>
          </div>
          <ul className="grid gap-2 text-xs leading-relaxed sm:grid-cols-2">
            <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_96%,transparent)] p-3">
              Familiar layout with sidebar navigation, playlist hero, and queue carding.
            </li>
            <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_96%,transparent)] p-3">
              Fully resizable window courtesy of the desktop manager &mdash; minimise, maximise, or snap alongside other apps.
            </li>
            <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_96%,transparent)] p-3">
              Uses Spotify&apos;s player controls, ensuring playback continues even as you explore other tools.
            </li>
            <li className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_96%,transparent)] p-3">
              No tokens required &mdash; the embed streams Spotify&apos;s curated synthwave mix for every visitor.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default SpotifyPage;

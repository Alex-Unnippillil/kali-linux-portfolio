"use client";

const PLAYLIST_EMBED_URL =
  "https://open.spotify.com/embed/playlist/37i9dQZF1E8NOMDYRneOXj?utm_source=generator";

const SpotifyApp = () => {
  return (
    <div className="flex h-full min-h-[26rem] w-full flex-col gap-4 bg-[var(--color-bg)] p-6 text-[color:var(--color-text)]">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--kali-text-muted)]">
          Spotify playlist
        </p>
        <h1 className="text-xl font-semibold">Synthwave Control Room</h1>
        <p className="text-sm text-[color:var(--kali-text-subtle)]">
          Enjoy a curated set of retro-futuristic beats embedded directly into the Kali desktop shell. Use the window controls to
          resize, minimise, or pop the player alongside your other tools.
        </p>
      </header>

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_86%,transparent)] shadow-[0_28px_60px_rgba(7,14,24,0.65)]">
        <iframe
          src={PLAYLIST_EMBED_URL}
          title="Spotify synthwave playlist"
          className="absolute inset-0 h-full w-full"
          frameBorder="0"
          style={{ border: "none", borderRadius: "inherit" }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      <p className="text-xs leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
        Tip: open multiple windows and pin this playlist while you explore the rest of the portfolio experience — everything runs
        locally, so playback keeps going even when you browse other apps.
      </p>
    </div>
  );
};

export default SpotifyApp;

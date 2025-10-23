const PLAYLIST_URL = 'https://open.spotify.com/embed/playlist/37i9dQZF1DXaf6XmhwlgC6?utm_source=generator';

export function SpotifyWebPlayerLayout({ description, className = '' }) {
  return (
    <div className={`flex flex-1 flex-col ${className}`}>
      <div className="flex flex-1 min-h-[18rem] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0b0d11] via-[#07090c] to-[#040506] text-white shadow-[0_32px_64px_rgba(4,6,10,0.7)]">
        <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#1DB954]" aria-hidden />
            Spotify
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium text-white/40">
            <span className="inline-flex h-2 w-2 rounded-full bg-white/20" aria-hidden />
            Direct iframe view
          </div>
        </header>

        <div className="relative flex-1 bg-black/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 via-transparent to-transparent" aria-hidden />
          <iframe
            src={PLAYLIST_URL}
            title="Spotify playlist"
            className="h-full w-full"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>

      {description ? (
        <p className="mt-5 text-xs leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function SpotifyApp() {
  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] p-5 text-[color:var(--color-text)]">
      <SpotifyWebPlayerLayout description="Open the full Spotify playlist in a dedicated iframe window. Resize, minimise, or pin it anywhere on the desktop while the web player runs live inside the frame." />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

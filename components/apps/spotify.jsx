const PLAYLIST_EMBED_URL =
  'https://open.spotify.com/embed/playlist/37i9dQZF1E8NOMDYRneOXj?utm_source=generator';

export default function SpotifyApp() {
  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] p-4 text-[color:var(--color-text)]">
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_86%,transparent)] shadow-[0_28px_60px_rgba(7,14,24,0.65)]">
        <iframe
          src={PLAYLIST_EMBED_URL}
          title="Spotify playlist"
          className="absolute inset-0 h-full w-full"
          frameBorder="0"
          style={{ border: 'none', borderRadius: 'inherit' }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <p className="text-xs leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
        Stream a curated synthwave playlist right inside the Kali desktop. The window chrome lets you resize, minimise, or
        maximise the experience just like any other built-in app.
      </p>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

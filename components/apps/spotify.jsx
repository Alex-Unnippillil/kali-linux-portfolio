import EmbedFrame from '../EmbedFrame';

export const SPOTIFY_EMBED_URL =
  'https://open.spotify.com/embed/playlist/37i9dQZEVXcCKlDWFOXnz9?utm_source=generator&si=01287378a9054dbc';

export function SpotifyEmbed({ className = '', containerClassName = '' }) {
  return (
    <EmbedFrame
      src={SPOTIFY_EMBED_URL}
      title="Spotify playlist embed"
      className={className || 'h-full w-full border-0'}
      containerClassName={
        containerClassName || 'relative h-full w-full overflow-hidden bg-black'
      }
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      openInNewTabLabel="Open on Spotify"
      fallbackLabel="Open on Spotify"
      loadingLabel="Loading Spotify player…"
    />
  );
}

export default function SpotifyApp() {
  return (
    <div className="h-full w-full bg-[var(--color-bg)] text-[color:var(--color-text)]">
      <SpotifyEmbed />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

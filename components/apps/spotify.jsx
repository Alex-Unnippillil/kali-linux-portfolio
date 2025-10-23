const PLAYLIST_EMBED_URL =
  'https://open.spotify.com/embed/playlist/37i9dQZF1E8NOMDYRneOXj?utm_source=generator';

export function SpotifyEmbedFrame({ className = '' }) {
  return (
    <iframe
      src={PLAYLIST_EMBED_URL}
      title="Spotify playlist embed"
      className={`h-full w-full ${className}`.trim()}
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}

export default function SpotifyApp() {
  return <SpotifyEmbedFrame className="h-full w-full" />;
}

export const displaySpotify = () => <SpotifyApp />;

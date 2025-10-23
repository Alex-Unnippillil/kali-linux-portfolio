const PLAYLIST_EMBED_URL =
  'https://open.spotify.com/embed/playlist/37i9dQZF1E8NOMDYRneOXj?utm_source=generator';

export default function SpotifyApp() {
  return (
    <iframe
      src={PLAYLIST_EMBED_URL}
      title="Spotify playlist"
      className="h-full w-full"
      frameBorder="0"
      style={{ border: 'none' }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
    />
  );
}

export const displaySpotify = () => <SpotifyApp />;

import { useEffect, useRef, useState } from 'react';

const SAMPLE_TRACKS = [
  { title: 'Song 1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { title: 'Song 2', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'Song 3', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function SpotifyApp() {
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState(null);
  const [index, setIndex] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('spotify-token') : null;
    if (!token) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const p = new window.Spotify.Player({
        name: 'Portfolio Player',
        getOAuthToken: cb => cb(token),
      });

      p.addListener('ready', () => setConnected(true));
      p.addListener('not_ready', () => setConnected(false));

      p.connect();
      setPlayer(p);
    };

    return () => {
      player?.disconnect();
      delete window.onSpotifyWebPlaybackSDKReady;
    };
  }, [player]);

  const nextSample = () => setIndex(i => (i + 1) % SAMPLE_TRACKS.length);
  const prevSample = () => setIndex(i => (i - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.load();
    }
  }, [index]);

  const toggleSample = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const containerClasses =
    'relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border border-white/10 bg-kali-surface/90 px-6 py-8 text-white shadow-kali-panel';

  const controlButtonClasses =
    'group relative flex h-12 w-12 items-center justify-center rounded-full border border-kali-accent/45 bg-kali-accent/15 text-xl text-kali-accent shadow-[0_10px_30px_rgba(15,148,210,0.18)] transition hover:bg-kali-accent/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35 disabled:shadow-none disabled:hover:bg-white/5 disabled:hover:text-white/35';

  const accentOverlays = (
    <>
      <div className="pointer-events-none absolute inset-x-10 top-0 h-1 bg-gradient-to-r from-transparent via-kali-accent/80 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-10 h-24 w-1 bg-gradient-to-b from-transparent via-kali-accent/70 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 translate-x-16 translate-y-16 rounded-full bg-[radial-gradient(circle_at_center,var(--color-accent)_0%,transparent_70%)] opacity-30" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,var(--color-accent)_0%,transparent_70%)] opacity-20" />
    </>
  );

  return connected && player ? (
    <div className={containerClasses}>
      {accentOverlays}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-kali-accent">Spotify Connected</p>
        <p className="text-base text-white/80">Control playback from any active device linked to your account.</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={controlButtonClasses}
            onClick={() => player.previousTrack()}
            aria-label="Previous track"
          >
            ⏮
          </button>
          <button
            type="button"
            className={controlButtonClasses}
            onClick={() => player.togglePlay()}
            aria-label="Play or pause"
          >
            ⏯
          </button>
          <button
            type="button"
            className={controlButtonClasses}
            onClick={() => player.nextTrack()}
            aria-label="Next track"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className={containerClasses}>
      {accentOverlays}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-kali-accent">Sample Deck</p>
        <p className="text-base text-white/80">Preview CC‑licensed tracks while the Spotify Web SDK is disconnected.</p>
        <audio ref={audioRef} src={SAMPLE_TRACKS[index].url} onEnded={nextSample} className="hidden" />
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={controlButtonClasses}
            onClick={prevSample}
            aria-label="Previous sample"
          >
            ⏮
          </button>
          <button
            type="button"
            className={controlButtonClasses}
            onClick={toggleSample}
            aria-label="Play or pause sample"
          >
            ⏯
          </button>
          <button
            type="button"
            className={controlButtonClasses}
            onClick={nextSample}
            aria-label="Next sample"
          >
            ⏭
          </button>
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">{SAMPLE_TRACKS[index].title}</p>
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

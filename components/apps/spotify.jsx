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
  const captionTrackRef = useRef(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const track = captionTrackRef.current;
    if (track) {
      track.mode = captionsEnabled ? 'showing' : 'disabled';
    }
  }, [captionsEnabled]);

  const toggleSample = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const toggleMute = () => setIsMuted(muted => !muted);
  const toggleCaptions = () => setCaptionsEnabled(enabled => !enabled);

  return connected && player ? (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-black bg-opacity-30 text-white">
      <p>Spotify player connected.</p>
      <div className="flex gap-4">
        <button onClick={() => player.previousTrack()}>⏮</button>
        <button onClick={() => player.togglePlay()}>⏯</button>
        <button onClick={() => player.nextTrack()}>⏭</button>
      </div>
    </div>
  ) : (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-black bg-opacity-30 text-white">
      <p>Sample tracks (CC‑licensed)</p>
      <p id="spotify-audio-description" className="sr-only">
        Sample audio player. Tracks start muted, and captions describe playback controls.
      </p>
      <audio
        ref={audioRef}
        src={SAMPLE_TRACKS[index].url}
        onEnded={nextSample}
        muted={isMuted}
        aria-describedby="spotify-audio-description"
        data-testid="spotify-audio"
      >
        <track
          ref={captionTrackRef}
          kind="captions"
          srcLang="en"
          src="/captions/spotify-sample.vtt"
          label="Sample track information"
          default
        />
      </audio>
      <div className="flex gap-4">
        <button type="button" onClick={prevSample}>⏮</button>
        <button type="button" onClick={toggleSample}>⏯</button>
        <button type="button" onClick={nextSample}>⏭</button>
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={!isMuted}
          className="px-3 py-1 rounded bg-ub-dracula"
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          onClick={toggleCaptions}
          aria-pressed={captionsEnabled}
          className="px-3 py-1 rounded bg-purple-700"
        >
          {captionsEnabled ? 'Hide Captions' : 'Show Captions'}
        </button>
      </div>
      <p className="text-xs">{SAMPLE_TRACKS[index].title}</p>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

import { useEffect, useRef, useState } from 'react';

const SAMPLE_TRACKS = [
  { title: 'Song 1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { title: 'Song 2', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'Song 3', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function SpotifyApp() {
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [storedToken, setStoredToken] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [sdkStatus, setSdkStatus] = useState('idle');
  const [sdkError, setSdkError] = useState(null);
  const [index, setIndex] = useState(0);
  const audioRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedToken = window.localStorage.getItem('spotify-token');
    if (savedToken) {
      setStoredToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (!storedToken) {
      setConnected(false);
      setSdkStatus('idle');
      setSdkError(null);
      setDeviceId(null);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
      }
      return undefined;
    }

    let cancelled = false;

    const startPlayer = () => {
      if (cancelled || !window.Spotify) {
        if (!cancelled) {
          setSdkStatus('error');
          setSdkError('Spotify SDK did not initialize as expected.');
        }
        return;
      }

      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
      }

      const spotifyPlayer = new window.Spotify.Player({
        name: 'Portfolio Player',
        getOAuthToken: cb => cb(storedToken),
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        if (cancelled) return;
        setDeviceId(device_id);
        setConnected(true);
        setSdkStatus('ready');
        setSdkError(null);
      });

      spotifyPlayer.addListener('not_ready', () => {
        if (cancelled) return;
        setConnected(false);
        setSdkStatus('error');
        setSdkError('Spotify device went offline. Open Spotify to wake it.');
      });

      const wrapError = (label) => ({ message }) => {
        if (cancelled) return;
        setConnected(false);
        setSdkStatus('error');
        setSdkError(`${label} error: ${message}`);
      };

      spotifyPlayer.addListener('initialization_error', wrapError('Initialization'));
      spotifyPlayer.addListener('authentication_error', wrapError('Authentication'));
      spotifyPlayer.addListener('account_error', wrapError('Account'));
      spotifyPlayer.addListener('playback_error', wrapError('Playback'));

      spotifyPlayer.connect().then(success => {
        if (cancelled) return;
        if (!success) {
          setSdkStatus('error');
          setSdkError('Unable to connect to Spotify. Check your token and active devices.');
        }
      });

      playerRef.current = spotifyPlayer;
      setPlayer(spotifyPlayer);
    };

    const ensureSdkLoaded = () => {
      if (window.Spotify) {
        startPlayer();
        return;
      }

      window.onSpotifyWebPlaybackSDKReady = startPlayer;

      let script = document.getElementById('spotify-sdk');
      if (!script) {
        script = document.createElement('script');
        script.id = 'spotify-sdk';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        script.onerror = () => {
          if (cancelled) return;
          setSdkStatus('error');
          setSdkError('Failed to load the Spotify SDK script.');
        };
        document.body.appendChild(script);
      }
    };

    setConnected(false);
    setDeviceId(null);
    setSdkError(null);
    setSdkStatus('loading');
    ensureSdkLoaded();

    return () => {
      cancelled = true;
      if (window.onSpotifyWebPlaybackSDKReady === startPlayer) {
        delete window.onSpotifyWebPlaybackSDKReady;
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [storedToken]);

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

  const handleTokenSubmit = event => {
    event.preventDefault();
    const trimmed = tokenInput.trim();
    if (trimmed.length < 20) {
      setSdkStatus('error');
      setSdkError('The token looks too short. Paste a full Web Playback SDK token.');
      return;
    }

    try {
      if (typeof window === 'undefined') {
        throw new Error('Token storage is only available in the browser.');
      }
      window.localStorage.setItem('spotify-token', trimmed);
      setStoredToken(trimmed);
      setTokenInput('');
      setSdkError(null);
      setSdkStatus('loading');
      setConnected(false);
      setDeviceId(null);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayer(null);
      }
    } catch (error) {
      setSdkStatus('error');
      setSdkError('Unable to store the token in this browser.');
    }
  };

  const handleRevokeToken = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('spotify-token');
    }
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    setPlayer(null);
    setStoredToken(null);
    setTokenInput('');
    setConnected(false);
    setDeviceId(null);
    setSdkStatus('idle');
    setSdkError(null);
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

  const statusMessage = () => {
    if (sdkStatus === 'ready' && connected) {
      return deviceId
        ? `Connected as device ${deviceId}. Pick "Portfolio Player" from Spotify to begin playback.`
        : 'Connected to Spotify. Pick "Portfolio Player" from Spotify to begin playback.';
    }

    if (sdkStatus === 'loading') {
      return 'Connecting to the Spotify Web Playback SDK…';
    }

    if (sdkStatus === 'error' && sdkError) {
      return sdkError;
    }

    if (storedToken) {
      return 'Token stored locally. Start playback on Spotify to finish connecting.';
    }

    return 'No SDK token stored — falling back to the offline sample deck.';
  };

  const statusClasses =
    sdkStatus === 'error'
      ? 'rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200'
      : 'rounded-lg border border-kali-accent/35 bg-kali-accent/10 px-4 py-3 text-sm text-kali-accent/90';

  const isConnected = connected && player;

  return (
    <div className={containerClasses}>
      {accentOverlays}
      <div className="relative z-10 flex w-full max-w-2xl flex-col gap-6 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6 text-left shadow-inner shadow-black/30 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Spotify Web Playback Setup</h2>
          <p className="mt-2 text-sm text-white/70">
            Paste a short-lived Web Playback SDK token from Spotify. The token is stored in this browser only and used to
            initialise the embedded player. Without it, the app stays in sample mode.
          </p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleTokenSubmit}>
            <input
              type="text"
              value={tokenInput}
              onChange={event => setTokenInput(event.target.value)}
              className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-kali-focus"
              placeholder="Paste your Web Playback SDK token"
              aria-label="Web Playback SDK token"
            />
            <button
              type="submit"
              className="rounded-lg border border-kali-accent/40 bg-kali-accent/20 px-4 py-2 text-sm font-medium text-kali-accent transition hover:bg-kali-accent/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
            >
              Save &amp; Connect
            </button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className={statusClasses}>{statusMessage()}</div>
            {storedToken ? (
              <button
                type="button"
                onClick={handleRevokeToken}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-red-500/40 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
              >
                Revoke token
              </button>
            ) : null}
          </div>
        </div>

        {isConnected ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center shadow-inner shadow-black/30 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-kali-accent">Spotify Player Connected</p>
            <p className="text-base text-white/80">
              Control playback from any active Spotify device linked to your account. The sample deck remains available if you
              revoke the token.
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={controlButtonClasses}
                onClick={() => player.previousTrack()}
                aria-label="Previous track on Spotify"
              >
                ⏮
              </button>
              <button
                type="button"
                className={controlButtonClasses}
                onClick={() => player.togglePlay()}
                aria-label="Play or pause on Spotify"
              >
                ⏯
              </button>
              <button
                type="button"
                className={controlButtonClasses}
                onClick={() => player.nextTrack()}
                aria-label="Next track on Spotify"
              >
                ⏭
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center shadow-inner shadow-black/30 backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-kali-accent">Sample Deck (Offline)</p>
            <p className="text-base text-white/80">
              Preview CC-licensed tracks while the Spotify Web Playback SDK is disconnected or waiting for authorisation.
            </p>
            <audio
              ref={audioRef}
              src={SAMPLE_TRACKS[index].url}
              onEnded={nextSample}
              className="hidden"
              aria-hidden="true"
            />
            <div className="flex items-center gap-4">
              <button
                type="button"
                className={controlButtonClasses}
                onClick={prevSample}
                aria-label="Previous sample track"
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
                aria-label="Next sample track"
              >
                ⏭
              </button>
            </div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">{SAMPLE_TRACKS[index].title}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

import React, { useEffect, useRef, useState } from 'react';
import initMediaSession, { openMiniController } from './mediaSession';

declare global {
  interface Window {
    onSpotifyIframeAPIReady: (IFrameAPI: any) => void;
  }
}

const playlists = [
  { name: 'Daily Mix 2', uri: 'spotify:playlist:37i9dQZF1E37fa3zdWtvQY' },
  { name: 'Top 50 Global', uri: 'spotify:playlist:37i9dQZEVXbMDoHDwVN2tF' },
];

export default function SpotifyApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<any>(null);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyIframeAPIReady = (IFrameAPI: any) => {
      if (!containerRef.current) return;
      const element = containerRef.current;
      const options = { uri: playlists[0].uri, theme: 0 };
      IFrameAPI.createController(element, options, (ctrl: any) => {
        setController(ctrl);
        initMediaSession(ctrl);
        ctrl.addListener('playback_update', (e: any) => {
          const state = e?.data || e;
          setPaused(state?.isPaused ?? false);
        });
      });
    };

    return () => {
      script.remove();
    };
  }, []);

  const changePlaylist = (e: React.ChangeEvent<HTMLSelectElement>) => {
    controller?.loadUri(e.target.value);
  };

  const openPiP = () => {
    if (controller) {
      openMiniController(controller, () => paused);
    }
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey flex flex-col">
      <div className="p-2 flex gap-2 items-center">
        <select
          onChange={changePlaylist}
          className="bg-ub-cool-grey text-white border border-ub-grey rounded px-1 py-0.5"
        >
          {playlists.map((p) => (
            <option key={p.uri} value={p.uri}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openPiP}
          className="text-white border border-ub-grey rounded px-2 py-0.5"
        >
          Mini Player
        </button>
      </div>
      <div className="flex-1" ref={containerRef} />
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

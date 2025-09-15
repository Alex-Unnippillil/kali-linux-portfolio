'use client';

import { useEffect, useRef, useState } from 'react';

function parseVideoId(input: string): string {
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1);
    }
    if (url.searchParams.get('v')) {
      return url.searchParams.get('v')!;
    }
    return input;
  } catch {
    return input;
  }
}

const ComparePlayers = () => {
  const leftDiv = useRef<HTMLDivElement>(null);
  const rightDiv = useRef<HTMLDivElement>(null);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [leftPlayer, setLeftPlayer] = useState<any>(null);
  const [rightPlayer, setRightPlayer] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.YT) {
      setReady(true);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.integrity =
      'sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb';
    tag.crossOrigin = 'anonymous';
    window.onYouTubeIframeAPIReady = () => setReady(true);
    document.body.appendChild(tag);
  }, []);

  useEffect(() => {
    if (!ready || !leftId || !leftDiv.current) return;
    const player = new window.YT.Player(leftDiv.current, {
      host: 'https://www.youtube-nocookie.com',
      videoId: leftId,
      playerVars: { origin: window.location.origin, rel: 0 },
    });
    setLeftPlayer(player);
  }, [ready, leftId]);

  useEffect(() => {
    if (!ready || !rightId || !rightDiv.current) return;
    const player = new window.YT.Player(rightDiv.current, {
      host: 'https://www.youtube-nocookie.com',
      videoId: rightId,
      playerVars: { origin: window.location.origin, rel: 0 },
    });
    setRightPlayer(player);
  }, [ready, rightId]);

  const playBoth = () => {
    if (leftPlayer && rightPlayer) {
      const t = leftPlayer.getCurrentTime();
      rightPlayer.seekTo(t, true);
      leftPlayer.playVideo();
      rightPlayer.playVideo();
    }
  };

  const pauseBoth = () => {
    leftPlayer?.pauseVideo();
    rightPlayer?.pauseVideo();
  };

  const syncRight = () => {
    if (leftPlayer && rightPlayer) {
      rightPlayer.seekTo(leftPlayer.getCurrentTime(), true);
    }
  };

  return (
    <div className="p-4 text-white">
      <div className="mb-4 flex gap-2">
        <input
          className="w-full rounded bg-gray-800 p-2"
          placeholder="Left video ID or URL"
          value={leftId}
          onChange={(e) => setLeftId(parseVideoId(e.target.value))}
        />
        <input
          className="w-full rounded bg-gray-800 p-2"
          placeholder="Right video ID or URL"
          value={rightId}
          onChange={(e) => setRightId(parseVideoId(e.target.value))}
        />
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          {leftId && <div ref={leftDiv} className="aspect-video w-full" />}
        </div>
        <div className="flex-1">
          {rightId && <div ref={rightDiv} className="aspect-video w-full" />}
        </div>
      </div>
      {leftPlayer && rightPlayer && (
        <div className="mt-4 flex gap-2">
          <button className="rounded bg-gray-700 px-3 py-1" onClick={playBoth}>
            Play
          </button>
          <button className="rounded bg-gray-700 px-3 py-1" onClick={pauseBoth}>
            Pause
          </button>
          <button className="rounded bg-gray-700 px-3 py-1" onClick={syncRight}>
            Sync
          </button>
        </div>
      )}
    </div>
  );
};

export default ComparePlayers;


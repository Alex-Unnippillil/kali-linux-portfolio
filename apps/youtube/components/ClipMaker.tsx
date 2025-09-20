'use client';

import React, { useEffect, useRef, useState } from 'react';
import copyToClipboard from '../../../utils/clipboard';

function extractVideoId(input: string): string {
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    const v = url.searchParams.get('v');
    return v || '';
  } catch {
    return input;
  }
}

export default function ClipMaker() {
  const playerRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoId, setVideoId] = useState('');
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setReady(true);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube-nocookie.com/iframe_api';
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setReady(true);
    return () => {
      delete (window as any).onYouTubeIframeAPIReady;
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || !videoId) return;
    if (playerRef.current) {
      playerRef.current.destroy();
    }
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined;
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        ...(origin ? { origin } : {}),
      },
    });
  }, [ready, videoId]);

  const markStart = () => {
    if (playerRef.current) {
      setStart(Math.floor(playerRef.current.getCurrentTime()));
    }
  };

  const markEnd = () => {
    if (playerRef.current) {
      setEnd(Math.floor(playerRef.current.getCurrentTime()));
    }
  };

  const link =
    videoId && start !== null && end !== null
      ? `https://www.youtube-nocookie.com/embed/${videoId}?start=${start}&end=${end}`
      : '';

  const copyLink = async () => {
    if (link) await copyToClipboard(link);
  };

  return (
    <div className="space-y-2 p-4 text-white">
      <input
        value={videoId}
        onChange={(e) => setVideoId(extractVideoId(e.target.value))}
        placeholder="YouTube URL or ID"
        className="w-full rounded bg-gray-800 p-2 text-black focus:text-white"
      />
      <div ref={containerRef} className="aspect-video w-full bg-black" />
      <div className="flex gap-2">
        <button onClick={markStart} className="rounded bg-gray-700 px-2 py-1">
          Set Start
        </button>
        <button onClick={markEnd} className="rounded bg-gray-700 px-2 py-1">
          Set End
        </button>
        <button
          onClick={copyLink}
          disabled={!link}
          className="rounded bg-gray-700 px-2 py-1 disabled:opacity-50"
        >
          Copy Link
        </button>
      </div>
      {link && <div className="break-all text-sm text-gray-300">{link}</div>}
    </div>
  );
}


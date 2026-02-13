"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import useOPFS from '../hooks/useOPFS';

// Basic YouTube player with keyboard shortcuts, playback rate cycling,
// chapter drawer and Picture-in-Picture helpers. The Doc-PiP window is a
// simple overlay used for notes/transcripts.
export default function YouTubePlayer({ videoId }) {
  const [activated, setActivated] = useState(false);
  const frameContainerRef = useRef(null); // Wraps the iframe so we can keep layout + PiP lookups
  const playerTargetId = useMemo(
    () => `yt-player-${videoId}-${Math.random().toString(36).slice(2, 9)}`,
    [videoId]
  );
  const playerRef = useRef(null); // YT.Player instance
  const [isPlaying, setIsPlaying] = useState(false);
  const [chapters, setChapters] = useState([]); // [{title, startTime}]
  const [showChapters, setShowChapters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { supported, getDir, readFile, writeFile, listFiles } = useOPFS();

  // Load the YouTube IFrame API lazily on user interaction
  const loadPlayer = () => {
    if (activated) return;
    setActivated(true);

    const createPlayer = () => {
      if (typeof document === 'undefined') return;
      const targetEl = document.getElementById(playerTargetId);
      if (!targetEl) return;
      playerRef.current = new YT.Player(playerTargetId, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            const data = e.target.getVideoData();
            if (data?.chapters) setChapters(data.chapters);
            if (prefersReducedMotion) {
              e.target.pauseVideo();
            } else {
              setIsPlaying(true);
            }
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (
              e.data === window.YT.PlayerState.PAUSED ||
              e.data === window.YT.PlayerState.ENDED
            ) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if (typeof window === 'undefined') return;

    const runWhenReady = () => {
      if (window.YT?.Player) {
        createPlayer();
        return;
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        createPlayer();
      };
    };

    if (!window.YT?.Player) {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube-nocookie.com/iframe_api';
        tag.async = true;
        document.body.appendChild(tag);
      }
      runWhenReady();
    } else {
      createPlayer();
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  // Keyboard controls for seeking and playback rate cycling
  const handleKey = (e) => {
    if (!playerRef.current) return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        playerRef.current.seekTo(
          Math.max(playerRef.current.getCurrentTime() - 5, 0),
          true
        );
        break;
      case 'ArrowRight':
        e.preventDefault();
        playerRef.current.seekTo(
          playerRef.current.getCurrentTime() + 5,
          true
        );
        break;
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlay();
        break;
      case '>':
      case '.': {
        const rates = playerRef.current.getAvailablePlaybackRates();
        const cur = playerRef.current.getPlaybackRate();
        const idx = rates.indexOf(cur);
        playerRef.current.setPlaybackRate(rates[(idx + 1) % rates.length]);
        break;
      }
      case '<':
      case ',': {
        const rates = playerRef.current.getAvailablePlaybackRates();
        const cur = playerRef.current.getPlaybackRate();
        const idx = rates.indexOf(cur);
        playerRef.current.setPlaybackRate(
          rates[(idx - 1 + rates.length) % rates.length]
        );
        break;
      }
      case 'c':
      case 'C':
        if (chapters.length) setShowChapters((s) => !s);
        break;
      default:
    }
  };

  // Trigger standard browser PiP on the iframe
  const triggerPiP = () => {
    const iframe = frameContainerRef.current?.querySelector('iframe');
    if (iframe?.requestPictureInPicture) {
      iframe.requestPictureInPicture().catch(() => {});
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!supported) return;
    (async () => {
      const dir = await getDir('video-notes');
      if (!dir) return;
      const text = await readFile(`${videoId}.txt`, dir);
      if (!cancelled && text !== null) setNotes(text);
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId, supported, getDir, readFile]);

  const handleNoteChange = useCallback(
    async (e) => {
      const text = e.target.value;
      setNotes(text);
      if (!supported) return;
      const dir = await getDir('video-notes');
      if (dir) await writeFile(`${videoId}.txt`, text, dir);
    },
    [videoId, supported, getDir, writeFile],
  );

  useEffect(() => {
    let cancelled = false;
    if (!search) {
      setResults([]);
      return;
    }
    (async () => {
      if (!supported) return;
      const dir = await getDir('video-notes', { create: false });
      if (!dir) return;
      const files = await listFiles(dir);
      const q = search.toLowerCase();
      const found = [];
      for (const file of files) {
        const text = await readFile(file.name, dir);
        if (text && text.toLowerCase().includes(q)) {
          found.push({ id: file.name.replace(/\.txt$/, ''), text });
        }
      }
      if (!cancelled) setResults(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [search, supported, getDir, listFiles, readFile]);

  return (
    <>
      <Head>
        <link
          rel="preconnect"
          href="https://www.youtube-nocookie.com"
        />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </Head>
      <div className="relative">
        <div
          className="relative w-full"
          style={{ aspectRatio: '16 / 9' }}
          tabIndex={0}
          onKeyDown={handleKey}
        >
          <div
            ref={frameContainerRef}
            className="absolute inset-0 w-full h-full"
            aria-hidden={!activated}
          >
            <div id={playerTargetId} className="w-full h-full" />
          </div>
          {!activated && (
            <button
              type="button"
              aria-label="Play video"
              onClick={loadPlayer}
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded bg-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt="YouTube video thumbnail"
                loading="lazy"
                width="1280"
                height="720"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-black/40"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="68"
                height="48"
                viewBox="0 0 68 48"
                className="relative z-10 drop-shadow-lg"
              >
                <path
                  className="ytp-large-play-button-bg"
                  d="M.66 37.58c-.6 2.27 1.1 4.42 3.43 4.42h59.82c2.33 0 4.04-2.15 3.43-4.42L60.49 5.4c-.37-1.37-1.62-2.32-3.04-2.32H10.68c-1.42 0-2.67.95-3.04 2.32L.66 37.58z"
                  fill="#f00"
                />
                <path d="M45.5 24L27.5 14v20" fill="#fff" />
              </svg>
            </button>
          )}

          {/* Chapter drawer */}
          {showChapters && chapters.length > 0 && (
            <div className="absolute bottom-0 left-0 z-40 max-h-1/2 w-48 overflow-auto bg-black/80 text-sm text-white">
              {chapters.map((ch) => (
                <button
                  key={ch.startTime}
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-black/60"
                  onClick={() => {
                    playerRef.current?.seekTo(ch.startTime, true);
                    setShowChapters(false);
                  }}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          )}

          {/* Notes side panel */}
          {showNotes && (
            <div className="absolute top-0 right-0 z-50 flex h-full w-64 flex-col bg-black/90 p-2 text-sm text-white">
              <button
                type="button"
                aria-label="Close notes"
                className="absolute right-1 top-1 px-2"
                onClick={() => setShowNotes(false)}
              >
                ✕
              </button>
              {supported ? (
                <>
                  <input
                    type="search"
                    aria-label="Search saved notes"
                    placeholder="Search notes"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mb-2 border border-white/20 bg-black/80 p-1"
                  />
                  {search && results.length > 0 && (
                    <ul className="mb-2 max-h-24 overflow-auto border border-white/20 p-1">
                      {results.map((r) => (
                        <li key={r.id} className="mb-1">
                          <strong>{r.id}</strong>: {r.text.slice(0, 50)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <textarea
                    aria-label="Video notes"
                    value={notes}
                    onChange={handleNoteChange}
                    className="flex-1 border border-white/20 bg-black/80 p-1"
                    placeholder="Write notes…"
                  />
                </>
              ) : (
                <p className="pr-4">OPFS not supported.</p>
              )}
            </div>
          )}
        </div>

        {/* Play/Pause, PiP + Doc-PiP buttons */}
        {activated && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm md:absolute md:right-3 md:top-3 md:mt-0 md:flex-col md:items-end md:rounded md:bg-black/60 md:p-2 md:text-base md:backdrop-blur">
            <button
              type="button"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              onClick={togglePlay}
              className="rounded bg-black/80 px-3 py-1 text-white md:bg-transparent md:px-2"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              aria-label="Picture in Picture"
              onClick={triggerPiP}
              className="rounded bg-black/80 px-3 py-1 text-white md:bg-transparent md:px-2"
            >
              PiP
            </button>
            <button
              type="button"
              aria-label="Notes"
              onClick={() => setShowNotes((s) => !s)}
              className="rounded bg-black/80 px-3 py-1 text-white md:bg-transparent md:px-2"
            >
              Notes
            </button>
          </div>
        )}
      </div>
    </>
  );
}

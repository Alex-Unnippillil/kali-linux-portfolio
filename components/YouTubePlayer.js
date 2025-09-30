"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import useOPFS from '../hooks/useOPFS';

// Basic YouTube player with keyboard shortcuts, playback rate cycling,
// chapter drawer and Picture-in-Picture helpers. The Doc-PiP window is a
// simple overlay used for notes/transcripts.
export default function YouTubePlayer({ videoId }) {
  const [activated, setActivated] = useState(false);
  const containerRef = useRef(null); // DOM node hosting the iframe
  const playerRef = useRef(null); // YT.Player instance
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [clsScore, setClsScore] = useState(0);
  const [chapters, setChapters] = useState([]); // [{title, startTime}]
  const [showChapters, setShowChapters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { supported, getDir, readFile, writeFile, listFiles } = useOPFS();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia('(max-width: 768px)');
    const updateViewport = (event) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(query.matches);

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', updateViewport);
    } else if (typeof query.addListener === 'function') {
      query.addListener(updateViewport);
    }

    return () => {
      if (typeof query.removeEventListener === 'function') {
        query.removeEventListener('change', updateViewport);
      } else if (typeof query.removeListener === 'function') {
        query.removeListener(updateViewport);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !isMobileViewport ||
      typeof window === 'undefined' ||
      typeof window.PerformanceObserver !== 'function'
    ) {
      setClsScore(0);
      return undefined;
    }

    const { PerformanceObserver } = window;
    const supportedEntryTypes = PerformanceObserver.supportedEntryTypes || [];
    if (!supportedEntryTypes.includes('layout-shift')) {
      setClsScore(0);
      return undefined;
    }

    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      setClsScore(Number(clsValue.toFixed(3)));
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    return () => {
      observer.disconnect();
    };
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport && clsScore > 0.1) {
      console.warn(`YouTubePlayer CLS on mobile exceeded 0.1 (score: ${clsScore})`);
    }
  }, [clsScore, isMobileViewport]);

  // Load the YouTube IFrame API lazily on user interaction
  const loadPlayer = () => {
    if (activated) return;
    setActivated(true);

    const createPlayer = () => {
      if (!containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
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

    if (typeof window !== 'undefined') {
      // Load the IFrame Player API script only after user interaction
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube-nocookie.com/iframe_api';
        tag.async = true;
        window.onYouTubeIframeAPIReady = createPlayer;
        document.body.appendChild(tag);
      } else {
        createPlayer();
      }
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
    const iframe = containerRef.current?.querySelector('iframe');
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
      <div
        className="relative w-full"
        data-cls-score={clsScore.toFixed(3)}
        tabIndex={0}
        onKeyDown={handleKey}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ paddingBottom: '56.25%' }}
        >
          <div
            ref={containerRef}
            className="absolute inset-0 h-full w-full bg-black"
            aria-hidden={!activated}
          />
          {!activated && (
            <button
              type="button"
              aria-label="Play video"
              onClick={loadPlayer}
              className="absolute inset-0 flex h-full w-full items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/80"
            >
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt="YouTube video thumbnail"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="relative z-10 inline-flex items-center justify-center rounded-full bg-black/70 p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
            </button>
          )}
        </div>

        {/* Play/Pause, PiP + Doc-PiP buttons */}
        {activated && (
          <div className="absolute top-2 right-2 flex gap-2 z-40">
            <button
              type="button"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              onClick={togglePlay}
              className="bg-black/60 text-white px-2 py-1 rounded"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              aria-label="Picture in Picture"
              onClick={triggerPiP}
              className="bg-black/60 text-white px-2 py-1 rounded"
            >
              PiP
            </button>
            <button
              type="button"
              aria-label="Notes"
              onClick={() => setShowNotes((s) => !s)}
              className="bg-black/60 text-white px-2 py-1 rounded"
            >
              Notes
            </button>
          </div>
        )}

        {/* Chapter drawer */}
        {showChapters && chapters.length > 0 && (
          <div className="absolute bottom-0 left-0 bg-black/80 text-white text-sm max-h-1/2 overflow-auto w-48 z-40">
            {chapters.map((ch) => (
              <button
                key={ch.startTime}
                type="button"
                className="block w-full text-left px-3 py-2 hover:bg-black/60"
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
          <div className="absolute top-0 right-0 w-64 h-full bg-black/90 text-white text-sm p-2 z-50 flex flex-col">
            <button
              type="button"
              aria-label="Close notes"
              className="absolute top-1 right-1 px-2"
              onClick={() => setShowNotes(false)}
            >
              ✕
            </button>
            {supported ? (
              <>
                <input
                  type="search"
                  placeholder="Search notes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search saved video notes"
                  className="mb-2 bg-black/80 border border-white/20 p-1"
                />
                {search && results.length > 0 && (
                  <ul className="mb-2 overflow-auto max-h-24 border border-white/20 p-1">
                    {results.map((r) => (
                      <li key={r.id} className="mb-1">
                        <strong>{r.id}</strong>: {r.text.slice(0, 50)}
                      </li>
                    ))}
                  </ul>
                )}
                <textarea
                  value={notes}
                  onChange={handleNoteChange}
                  aria-label="Video notes"
                  className="flex-1 bg-black/80 border border-white/20 p-1"
                  placeholder="Write notes…"
                />
              </>
            ) : (
              <p className="pr-4">OPFS not supported.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

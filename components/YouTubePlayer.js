"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import useOPFS from '../hooks/useOPFS';
import YouTube from './util-components/YouTube';

const PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

// Basic YouTube player with keyboard shortcuts, playback rate cycling,
// chapter drawer and Picture-in-Picture helpers. The Doc-PiP window is a
// simple overlay used for notes/transcripts.
export default function YouTubePlayer({ videoId }) {
  const [activated, setActivated] = useState(false);
  const playerRef = useRef(null);
  const [playerState, setPlayerState] = useState(null);
  const [chapters, setChapters] = useState([]); // [{title, startTime}]
  const [showChapters, setShowChapters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { supported, getDir, readFile, writeFile, listFiles } = useOPFS();
  const isPlaying = playerState === PLAYER_STATES.PLAYING;

  // Load the YouTube IFrame API lazily on user interaction
  const loadPlayer = useCallback(async () => {
    if (activated) return;
    setActivated(true);
    if (!playerRef.current) return;
    try {
      await playerRef.current.activate();
      const data = await playerRef.current.getVideoData();
      if (data?.chapters) setChapters(data.chapters);
      if (prefersReducedMotion) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    } catch (err) {
      console.error('Failed to initialise YouTube player', err);
    }
  }, [activated, prefersReducedMotion]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  // Keyboard controls for seeking and playback rate cycling
  const handleKey = async (e) => {
    if (!playerRef.current || !activated) return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        {
          const current = await playerRef.current.getCurrentTime();
          playerRef.current.seekTo(Math.max(current - 5, 0));
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        {
          const current = await playerRef.current.getCurrentTime();
          playerRef.current.seekTo(current + 5);
        }
        break;
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        togglePlay();
        break;
      case '>':
      case '.': {
        const rates = await playerRef.current.getAvailablePlaybackRates();
        const cur = await playerRef.current.getPlaybackRate();
        const idx = rates.indexOf(cur);
        const nextRate = rates[(idx + 1) % rates.length];
        playerRef.current.setPlaybackRate(nextRate);
        break;
      }
      case '<':
      case ',': {
        const rates = await playerRef.current.getAvailablePlaybackRates();
        const cur = await playerRef.current.getPlaybackRate();
        const idx = rates.indexOf(cur);
        const nextRate = rates[(idx - 1 + rates.length) % rates.length];
        playerRef.current.setPlaybackRate(nextRate);
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
    const iframe = playerRef.current?.getIframe();
    if (iframe?.requestPictureInPicture) {
      iframe.requestPictureInPicture().catch(() => {});
    }
  };

  const handleStateChange = useCallback((state) => {
    setPlayerState(state);
  }, []);

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
      <div
        className="relative w-full"
        style={{ aspectRatio: '16 / 9' }}
        tabIndex={0}
        onKeyDown={handleKey}
      >
        <div className="w-full h-full">
          <YouTube
            ref={playerRef}
            videoId={videoId}
            title="YouTube video player"
            active={activated}
            captions
            className="absolute inset-0 h-full w-full"
            onStateChange={handleStateChange}
          />
          {!activated && (
            <button
              type="button"
              aria-label="Play video"
              onClick={loadPlayer}
              className="relative w-full h-full flex items-center justify-center"
            >
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt="YouTube video thumbnail"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="68"
                height="48"
                viewBox="0 0 68 48"
                className="relative z-10"
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

import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

// Basic YouTube player with keyboard shortcuts, playback rate cycling,
// chapter drawer and Picture-in-Picture helpers. The Doc-PiP window is a
// simple overlay used for notes/transcripts.
export default function YouTubePlayer({ videoId }) {
  const [activated, setActivated] = useState(false);
  const containerRef = useRef(null); // DOM node hosting the iframe
  const playerRef = useRef(null); // YT.Player instance
  const [chapters, setChapters] = useState([]); // [{title, startTime}]
  const [showChapters, setShowChapters] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  // Load the YouTube IFrame API lazily on user interaction
  const loadPlayer = () => {
    if (activated) return;
    setActivated(true);

    const createPlayer = () => {
      if (!containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: { origin: window.location.origin },
        events: {
          onReady: (e) => {
            const data = e.target.getVideoData();
            if (data?.chapters) setChapters(data.chapters);
          },
        },
      });
    };

    if (typeof window !== 'undefined') {
      // Load the IFrame Player API script only after user interaction
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        window.onYouTubeIframeAPIReady = createPlayer;
        document.body.appendChild(tag);
      } else {
        createPlayer();
      }
    }
  };

  // Keyboard controls for seeking and playback rate cycling
  useEffect(() => {
    const handleKey = (e) => {
      if (!playerRef.current) return;
      switch (e.key) {
        case 'ArrowLeft':
          playerRef.current.seekTo(
            Math.max(playerRef.current.getCurrentTime() - 5, 0),
            true
          );
          break;
        case 'ArrowRight':
          playerRef.current.seekTo(
            playerRef.current.getCurrentTime() + 5,
            true
          );
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
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [chapters]);

  // Trigger standard browser PiP on the iframe
  const triggerPiP = () => {
    const iframe = containerRef.current?.querySelector('iframe');
    if (iframe?.requestPictureInPicture) {
      iframe.requestPictureInPicture().catch(() => {});
    }
  };

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </Head>
      <div className="relative w-full pb-[56.25%]">{/* 16:9 aspect ratio */}
        <div className="absolute inset-0" ref={containerRef}>
          {!activated && (
            <button
              type="button"
              aria-label="Play video"
              onClick={loadPlayer}
              className="w-full h-full bg-center bg-cover flex items-center justify-center"
              style={{
                backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)`
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="68"
                height="48"
                viewBox="0 0 68 48"
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

        {/* PiP + Doc-PiP buttons */}
        {activated && (
          <div className="absolute top-2 right-2 flex gap-2 z-40">
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
              onClick={() => setShowDoc((s) => !s)}
              className="bg-black/60 text-white px-2 py-1 rounded"
            >
              Doc-PiP
            </button>
          </div>
        )}

        {/* Chapter drawer */}
        {showChapters && chapters.length > 0 && (
          <div className="absolute bottom-0 left-0 bg-black/80 text-white text-sm max-h-1/2 overflow-auto w-48 z-40">
            {chapters.map((ch, i) => (
              <button
                key={i}
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

        {/* Doc-PiP overlay */}
        {showDoc && (
          <div className="absolute top-12 right-2 w-64 h-40 bg-black/90 text-white text-sm p-2 overflow-auto z-50 rounded shadow-lg">
            <button
              type="button"
              aria-label="Close notes"
              className="absolute top-1 right-1 px-2"
              onClick={() => setShowDoc(false)}
            >
              ✕
            </button>
            <p className="pr-4">No transcript available.</p>
          </div>
        )}
      </div>
    </>
  );
}

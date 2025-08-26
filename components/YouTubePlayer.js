import React, { useRef, useState } from 'react';
import Head from 'next/head';

export default function YouTubePlayer({ videoId }) {
  const [activated, setActivated] = useState(false);
  const playerRef = useRef(null);

  const loadPlayer = () => {
    if (activated) return;
    setActivated(true);

    const createPlayer = () => {
      if (!playerRef.current) return;
      // eslint-disable-next-line no-undef
      new YT.Player(playerRef.current, {
        videoId,
        playerVars: { origin: window.location.origin },
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

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </Head>
      <div className="relative w-full pb-[56.25%]">{/* 16:9 aspect ratio */}
        <div className="absolute inset-0" ref={playerRef}>
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
      </div>
    </>
  );
}

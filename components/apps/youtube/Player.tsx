import React, { useState, useRef, useEffect } from 'react';

interface Props {
  id: string;
  onClose?: () => void;
}

// Minimal YouTube iframe wrapper which exposes a poster frame until the user
// explicitly chooses to play the video. Keyboard shortcuts are wired to mimic
// a subset of the real YouTube site's behaviour.
export default function YouTubePlayer({ id, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePlay = () => {
    setLoaded(true);
    setPlaying(true);
  };

  const post = (command: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      '*'
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!loaded) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        post(playing ? 'pauseVideo' : 'playVideo');
        setPlaying((p) => !p);
      } else if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, playing, onClose]);

  return (
    <div className="w-full h-full bg-black relative" data-testid="player">
      {loaded ? (
        <iframe
          ref={iframeRef}
          title="YouTube video"
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${id}?enablejsapi=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      ) : (
        <button
          className="w-full h-full flex items-center justify-center text-white"
          onClick={handlePlay}
        >
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt="Poster"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="relative z-10 bg-black/60 rounded-full px-4 py-2">
            Play
          </span>
        </button>
      )}
    </div>
  );
}


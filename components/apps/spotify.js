import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// Simple Spotify embed browser that accepts track or playlist URLs and
// provides minimal playback controls. Controls post messages to the Spotify
// iframe API. See https://developer.spotify.com/documentation/embeds for
// details.
export default function SpotifyApp() {
  const [input, setInput] = useState(
    'https://open.spotify.com/playlist/37i9dQZF1E37fa3zdWtvQY'
  );
  const [embedUrl, setEmbedUrl] = useState('');
  const [openUrl, setOpenUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const iframeRef = useRef(null);

  // Parse the provided Spotify URL and generate an embed and canonical link.
  const loadUrl = useCallback(() => {
    const match = input.match(
      /open\.spotify\.com\/(track|playlist)\/([a-zA-Z0-9]+)/
    );

    if (match) {
      const [, type, id] = match;
      setEmbedUrl(`https://open.spotify.com/embed/${type}/${id}`);
      setOpenUrl(`https://open.spotify.com/${type}/${id}`);
    } else {
      setEmbedUrl('');
      setOpenUrl('');
    }
  }, [input]);

  // Load the default playlist on mount.
  useEffect(() => {
    loadUrl();
  }, [loadUrl]);

  const postCommand = useCallback(
    (command) => {
      iframeRef.current?.contentWindow?.postMessage(
        { command },
        'https://open.spotify.com'
      );
    },
    []
  );

  const handlePlayPause = useCallback(() => {
    postCommand('toggle');
    setIsPlaying((prev) => {
      const next = !prev;
      setAnnouncement(next ? 'Playing' : 'Paused');
      return next;
    });
  }, [postCommand]);

  const handleNext = useCallback(() => {
    postCommand('next');
    setAnnouncement('Skipped to next track');
  }, [postCommand]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    },
    [handlePlayPause, handleNext]
  );

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white flex flex-col p-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadUrl();
        }}
        className="mb-2 flex"
      >
        <input
          className="flex-grow p-1 text-black"
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter Spotify track or playlist URL"
          aria-label="Spotify URL"
        />
        <button
          type="submit"
          className="ml-2 px-2 bg-white text-black"
        >
          Load
        </button>
      </form>
      {embedUrl && (
        <div
          className="relative flex-grow"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Spotify player"
        >
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="Spotify player"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex space-x-4 pointer-events-auto">
              <button
                onClick={handlePlayPause}
                className="bg-black bg-opacity-50 rounded px-4 py-2 focus:outline-none"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={handleNext}
                className="bg-black bg-opacity-50 rounded px-4 py-2 focus:outline-none"
                aria-label="Next track"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {openUrl && (
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center underline mt-2 text-blue-300"
        >
          Open in app
        </a>
      )}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;


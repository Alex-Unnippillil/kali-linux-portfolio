import { useEffect, useRef, useState } from 'react';
import {
  setState as setNowPlaying,
  subscribeControl,
} from '../../utils/nowPlaying';

interface Track {
  title: string;
  url: string;
}

const PLAYLIST: Track[] = [
  {
    title: 'Song 1',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    title: 'Song 2',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'Song 3',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

export default function MediaPlayerApp() {
  const [index, setIndex] = useState(0);
  const [mini, setMini] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = PLAYLIST[index];

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const next = () => setIndex((i) => (i + 1) % PLAYLIST.length);
  const prev = () => setIndex((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length);

  useEffect(() => {
    document.title = `${current.title} - Media Player`;
    setNowPlaying({ track: current.title });
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        next();
      } else if (e.code === 'ArrowLeft') {
        prev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => next();
    const handlePlay = () => {
      setPlaying(true);
      setNowPlaying({ playing: true });
    };
    const handlePause = () => {
      setPlaying(false);
      setNowPlaying({ playing: false });
    };
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [index]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
  }, [index]);

  useEffect(() => {
    const unsub = subscribeControl((action) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (action === 'play') audio.play();
      else if (action === 'pause') audio.pause();
      else if (action === 'next') next();
      else if (action === 'prev') prev();
    });
    return unsub;
  }, [next, prev]);

  useEffect(() => () => setNowPlaying({ track: null, playing: false }), []);

  return (
    <div className={`h-full w-full ${mini ? 'flex items-center justify-center' : 'flex'} bg-black bg-opacity-30 text-white`}>
      {!mini && (
        <aside className="w-48 border-r border-gray-700 overflow-y-auto">
          {PLAYLIST.map((track, i) => (
            <button
              key={track.url}
              onClick={() => setIndex(i)}
              className={`block w-full text-left px-2 py-1 hover:bg-gray-700 ${
                i === index ? 'bg-gray-700' : ''
              }`}
            >
              {track.title}
            </button>
          ))}
        </aside>
      )}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <audio aria-label="Media player" ref={audioRef} src={current.url} />
        <div className="flex gap-4">
          <button aria-label="Previous track" onClick={prev}>⏮</button>
          <button aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>
            {playing ? '⏸' : '▶️'}
          </button>
          <button aria-label="Next track" onClick={next}>⏭</button>
          <button
            aria-label={mini ? 'Exit mini player' : 'Enter mini player'}
            onClick={() => setMini((m) => !m)}
          >
            {mini ? '🗖' : '🗕'}
          </button>
        </div>
        <p className="text-xs">{current.title}</p>
      </div>
    </div>
  );
}

export const displayMediaPlayer = () => <MediaPlayerApp />;

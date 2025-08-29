'use client';

import { useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import CrossfadePlayer from './utils/crossfade';
import Visualizer from './Visualizer';

interface Track {
  title: string;
  url: string;
}

const DEFAULT_PLAYLIST = [
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

const serialize = (tracks: Track[]) => JSON.stringify(tracks, null, 2);

const isTrackArray = (v: unknown): v is Track[] =>
  Array.isArray(v) && v.every((t) => t && typeof t.url === 'string');

const SpotifyApp = () => {
  const [playlistText, setPlaylistText] = usePersistentState(
    'spotify-playlist-text',
    () => serialize(DEFAULT_PLAYLIST),
  );
  const [queue, setQueue] = usePersistentState<Track[]>(
    'spotify-queue',
    () => DEFAULT_PLAYLIST,
    isTrackArray,
  );
  const [recent, setRecent] = usePersistentState<Track[]>(
    'spotify-recent',
    [],
    isTrackArray,
  );
  const [current, setCurrent] = usePersistentState<number>(
    'spotify-current-index',
    0,
    (v): v is number => typeof v === 'number',
  );
  const [mini, setMini] = usePersistentState('spotify-mini', false, (v): v is boolean => typeof v === 'boolean');
  const [crossfade, setCrossfade] = usePersistentState<number>('spotify-crossfade', 0, (v): v is number => typeof v === 'number');
  const [gapless, setGapless] = usePersistentState('spotify-gapless', false, (v): v is boolean => typeof v === 'boolean');
  const playerRef = useRef<CrossfadePlayer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const loadPlaylist = () => {
    try {
      const parsed = JSON.parse(playlistText);
      if (isTrackArray(parsed)) {
        setQueue(parsed);
        setPlaylistText(serialize(parsed));
        setCurrent(0);
      }
    } catch {
      // ignore invalid JSON
    }
  };

  useEffect(() => {
    if (!queue.length) loadPlaylist();
    const player = new CrossfadePlayer();
    playerRef.current = player;
    setAnalyser(player.getAnalyser());
    return () => player.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const track = queue[current];
    if (!track) return;
    setRecent((r) => [track, ...r.filter((t) => t.url !== track.url)].slice(0, 10));
    playerRef.current?.play(track.url, crossfade);
  }, [current, queue, setRecent, crossfade]);

  const next = () => {
    if (!queue.length) return;
    setCurrent((i) => (i + 1) % queue.length);
  };

  const previous = () => {
    if (!queue.length) return;
    setCurrent((i) => (i - 1 + queue.length) % queue.length);
  };

  const togglePlay = () => playerRef.current?.toggle();

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.code === 'MediaTrackNext') {
      e.preventDefault();
      next();
    } else if (e.code === 'MediaTrackPrevious') {
      e.preventDefault();
      previous();
    } else if (e.code === 'MediaPlayPause') {
      e.preventDefault();
      togglePlay();
    }
  };

  const currentTrack = queue[current];

  return (
    <div
      className={`h-full w-full bg-ub-cool-grey text-white flex flex-col ${
        mini ? 'p-2' : 'p-4'
      }`}
      tabIndex={0}
      onKeyDown={handleKey}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="space-x-2">
          <button onClick={previous} title="Previous" disabled={!queue.length}>
            ⏮
          </button>
          <button onClick={togglePlay} title="Play/Pause" disabled={!queue.length}>
            ⏯
          </button>
          <button onClick={next} title="Next" disabled={!queue.length}>
            ⏭
          </button>
        </div>
        <div className="space-x-4 text-sm flex items-center">
          <label className="flex items-center space-x-1">
            <span>Crossfade</span>
            <input
              type="range"
              min={0}
              max={12}
              value={crossfade}
              onChange={(e) => setCrossfade(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={gapless}
              onChange={(e) => setGapless(e.target.checked)}
            />
            <span>Gapless</span>
          </label>
          <button onClick={() => setMini(!mini)} className="border px-2 py-1 rounded">
            {mini ? 'Full' : 'Mini'}
          </button>
        </div>
      </div>
      {currentTrack && (
        <div className="mt-2">
          <p className="mb-2">{currentTrack.title}</p>
          {analyser && <Visualizer analyser={analyser} />}
        </div>
      )}
      {!mini && (
        <div className="flex-1 overflow-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="mb-2 text-lg">Playlist JSON</h2>
            <textarea
              className="w-full h-40 text-black p-1"
              value={playlistText}
              onChange={(e) => setPlaylistText(e.target.value)}
            />
            <button
              onClick={loadPlaylist}
              className="mt-2 rounded bg-blue-600 px-2 py-1 text-sm"
            >
              Load Playlist
            </button>
            <h2 className="mt-4 mb-2 text-lg">Queue</h2>
            <ul className="max-h-40 overflow-auto border border-gray-700 rounded">
              {queue.map((t, i) => (
                <li key={t.url} className={i === current ? 'bg-gray-700' : ''}>
                  <button
                    className="w-full text-left px-2 py-1 hover:bg-gray-600 focus:outline-none"
                    onClick={() => setCurrent(i)}
                  >
                    {t.title || t.url}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-lg">Recently Played</h2>
            <ul className="max-h-72 overflow-auto border border-gray-700 rounded">
              {recent.map((t) => (
                <li key={t.url} className="px-2 py-1 border-b border-gray-700 last:border-b-0">
                  {t.title || t.url}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyApp;


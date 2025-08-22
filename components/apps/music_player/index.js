import React, { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';

const playlist = [
  {
    title: 'Sample Track 1',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    art: 'https://via.placeholder.com/100?text=Track+1',
  },
  {
    title: 'Sample Track 2',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    art: 'https://via.placeholder.com/100?text=Track+2',
  },
  {
    title: 'Sample Track 3',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    art: 'https://via.placeholder.com/100?text=Track+3',
  },
];

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loadedTime, setLoadedTime] = useState(null);

  useEffect(() => {
    const savedTrack = parseInt(localStorage.getItem('music-player-track'), 10);
    const savedTime = parseFloat(localStorage.getItem('music-player-position'));
    if (!isNaN(savedTrack)) {
      setCurrent(savedTrack);
    }
    if (!isNaN(savedTime)) {
      setLoadedTime(savedTime);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('music-player-track', current);
  }, [current]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      localStorage.setItem('music-player-position', audioRef.current.currentTime.toString());
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && loadedTime !== null) {
      const onLoaded = () => {
        audio.currentTime = loadedTime;
      };
      audio.addEventListener('loadedmetadata', onLoaded);
      return () => audio.removeEventListener('loadedmetadata', onLoaded);
    }
  }, [current, loadedTime]);

  const play = () => {
    audioRef.current.play();
    setPlaying(true);
  };
  const pause = () => {
    audioRef.current.pause();
    setPlaying(false);
  };
  const next = () => {
    setPlaying(false);
    setCurrent((current + 1) % playlist.length);
  };
  const prev = () => {
    setPlaying(false);
    setCurrent((current - 1 + playlist.length) % playlist.length);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      if (playing) {
        audioRef.current.play();
      }
    }
  }, [current]);

  const track = playlist[current];

  return (
    <Draggable handle=".handle">
      <div className="handle cursor-move w-64 bg-ub-cool-grey text-white shadow-lg rounded p-4">
        <div className="flex items-center mb-2">
          <img src={track.art} alt={track.title} className="w-16 h-16 mr-2" />
          <div className="font-bold text-sm">{track.title}</div>
        </div>
        <audio ref={audioRef} src={track.src} onTimeUpdate={handleTimeUpdate} />
        <div className="flex justify-between mt-2 text-xs">
          <button onClick={prev}>Prev</button>
          {playing ? (
            <button onClick={pause}>Pause</button>
          ) : (
            <button onClick={play}>Play</button>
          )}
          <button onClick={next}>Next</button>
        </div>
      </div>
    </Draggable>
  );
}

export const displayMusicPlayer = () => <MusicPlayer />;

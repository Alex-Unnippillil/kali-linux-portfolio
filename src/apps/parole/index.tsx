'use client';

import { useRef, useState } from 'react';
import {
  loadParoleConfig,
  saveParoleConfig,
  ParoleConfig,
} from './config';

export default function Parole() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [source, setSource] = useState('');
  const [showPrefs, setShowPrefs] = useState(false);
  const [config, setConfig] = useState<ParoleConfig>(loadParoleConfig());

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSource(URL.createObjectURL(file));
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const savePrefs = () => {
    saveParoleConfig(config);
    setShowPrefs(false);
  };

  return (
    <div className="p-2 text-sm">
      <input
        aria-label="Open audio file"
        type="file"
        accept="audio/*"
        onChange={onFile}
      />
      <div className="mt-2">
        <audio
          aria-label="Audio player"
          ref={audioRef}
          src={source}
          autoPlay={config.autoplay}
        />
      </div>
      <div className="mt-2 space-x-2">
        <button onClick={togglePlay} className="px-2 py-1 bg-blue-600 text-white">
          Play/Pause
        </button>
        <button
          onClick={() => setShowPrefs(true)}
          className="px-2 py-1 bg-gray-600 text-white"
        >
          Preferences
        </button>
      </div>
      {showPrefs && (
        <div role="dialog" className="mt-4 border p-2 bg-white text-black">
          <div className="flex items-center space-x-2">
            <input
              id="parole-autoplay"
              aria-label="Autoplay"
              type="checkbox"
              checked={config.autoplay}
              onChange={(e) =>
                setConfig({ ...config, autoplay: e.target.checked })
              }
            />
            <label htmlFor="parole-autoplay">Autoplay</label>
          </div>
          <button
            onClick={savePrefs}
            className="mt-2 px-2 py-1 bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

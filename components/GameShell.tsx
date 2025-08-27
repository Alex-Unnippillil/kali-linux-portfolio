import React, { useEffect } from 'react';
import usePause from '../hooks/usePause';
import useGameSettings from '../hooks/useGameSettings';
import useFTUE from '../hooks/useFTUE';
import VirtualControls from './VirtualControls';

interface GameShellProps {
  gameKey: string;
  onSave?: () => any;
  onLoad?: (data: any) => void;
  children: React.ReactNode;
}

/**
 * Generic wrapper providing pause/resume, settings and overlays for games.
 */
const GameShell: React.FC<GameShellProps> = ({
  gameKey,
  onSave,
  onLoad,
  children,
}) => {
  const { paused, pause, resume } = usePause(() => {
    if (onSave) {
      const data = onSave();
      try {
        window.localStorage.setItem(`${gameKey}-save`, JSON.stringify(data));
      } catch {
        // ignore
      }
    }
  });

  useEffect(() => {
    if (onLoad) {
      try {
        const raw = window.localStorage.getItem(`${gameKey}-save`);
        if (raw) onLoad(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, [gameKey, onLoad]);

  const { settings, update } = useGameSettings(gameKey);
  const { showFTUE, dismissFTUE } = useFTUE(gameKey);

  return (
    <div className={`relative ${settings.highContrast ? 'contrast-150' : ''}`}> 
      {showFTUE && (
        <div className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-20" data-testid="ftue">
          <div className="text-center space-y-2">
            <p>Tap to start!</p>
            <button onClick={dismissFTUE}>Start</button>
          </div>
        </div>
      )}

      <div
        data-testid="game-container"
        className={paused ? 'opacity-50 pointer-events-none' : ''}
      >
        {children}
      </div>

      <div className="absolute top-2 right-2 space-x-2 z-30">
        {paused ? (
          <button onClick={resume} data-testid="resume-btn">
            Resume
          </button>
        ) : (
          <button onClick={pause} data-testid="pause-btn">
            Pause
          </button>
        )}
        <button
          onClick={() => update({ showSettings: true })}
          data-testid="settings-btn"
        >
          ⚙
        </button>
      </div>

      {settings.showSettings && (
        <div
          className="absolute inset-0 bg-white bg-opacity-90 flex flex-col p-4 space-y-2 z-40"
          data-testid="settings-panel"
        >
          <label>
            Difficulty
            <select
              value={settings.difficulty}
              onChange={(e) => update({ difficulty: e.target.value as any })}
              data-testid="difficulty-select"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>
            Assist
            <input
              type="checkbox"
              checked={settings.assist}
              onChange={(e) => update({ assist: e.target.checked })}
              data-testid="assist-toggle"
            />
          </label>
          <label>
            Quality
            <input
              type="range"
              min={1}
              max={3}
              value={settings.quality}
              onChange={(e) => update({ quality: Number(e.target.value) })}
              data-testid="quality-slider"
            />
          </label>
          <label>
            High Contrast
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => update({ highContrast: e.target.checked })}
              data-testid="contrast-toggle"
            />
          </label>
          <button
            onClick={() => update({ showSettings: false })}
            data-testid="close-settings"
          >
            Close
          </button>
        </div>
      )}

      <VirtualControls />
    </div>
  );
};

export default GameShell;

import React from 'react';
import { useSettings } from './GameSettingsContext';

interface Props {
  onClose: () => void;
}

const GameSettingsWindow: React.FC<Props> = ({ onClose }) => {
  const {
    difficulty,
    setDifficulty,
    assists,
    setAssists,
    colorBlind,
    setColorBlind,
    highContrast,
    setHighContrast,
    quality,
    setQuality,
  } = useSettings();

  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-gray-800 text-white p-4 rounded shadow-lg space-y-3 w-72">
        <h2 className="text-xl font-bold mb-2">Settings</h2>
        <label className="flex items-center justify-between">
          <span className="mr-2">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-gray-700 text-white rounded px-2 py-1"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={assists}
            onChange={(e) => setAssists(e.target.checked)}
            className="mr-2"
          />
          <span>Assists</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={colorBlind}
            onChange={(e) => setColorBlind(e.target.checked)}
            className="mr-2"
          />
          <span>Color Blind Mode</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
            className="mr-2"
          />
          <span>High Contrast</span>
        </label>
        <label className="flex items-center">
          <span className="mr-2">Quality</span>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.1"
            value={quality}
            onChange={(e) => setQuality(parseFloat(e.target.value))}
          />
        </label>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mt-2 px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSettingsWindow;

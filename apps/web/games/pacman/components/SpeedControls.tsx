import React from 'react';

interface GhostSpeeds {
  scatter: number;
  chase: number;
}

interface Props {
  ghostSpeeds: GhostSpeeds;
  setGhostSpeeds: React.Dispatch<React.SetStateAction<GhostSpeeds>>;
  gameSpeed: number;
  setGameSpeed: React.Dispatch<React.SetStateAction<number>>;
}

const SpeedControls: React.FC<Props> = ({
  ghostSpeeds,
  setGhostSpeeds,
  gameSpeed,
  setGameSpeed,
}) => {
  const handleChange = (key: keyof GhostSpeeds) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(e.target.value);
    setGhostSpeeds((s) => ({ ...s, [key]: value }));
  };

  return (
    <div className="flex space-x-4 mt-2">
      <label className="flex flex-col items-center text-sm">
        <span>Scatter: {ghostSpeeds.scatter.toFixed(1)}</span>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={ghostSpeeds.scatter}
          onChange={handleChange('scatter')}
          className="w-32"
        />
      </label>
      <label className="flex flex-col items-center text-sm">
        <span>Chase: {ghostSpeeds.chase.toFixed(1)}</span>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={ghostSpeeds.chase}
          onChange={handleChange('chase')}
          className="w-32"
        />
      </label>
      <label className="flex flex-col items-center text-sm">
        <span>Game: {gameSpeed.toFixed(1)}</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={gameSpeed}
          onChange={(e) => setGameSpeed(parseFloat(e.target.value))}
          className="w-32"
        />
      </label>
    </div>
  );
};

export default SpeedControls;


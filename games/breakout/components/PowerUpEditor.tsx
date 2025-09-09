"use client";

// Editor component allowing players to craft and save custom sets of
// Breakout power-ups. The sets are stored persistently so they can be
// reused across sessions.
import React, { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

// Available power-up types in Breakout.
const ALL_POWERUPS = [
  'multi-ball',
  'magnet',
  'big-paddle',
  'laser',
];

export interface PowerUpSet {
  name: string;
  powers: string[];
}

interface Props {
  onSelect?: (powers: string[]) => void;
}

/**
 * Editor for Breakout power-up sets.
 * Allows selecting custom combinations of power-ups and persisting them.
 */
export default function PowerUpEditor({ onSelect }: Props) {
  const [sets, setSets] = usePersistentState<PowerUpSet[]>(
    'breakout-powerup-sets',
    [],
  );
  const [currentName, setCurrentName] = useState('');
  const [currentPowers, setCurrentPowers] = useState<string[]>([]);

  const toggle = (p: string) => {
    setCurrentPowers((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const saveSet = () => {
    if (!currentName) return;
    const next = sets.filter((s) => s.name !== currentName);
    const set = { name: currentName, powers: currentPowers };
    next.push(set);
    setSets(next);
    if (onSelect) onSelect(currentPowers);
  };

  const selectSet = (name: string) => {
    const set = sets.find((s) => s.name === name);
    if (!set) return;
    setCurrentName(set.name);
    setCurrentPowers(set.powers);
    if (onSelect) onSelect(set.powers);
  };

  const removeSet = (name: string) => {
    setSets((prev) => prev.filter((s) => s.name !== name));
    if (name === currentName) {
      setCurrentName('');
      setCurrentPowers([]);
      if (onSelect) onSelect([]);
    }
  };

  return (
    <div className="text-white space-y-2">
      {sets.length > 0 && (
        <div className="flex space-x-2 items-center">
          <select
            className="text-black px-1 rounded"
            value={currentName}
            onChange={(e) => selectSet(e.target.value)}
          >
            <option value="">-- choose set --</option>
            {sets.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {currentName && (
            <button
              type="button"
              onClick={() => removeSet(currentName)}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Delete
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col space-y-1">
        {ALL_POWERUPS.map((p) => (
          <label key={p} className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={currentPowers.includes(p)}
              onChange={() => toggle(p)}
            />
            <span>{p}</span>
          </label>
        ))}
      </div>

      <div className="flex space-x-2 items-center">
        <input
          className="text-black px-1 rounded"
          placeholder="set name"
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
        />
        <button
          type="button"
          onClick={saveSet}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}


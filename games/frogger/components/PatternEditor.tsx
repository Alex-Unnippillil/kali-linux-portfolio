import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import type { LaneDef } from '../../../apps/games/frogger/config';
import { carLaneDefs } from '../../../apps/games/frogger/config';

const emptyLane: LaneDef = { y: 0, dir: 1, speed: 1, spawnRate: 1, length: 1 };

export default function PatternEditor() {
  const [lanes, setLanes] = usePersistentState<LaneDef[]>('frogger-custom-lanes', carLaneDefs);

  const updateLane = (index: number, patch: Partial<LaneDef>) => {
    setLanes(lanes.map((lane, i) => (i === index ? { ...lane, ...patch } : lane)));
  };

  const addLane = () => setLanes([...lanes, { ...emptyLane, y: lanes.length + 1 }]);
  const removeLane = (i: number) => setLanes(lanes.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      {lanes.map((lane, i) => (
        <div key={i} className="flex items-center gap-2">
          <label className="flex flex-col">
            Lane
            <input
              type="number"
              value={lane.y}
              onChange={(e) => updateLane(i, { y: Number(e.target.value) })}
              className="w-16"
            />
          </label>
          <label className="flex flex-col">
            Dir
            <select
              value={lane.dir}
              onChange={(e) => updateLane(i, { dir: Number(e.target.value) as 1 | -1 })}
            >
              <option value={1}>→</option>
              <option value={-1}>←</option>
            </select>
          </label>
          <label className="flex flex-col">
            Speed
            <input
              type="number"
              step="0.1"
              value={lane.speed}
              onChange={(e) => updateLane(i, { speed: Number(e.target.value) })}
              className="w-20"
            />
          </label>
          <button type="button" onClick={() => removeLane(i)} className="text-red-500">
            remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addLane} className="mt-2 text-blue-500">
        add lane
      </button>
    </div>
  );
}

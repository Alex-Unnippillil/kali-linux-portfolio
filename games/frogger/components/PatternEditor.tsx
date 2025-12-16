import React, { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import type { LaneDef } from '../../../apps/games/frogger/config';
import { carLaneDefs } from '../../../apps/games/frogger/config';
import { HEIGHT, WIDTH } from '../../../apps/games/frogger/logic';

type LaneStatus = 'ok' | 'error' | 'warning';

const emptyLane: LaneDef = { y: 0, dir: 1, speed: 1, spawnRate: 1, length: 1 };

const validateLanes = (lanes: LaneDef[]) => {
  const laneStatuses = lanes.map(() => ({ status: 'ok' as LaneStatus, messages: [] as string[], gapCells: 0 }));
  const errors: string[] = [];
  const counts = lanes.reduce<Record<number, number[]>>((acc, lane, idx) => {
    acc[lane.y] = [...(acc[lane.y] || []), idx];
    return acc;
  }, {});

  Object.entries(counts).forEach(([row, indexes]) => {
    if (indexes.length > 1) {
      indexes.forEach((i) => {
        laneStatuses[i].status = 'error';
        laneStatuses[i].messages.push(`Row ${row} is duplicated`);
      });
      errors.push(`Duplicate lanes on row ${row}`);
    }
  });

  lanes.forEach((lane, i) => {
    const gapCells = lane.speed * lane.spawnRate - lane.length;
    laneStatuses[i].gapCells = gapCells;
    if (lane.y < 0 || lane.y >= HEIGHT) {
      laneStatuses[i].status = 'error';
      laneStatuses[i].messages.push(`Row must be between 0 and ${HEIGHT - 1}`);
      errors.push(`Lane ${i + 1}: row out of bounds`);
    }
    if (lane.speed <= 0) {
      laneStatuses[i].status = 'error';
      laneStatuses[i].messages.push('Speed must be greater than 0');
      errors.push(`Lane ${i + 1}: invalid speed`);
    }
    if (lane.spawnRate <= 0) {
      laneStatuses[i].status = 'error';
      laneStatuses[i].messages.push('Spawn rate must be greater than 0');
      errors.push(`Lane ${i + 1}: invalid spawn rate`);
    }
    if (lane.length < 1 || lane.length > WIDTH) {
      laneStatuses[i].status = 'error';
      laneStatuses[i].messages.push(`Length must be between 1 and ${WIDTH}`);
      errors.push(`Lane ${i + 1}: invalid length`);
    }
    if (gapCells <= 0) {
      laneStatuses[i].status = 'error';
      laneStatuses[i].messages.push('Impossible timing: cars will overlap');
      errors.push(`Lane ${i + 1}: spawn timing will overlap`);
    }
  });

  return { errors, laneStatuses };
};

export default function PatternEditor() {
  const [savedLanes, setSavedLanes] = usePersistentState<LaneDef[]>('frogger-custom-lanes', carLaneDefs);
  const [draftLanes, setDraftLanes] = useState<LaneDef[]>(savedLanes);

  useEffect(() => {
    setDraftLanes(savedLanes);
  }, [savedLanes]);

  const { errors, laneStatuses } = useMemo(() => validateLanes(draftLanes), [draftLanes]);

  const updateLane = (index: number, patch: Partial<LaneDef>) => {
    setDraftLanes(draftLanes.map((lane, i) => (i === index ? { ...lane, ...patch } : lane)));
  };

  const addLane = () => setDraftLanes([...draftLanes, { ...emptyLane, y: draftLanes.length + 1 }]);
  const removeLane = (i: number) => setDraftLanes(draftLanes.filter((_, idx) => idx !== i));
  const fixLaneTiming = (i: number) => {
    const lane = draftLanes[i];
    const safeSpeed = lane.speed || 1;
    const targetSpawnRate = (lane.length + 1) / safeSpeed;
    updateLane(i, { spawnRate: targetSpawnRate });
  };
  const save = () => {
    if (!errors.length) setSavedLanes(draftLanes);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {draftLanes.map((lane, i) => {
          const status = laneStatuses[i];
          const badgeColor =
            status.status === 'ok'
              ? 'bg-green-600/20 text-green-300'
              : 'bg-red-600/20 text-red-300';

          return (
            <div key={i} className="rounded-lg border border-slate-600/40 bg-slate-900/50 p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-col text-xs uppercase tracking-wide">
                  Row
                  <input
                    type="number"
                    value={lane.y}
                    onChange={(e) => updateLane(i, { y: Number(e.target.value) })}
                    className="mt-1 w-20 rounded bg-slate-800 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col text-xs uppercase tracking-wide">
                  Dir
                  <select
                    value={lane.dir}
                    onChange={(e) => updateLane(i, { dir: Number(e.target.value) as 1 | -1 })}
                    className="mt-1 rounded bg-slate-800 px-2 py-1"
                  >
                    <option value={1}>→</option>
                    <option value={-1}>←</option>
                  </select>
                </label>
                <label className="flex flex-col text-xs uppercase tracking-wide">
                  Speed
                  <input
                    type="number"
                    step="0.1"
                    value={lane.speed}
                    onChange={(e) => updateLane(i, { speed: Number(e.target.value) })}
                    className="mt-1 w-24 rounded bg-slate-800 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col text-xs uppercase tracking-wide">
                  Spawn Rate
                  <input
                    type="number"
                    step="0.1"
                    value={lane.spawnRate}
                    onChange={(e) => updateLane(i, { spawnRate: Number(e.target.value) })}
                    className="mt-1 w-24 rounded bg-slate-800 px-2 py-1"
                  />
                </label>
                <label className="flex flex-col text-xs uppercase tracking-wide">
                  Length
                  <input
                    type="number"
                    value={lane.length}
                    onChange={(e) => updateLane(i, { length: Number(e.target.value) })}
                    className="mt-1 w-20 rounded bg-slate-800 px-2 py-1"
                  />
                </label>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
                  {status.status === 'ok' ? 'OK' : 'Error'}
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-300">
                  <span>Gap: {status.gapCells.toFixed(2)} cells</span>
                  <button
                    type="button"
                    onClick={() => fixLaneTiming(i)}
                    className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
                  >
                    Fix timing
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLane(i)}
                    className="rounded bg-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-800/60"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {status.messages.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-300">
                  {status.messages.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addLane}
          className="rounded bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
        >
          Add lane
        </button>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={save}
            disabled={!!errors.length}
            className="rounded bg-green-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Save
          </button>
          {errors.length > 0 && (
            <span className="text-xs text-red-300">Fix errors before saving.</span>
          )}
        </div>
      </div>
    </div>
  );
}

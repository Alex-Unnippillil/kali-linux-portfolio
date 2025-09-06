import React from 'react';
import { usePlacementSetting } from '../../hooks/usePersistentState';
import type { PlacementMode } from '../../src/wm/placement';

const WindowManagerTweaks: React.FC = () => {
  const [placement, setPlacement] = usePlacementSetting();
  return (
    <div className="w-full flex flex-col flex-grow bg-ub-cool-grey text-white p-4 windowMainScreen select-none">
      <h1 className="text-xl mb-4">Window Manager Tweaks</h1>
      <label className="flex items-center">
        <span className="mr-2">Window placement:</span>
        <select
          value={placement}
          onChange={(e) => setPlacement(e.target.value as PlacementMode)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="smart">Smart</option>
          <option value="center">Center</option>
        </select>
      </label>
    </div>
  );
};

export default WindowManagerTweaks;

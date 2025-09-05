'use client';

import ToggleSwitch from '../../../components/ToggleSwitch';
import { useSettings } from '../../../hooks/useSettings';

export default function WindowManagerTweaks() {
  const {
    focusModel,
    setFocusModel,
    preventFocusSteal,
    setPreventFocusSteal,
  } = useSettings();

  return (
    <>
      <div className="flex justify-center my-4">
        <label className="mr-2 text-ubt-grey">Focus Model:</label>
        <select
          value={focusModel}
          onChange={(e) => setFocusModel(e.target.value as any)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="click">Click to Focus</option>
          <option value="sloppy">Focus Follows Mouse</option>
        </select>
      </div>
      <div className="flex justify-center my-4 items-center">
        <span className="mr-2 text-ubt-grey">Prevent Focus Stealing:</span>
        <ToggleSwitch
          checked={preventFocusSteal}
          onChange={setPreventFocusSteal}
          ariaLabel="Prevent Focus Stealing"
        />
      </div>
    </>
  );
}


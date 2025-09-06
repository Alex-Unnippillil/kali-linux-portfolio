import React from 'react';
import { useSettings } from '../../hooks/useSettings';

function WindowManagerTweaks() {
  const { focusFollowsMouse, setFocusFollowsMouse } = useSettings();
  return (
    <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
      <div className="flex justify-center my-4">
        <span className="mr-2 text-ubt-grey">Window Focus:</span>
        <label className="mr-4 text-ubt-grey flex items-center">
          <input
            type="radio"
            name="focus-mode"
            className="mr-1"
            checked={!focusFollowsMouse}
            onChange={() => setFocusFollowsMouse(false)}
          />
          Click to Focus
        </label>
        <label className="text-ubt-grey flex items-center">
          <input
            type="radio"
            name="focus-mode"
            className="mr-1"
            checked={focusFollowsMouse}
            onChange={() => setFocusFollowsMouse(true)}
          />
          Focus Follows Mouse
        </label>
      </div>
    </div>
  );
}

export default WindowManagerTweaks;

export const displayWindowManagerTweaks = () => <WindowManagerTweaks />;

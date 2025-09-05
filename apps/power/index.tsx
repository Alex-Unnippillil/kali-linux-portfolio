"use client";

import { useSettings } from "../../hooks/useSettings";
import ToggleSwitch from "../../components/ToggleSwitch";

export default function Power() {
  const { lockOnSleep, setLockOnSleep } = useSettings();

  const handleSleep = () => {
    const event = new Event("simulate-sleep");
    window.dispatchEvent(event);
  };

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey text-white p-4">
      <h1 className="text-xl mb-4">Power</h1>
      <div className="flex items-center justify-between mb-4">
        <span>Lock screen when sleeping</span>
        <ToggleSwitch
          checked={lockOnSleep}
          onChange={setLockOnSleep}
          ariaLabel="Lock screen when sleeping"
        />
      </div>
      <button
        onClick={handleSleep}
        className="px-4 py-2 bg-ub-grey rounded"
      >
        Sleep
      </button>
    </div>
  );
}

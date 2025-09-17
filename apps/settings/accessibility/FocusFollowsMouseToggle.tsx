"use client";

import ToggleSwitch from "@/components/ToggleSwitch";
import { useSettings } from "@/hooks/useSettings";

export default function FocusFollowsMouseToggle() {
  const { focusFollowsMouse, setFocusFollowsMouse } = useSettings();

  return (
    <div className="flex justify-center my-4 items-start md:items-center gap-4 text-left">
      <div className="text-ubt-grey max-w-xs">
        <div className="font-semibold">Focus follows mouse</div>
        <p className="text-xs opacity-80 mt-1">
          Hover over a window for about 350 milliseconds to bring it to the front
          automatically.
        </p>
      </div>
      <ToggleSwitch
        checked={focusFollowsMouse}
        onChange={setFocusFollowsMouse}
        ariaLabel="Focus follows mouse"
      />
    </div>
  );
}

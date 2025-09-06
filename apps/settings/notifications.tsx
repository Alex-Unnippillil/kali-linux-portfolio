"use client";

import React from "react";
import ToggleSwitch from "../../components/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

export default function NotificationSettings() {
  const {
    toastPlacement,
    setToastPlacement,
    toastFadeOut,
    setToastFadeOut,
  } = useSettings();

  return (
    <div className="p-4 text-ubt-grey select-none">
      <div className="mb-4 flex items-center">
        <label className="mr-2">Toast placement:</label>
        <select
          value={toastPlacement}
          onChange={(e) => setToastPlacement(e.target.value as "primary" | "mouse")}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="primary">Primary display</option>
          <option value="mouse">Mouse display</option>
        </select>
      </div>
      <div className="mb-4 flex items-center">
        <ToggleSwitch
          checked={toastFadeOut}
          onChange={setToastFadeOut}
          ariaLabel="Fade out toasts"
        />
        <span className="ml-2">Fade out toasts</span>
      </div>
    </div>
  );
}

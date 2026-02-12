"use client";

import React, { useState, useEffect } from "react";
import ToggleSwitch from "../../ToggleSwitch";

const TASKBAR_PREFIX = "xfce.taskbar.";

export default function TaskbarSettings() {
  const [docklike, setDocklike] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${TASKBAR_PREFIX}docklike`) === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${TASKBAR_PREFIX}docklike`, docklike ? "true" : "false");
  }, [docklike]);

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-ubt-grey">Docklike Taskbar</span>
      <ToggleSwitch
        checked={docklike}
        onChange={setDocklike}
        ariaLabel="Enable docklike taskbar"
      />
    </div>
  );
}

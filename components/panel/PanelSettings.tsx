"use client";

import React, { useState, useEffect } from "react";
import ToggleSwitch from "../ToggleSwitch";
import StatusNotifier from "./StatusNotifier";
import LegacyTray from "./LegacyTray";

const PANEL_PREFIX = "xfce.panel.";

export default function PanelSettings() {
  const [useLegacyTray, setUseLegacyTray] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${PANEL_PREFIX}useLegacyTray`) === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      `${PANEL_PREFIX}useLegacyTray`,
      useLegacyTray ? "true" : "false"
    );
  }, [useLegacyTray]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-ubt-grey">Legacy Tray</span>
        <ToggleSwitch
          checked={useLegacyTray}
          onChange={setUseLegacyTray}
          ariaLabel="Toggle legacy tray"
        />
      </div>
      {useLegacyTray ? <LegacyTray /> : <StatusNotifier />}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import {
  saveSession,
  clearSession,
  isAutoSaveEnabled,
  setAutoSave,
} from "../../lib/session/manager";

const SessionManager = () => {
  const [autoSave, setAuto] = useState(false);

  useEffect(() => {
    setAuto(isAutoSaveEnabled());
  }, []);

  const handleSave = () => {
    saveSession();
  };

  const handleClear = () => {
    if (window.confirm("Clear saved session?")) {
      clearSession();
    }
  };

  const toggleAuto = () => {
    const next = !autoSave;
    setAuto(next);
    setAutoSave(next);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleSave}
        className="px-4 py-2 rounded bg-ub-orange text-white"
      >
        Save Session
      </button>
      <label className="flex items-center space-x-2 text-ubt-grey">
        <input
          type="checkbox"
          checked={autoSave}
          onChange={toggleAuto}
          aria-label="Toggle auto-save"
        />
        <span>Auto-save</span>
      </label>
      <button
        onClick={handleClear}
        className="px-4 py-2 rounded bg-ub-orange text-white"
      >
        Clear Session
      </button>
    </div>
  );
};

export default SessionManager;


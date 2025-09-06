"use client";

import ToggleSwitch from "../../components/ToggleSwitch";
import usePersistentState from "../../hooks/usePersistentState";
import {
  SHOW_CHOOSER_KEY,
  AUTO_SAVE_KEY,
  PROMPT_LOGOUT_KEY,
} from "../../utils/sessionSettings";

export default function SessionSettings() {
  const [showChooser, setShowChooser] = usePersistentState<boolean>(
    SHOW_CHOOSER_KEY,
    false,
    (v): v is boolean => typeof v === "boolean"
  );
  const [autoSave, setAutoSave] = usePersistentState<boolean>(
    AUTO_SAVE_KEY,
    false,
    (v): v is boolean => typeof v === "boolean"
  );
  const [prompt, setPrompt] = usePersistentState<boolean>(
    PROMPT_LOGOUT_KEY,
    true,
    (v): v is boolean => typeof v === "boolean"
  );

  return (
    <div className="p-4 space-y-4 text-ubt-grey">
      <h1 className="text-xl mb-2">Session</h1>
      <label className="flex items-center justify-between gap-4">
        <span>Display session chooser on login</span>
        <ToggleSwitch
          checked={showChooser}
          onChange={setShowChooser}
          ariaLabel="Display session chooser on login"
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>Automatically save session on logout</span>
        <ToggleSwitch
          checked={autoSave}
          onChange={setAutoSave}
          ariaLabel="Automatically save session on logout"
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>Prompt on logout</span>
        <ToggleSwitch
          checked={prompt}
          onChange={setPrompt}
          ariaLabel="Prompt on logout"
        />
      </label>
    </div>
  );
}

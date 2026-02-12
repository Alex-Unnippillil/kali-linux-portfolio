"use client";

import { ChangeEvent, useState } from "react";
import usePersistentState from "../../../hooks/usePersistentState";
import Toast from "../../../components/ui/Toast";

interface VolmanSettings {
  mountOnPlug: boolean;
  mountOnInsert: boolean;
  browseOnInsert: boolean;
  autoRun: boolean;
  autoOpen: boolean;
}

export default function RemovableMedia() {
  const [settings, setSettings] = usePersistentState<VolmanSettings>(
    "settings.volman",
    {
      mountOnPlug: false,
      mountOnInsert: false,
      browseOnInsert: false,
      autoRun: false,
      autoOpen: false,
    },
  );
  const [toast, setToast] = useState("");

  const handleChange = (key: keyof VolmanSettings) => (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const checked = e.target.checked;
    setSettings(prev => {
      const next = { ...prev, [key]: checked };
      if (key === "browseOnInsert" && checked && !prev.browseOnInsert) {
        setToast("Device inserted");
        try {
          window.open("/apps/file-explorer");
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-2 p-4 text-ubt-grey bg-ub-cool-grey min-h-full">
      <h1 className="text-xl mb-2">Removable Media</h1>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.mountOnPlug}
          onChange={handleChange("mountOnPlug")}
          className="mr-2"
        />
        <span>Mount on plug</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.mountOnInsert}
          onChange={handleChange("mountOnInsert")}
          className="mr-2"
        />
        <span>Mount on insert</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.browseOnInsert}
          onChange={handleChange("browseOnInsert")}
          className="mr-2"
        />
        <span>Browse on insert</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.autoRun}
          onChange={handleChange("autoRun")}
          className="mr-2"
        />
        <span>Auto-run</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.autoOpen}
          onChange={handleChange("autoOpen")}
          className="mr-2"
        />
        <span>Auto-open</span>
      </label>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}


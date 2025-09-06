"use client";
import React, { useEffect, useState } from "react";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { volumeSettingsManager, VolumeSettings } from "./volumeSettings";

export default function VolumeManagerDialog() {
  const [settings, setSettings] = useState<VolumeSettings>(
    volumeSettingsManager.getSettings(),
  );

  useEffect(() => {
    const handler = (s: VolumeSettings) => setSettings(s);
    volumeSettingsManager.on("change", handler);
    return () => {
      volumeSettingsManager.off("change", handler);
    };
  }, []);

  const update = (partial: Partial<VolumeSettings>) => {
    volumeSettingsManager.updateSettings(partial);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span>Mount removable drives when hot-plugged</span>
        <ToggleSwitch
          checked={settings.mountDrives}
          onChange={(checked) => update({ mountDrives: checked })}
          ariaLabel="Mount removable drives when hot-plugged"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Mount removable media when inserted</span>
        <ToggleSwitch
          checked={settings.mountMedia}
          onChange={(checked) => update({ mountMedia: checked })}
          ariaLabel="Mount removable media when inserted"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Browse removable media when inserted</span>
        <ToggleSwitch
          checked={settings.browseMedia}
          onChange={(checked) => update({ browseMedia: checked })}
          ariaLabel="Browse removable media when inserted"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Auto-run programs on new drives and media</span>
        <ToggleSwitch
          checked={settings.autoRun}
          onChange={(checked) => update({ autoRun: checked })}
          ariaLabel="Auto-run programs on new drives and media"
        />
      </div>
      <div>
        <label htmlFor="camera-import" className="block mb-1">
          Camera import command
        </label>
        <input
          id="camera-import"
          type="text"
          value={settings.cameraImportCommand}
          onChange={(e) => update({ cameraImportCommand: e.target.value })}
          className="w-full border rounded p-1"
          aria-label="Camera import command"
        />
      </div>
    </div>
  );
}

import { exec } from "child_process";
import { volumeSettingsManager, VolumeSettings } from "./volumeSettings";

let currentSettings: VolumeSettings = volumeSettingsManager.getSettings();

volumeSettingsManager.on("change", (s: VolumeSettings) => {
  currentSettings = s;
});

interface VolumeEvent {
  type: string;
  hotplug?: boolean;
  autorun?: boolean;
}

export function handleVolume(event: VolumeEvent) {
  if (event.hotplug && currentSettings.mountDrives) {
    // Implement mounting logic here
  }
  if (currentSettings.mountMedia && event.type === "media") {
    // Implement media mount logic here
  }
  if (currentSettings.browseMedia && event.type === "media") {
    // Implement browse logic here
  }
  if (currentSettings.autoRun && event.autorun) {
    // Implement autorun logic here
  }
  if (currentSettings.cameraImportCommand && event.type === "camera") {
    exec(currentSettings.cameraImportCommand);
  }
}

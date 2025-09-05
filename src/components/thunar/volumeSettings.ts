import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { EventEmitter } from "events";

export interface VolumeSettings {
  mountDrives: boolean;
  mountMedia: boolean;
  browseMedia: boolean;
  autoRun: boolean;
  cameraImportCommand: string;
}

const defaultSettings: VolumeSettings = {
  mountDrives: false,
  mountMedia: false,
  browseMedia: false,
  autoRun: false,
  cameraImportCommand: "",
};

export const CONFIG_PATH = path.join(
  os.homedir(),
  ".config",
  "xfce4",
  "thunar-volman.json",
);

function loadSettings(): VolumeSettings {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

class VolumeSettingsManager extends EventEmitter {
  private settings: VolumeSettings;

  constructor() {
    super();
    this.settings = loadSettings();
  }

  getSettings(): VolumeSettings {
    return this.settings;
  }

  updateSettings(partial: Partial<VolumeSettings>) {
    this.settings = { ...this.settings, ...partial };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.settings, null, 2));
    this.emit("change", this.settings);
  }
}

export const volumeSettingsManager = new VolumeSettingsManager();

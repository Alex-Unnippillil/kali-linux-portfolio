import { promises as fs } from "fs";
import path from "path";
import os from "os";

export interface AutostartEntry {
  /** Absolute path to the autostart file */
  file: string;
  /** Display name for the entry */
  name: string;
  /** Whether the entry is enabled */
  enabled: boolean;
  /** Delay in seconds before starting */
  delay: number;
  /** Raw data loaded from disk */
  data: Record<string, any>;
}

const AUTOSTART_DIR = path.join(os.homedir(), ".config", "autostart");

/**
 * Read all autostart entries from ~/.config/autostart/*.desktop.json.
 */
export async function readAutostart(): Promise<AutostartEntry[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(AUTOSTART_DIR);
  } catch {
    return [];
  }

  const entries: AutostartEntry[] = [];
  for (const file of files) {
    if (!file.endsWith(".desktop.json")) continue;
    const fullPath = path.join(AUTOSTART_DIR, file);
    try {
      const text = await fs.readFile(fullPath, "utf8");
      const data = JSON.parse(text);
      entries.push({
        file: fullPath,
        name: data.Name ?? path.basename(file, ".desktop.json"),
        enabled: Boolean(
          data["X-GNOME-Autostart-enabled"] ?? data.enabled ?? true
        ),
        delay: Number(data["X-GNOME-Autostart-Delay"] ?? data.delay ?? 0),
        data,
      });
    } catch {
      // ignore invalid files
    }
  }
  return entries;
}

/**
 * Persist an updated autostart entry back to its source file.
 */
export async function saveAutostartEntry(entry: AutostartEntry): Promise<void> {
  const { file, data, name, enabled, delay } = entry;
  const updated: Record<string, any> = { ...data, Name: name };
  updated["X-GNOME-Autostart-enabled"] = enabled;
  if (typeof delay === "number") {
    updated["X-GNOME-Autostart-Delay"] = delay;
  } else {
    delete updated["X-GNOME-Autostart-Delay"];
  }
  await fs.writeFile(file, JSON.stringify(updated, null, 2), "utf8");
}


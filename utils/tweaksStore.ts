"use client";

interface TweaksSettings {
  clipboard: boolean;
  timeSync: boolean;
  sharedFolders: boolean;
}

export const defaults: TweaksSettings = {
  clipboard: true,
  timeSync: true,
  sharedFolders: false,
};

const STORAGE_KEY = "vm-tweaks";

async function load(): Promise<TweaksSettings> {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

async function save(values: Partial<TweaksSettings>): Promise<void> {
  if (typeof window === "undefined") return;
  const current = await load();
  const updated = { ...current, ...values };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore write errors
  }
}

export async function getClipboard(): Promise<boolean> {
  return (await load()).clipboard;
}

export async function setClipboard(value: boolean): Promise<void> {
  await save({ clipboard: value });
}

export async function getTimeSync(): Promise<boolean> {
  return (await load()).timeSync;
}

export async function setTimeSync(value: boolean): Promise<void> {
  await save({ timeSync: value });
}

export async function getSharedFolders(): Promise<boolean> {
  return (await load()).sharedFolders;
}

export async function setSharedFolders(value: boolean): Promise<void> {
  await save({ sharedFolders: value });
}

"use client";

import { get, set } from "idb-keyval";

export type Trigger = "login" | "logout" | "suspend";

export interface AutostartEntry {
  id: string;
  name: string;
  trigger: Trigger;
}

const KEY = "user-autostart";

export async function getAutostart(): Promise<AutostartEntry[]> {
  if (typeof window === "undefined") return [];
  return (await get<AutostartEntry[]>(KEY)) || [];
}

export async function setAutostart(entries: AutostartEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  await set(KEY, entries);
}

export default { getAutostart, setAutostart };


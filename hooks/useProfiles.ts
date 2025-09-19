"use client";

import { useCallback } from "react";

const BLE_CHANNEL = "ble-profiles";
const ROUTER_PROFILE_KEY = "reaver-router-profile";

type DirHandle = any;

type EntryHandle = { kind?: string } & Record<string, unknown>;

async function clearOpfsDirectory() {
  if (
    typeof navigator === "undefined" ||
    !(navigator as any).storage?.getDirectory
  ) {
    return;
  }

  try {
    const dir: DirHandle = await (navigator as any).storage.getDirectory();
    const removals: Promise<unknown>[] = [];
    for await (const [name, handle] of (dir as any).entries() as AsyncIterable<
      [string, EntryHandle]
    >) {
      if ((handle as EntryHandle).kind === "directory") {
        removals.push((dir as any).removeEntry(name, { recursive: true }));
      } else {
        removals.push((dir as any).removeEntry(name));
      }
    }
    await Promise.allSettled(removals);
  } catch {
    // Ignore OPFS removal issues
  }
}

function clearRouterProfiles() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ROUTER_PROFILE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function broadcastProfileReset() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return;
  }
  try {
    const channel = new BroadcastChannel(BLE_CHANNEL);
    channel.postMessage("update");
    channel.close();
  } catch {
    // Ignore broadcast errors
  }
}

export default function useProfiles() {
  const clearProfiles = useCallback(async () => {
    clearRouterProfiles();
    await clearOpfsDirectory();
    broadcastProfileReset();
  }, []);

  return { clearProfiles };
}

"use client";

import { safeLocalStorage } from "../safeStorage";

export type ShareCapability = "text" | "url" | "file";

export interface ShareTargetDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  accent: string;
  accepts: ShareCapability[];
  appId?: string;
  href?: string;
}

export interface ShareTargetWithState extends ShareTargetDefinition {
  visible: boolean;
}

export interface ShareTargetState {
  order: string[];
  hidden: string[];
  recents: string[];
}

const STORAGE_KEY = "share-target-preferences";
const RECENT_LIMIT = 4;

const INSTALLED_SHARE_TARGETS: ShareTargetDefinition[] = [
  {
    id: "input-hub",
    title: "Input Hub",
    description: "Route shared items to the intake console",
    emoji: "📥",
    accent: "#2563eb",
    accepts: ["text", "url", "file"],
    href: "/input-hub",
  },
  {
    id: "clipboard-manager",
    title: "Clipboard Manager",
    description: "Append the share to clipboard history",
    emoji: "📋",
    accent: "#10b981",
    accepts: ["text", "url"],
    appId: "clipboard-manager",
  },
  {
    id: "sticky_notes",
    title: "Sticky Notes",
    description: "Create a note from the shared text",
    emoji: "🗒️",
    accent: "#f59e0b",
    accepts: ["text", "url"],
    appId: "sticky_notes",
  },
  {
    id: "gedit",
    title: "Text Editor",
    description: "Open the share in a new Gedit document",
    emoji: "✏️",
    accent: "#ec4899",
    accepts: ["text"],
    appId: "gedit",
  },
  {
    id: "qr",
    title: "QR Tool",
    description: "Transform the share into a QR code",
    emoji: "🔳",
    accent: "#0ea5e9",
    accepts: ["text", "url"],
    appId: "qr",
  },
  {
    id: "contact",
    title: "Contact",
    description: "Send the share through the contact console",
    emoji: "✉️",
    accent: "#8b5cf6",
    accepts: ["text", "url", "file"],
    appId: "contact",
  },
];

const TARGET_MAP = new Map(
  INSTALLED_SHARE_TARGETS.map((target) => [target.id, target])
);

const defaultOrder = INSTALLED_SHARE_TARGETS.map((target) => target.id);

const dedupe = (ids: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (TARGET_MAP.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
};

const sanitizeState = (
  incoming?: Partial<ShareTargetState>
): ShareTargetState => {
  const order = dedupe([...(incoming?.order ?? []), ...defaultOrder]);
  const hidden = dedupe(incoming?.hidden ?? []);
  const recents = dedupe(incoming?.recents ?? []).slice(0, RECENT_LIMIT);
  return {
    order: order.length ? order : [...defaultOrder],
    hidden,
    recents,
  };
};

const createDefaultState = (): ShareTargetState => ({
  order: [...defaultOrder],
  hidden: [],
  recents: [],
});

const loadFromStorage = (): ShareTargetState => {
  if (!safeLocalStorage) return createDefaultState();
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<ShareTargetState>;
    return sanitizeState(parsed);
  } catch {
    return createDefaultState();
  }
};

let state: ShareTargetState = loadFromStorage();

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const persist = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
};

const updateState = (partial: Partial<ShareTargetState>) => {
  state = sanitizeState({ ...state, ...partial });
  persist();
  emit();
};

export const shareTargetStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): ShareTargetState {
    return state;
  },
  getServerSnapshot(): ShareTargetState {
    return createDefaultState();
  },
};

const normalizeSnapshot = (
  snapshot: ShareTargetState
): ShareTargetState => {
  if (snapshot === state) return state;
  return sanitizeState(snapshot);
};

export const getShareTargetsForManagement = (
  snapshot: ShareTargetState = state
): ShareTargetWithState[] => {
  const normalized = normalizeSnapshot(snapshot);
  const hiddenSet = new Set(normalized.hidden);
  return normalized.order
    .map((id) => {
      const definition = TARGET_MAP.get(id);
      if (!definition) return null;
      return { ...definition, visible: !hiddenSet.has(id) };
    })
    .filter(Boolean) as ShareTargetWithState[];
};

export const getVisibleShareTargets = (
  snapshot: ShareTargetState = state
): ShareTargetDefinition[] => {
  const normalized = normalizeSnapshot(snapshot);
  const hiddenSet = new Set(normalized.hidden);
  return normalized.order
    .filter((id) => !hiddenSet.has(id))
    .map((id) => TARGET_MAP.get(id)!)
    .filter(Boolean);
};

export const getRecentShareTargetIds = (
  snapshot: ShareTargetState = state
): string[] => {
  const normalized = normalizeSnapshot(snapshot);
  return [...normalized.recents];
};

export const recordShareTargetUse = (id: string) => {
  if (!TARGET_MAP.has(id)) return;
  const existing = state.recents.filter((entry) => entry !== id);
  const recents = [id, ...existing].slice(0, RECENT_LIMIT);
  updateState({ recents });
};

export const reorderShareTargets = (order: string[]) => {
  const sanitized = dedupe(order);
  updateState({ order: sanitized });
};

export const setShareTargetVisibility = (id: string, visible: boolean) => {
  if (!TARGET_MAP.has(id)) return;
  const hidden = new Set(state.hidden);
  if (!visible) {
    hidden.add(id);
  } else {
    hidden.delete(id);
  }
  updateState({ hidden: [...hidden] });
};

export const getShareTargetDefinition = (id: string) => TARGET_MAP.get(id);

export const getAllShareTargets = () => INSTALLED_SHARE_TARGETS;

export const resetShareTargetSettings = () => {
  state = createDefaultState();
  if (safeLocalStorage) {
    try {
      safeLocalStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
  emit();
};

export type { ShareTargetState as ShareTargetsSnapshot };

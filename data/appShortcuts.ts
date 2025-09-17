import { HelpOverlayContextMetadata, HelpOverlayShortcut } from '../components/system/HelpOverlay';

type AppShortcutEntry = {
  appName?: string;
  shortcuts: HelpOverlayShortcut[];
};

const TAB_SHORTCUTS: HelpOverlayShortcut[] = [
  { description: 'Open a new tab', keys: 'Ctrl+T' },
  { description: 'Close the current tab', keys: 'Ctrl+W' },
  { description: 'Switch to the next tab', keys: 'Ctrl+Tab' },
  { description: 'Switch to the previous tab', keys: 'Ctrl+Shift+Tab' },
  { description: 'Select adjacent tab', keys: 'ArrowLeft / ArrowRight' },
];

const APP_SHORTCUTS: Record<string, AppShortcutEntry> = {
  terminal: { appName: 'Terminal', shortcuts: TAB_SHORTCUTS },
  hydra: { appName: 'Hydra', shortcuts: TAB_SHORTCUTS },
  reaver: { appName: 'Reaver', shortcuts: TAB_SHORTCUTS },
  http: { appName: 'HTTP Request Builder', shortcuts: TAB_SHORTCUTS },
  ssh: { appName: 'SSH Command Builder', shortcuts: TAB_SHORTCUTS },
};

export type HelpOverlayOverride = Pick<HelpOverlayContextMetadata, 'appName' | 'shortcuts'>;

export const getAppShortcutContext = (
  appId: string,
  fallbackName?: string,
): HelpOverlayContextMetadata | null => {
  const entry = APP_SHORTCUTS[appId];
  if (!entry || entry.shortcuts.length === 0) return null;
  return {
    appId,
    appName: entry.appName || fallbackName || appId,
    shortcuts: entry.shortcuts.map((shortcut) => ({ ...shortcut })),
  };
};

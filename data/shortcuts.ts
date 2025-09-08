export interface Shortcut {
  description: string;
  keys: string;
}

export const GLOBAL_SHORTCUTS: Shortcut[] = [
  { description: 'Show keyboard shortcuts', keys: 'F1' },
  { description: 'Open settings', keys: 'Ctrl+,' },
  { description: 'Window switcher', keys: 'Alt+Tab' },
  { description: 'Focus panel', keys: 'Ctrl+Alt+Tab' },
  { description: 'Close window', keys: 'Alt+F4' },
  { description: 'Switch workspace left', keys: 'Ctrl+Alt+ArrowLeft' },
  { description: 'Switch workspace right', keys: 'Ctrl+Alt+ArrowRight' },
];

export default GLOBAL_SHORTCUTS;

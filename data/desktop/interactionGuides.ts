export interface DesktopKeyBinding {
  id: string;
  /** Title shown in documentation and overlays */
  title: string;
  /** Stable description used for persisted keymap values */
  description: string;
  /** Default combo string persisted to settings. */
  combo: string;
  /** Individual keycaps rendered in the cheat sheet overlay. */
  displayKeys: string[];
  /** Logical group for rendering. */
  group: string;
  /** Whether the shortcut can be rebound in settings. */
  configurable?: boolean;
  /** Optional helper text shown alongside the shortcut. */
  note?: string;
}

export interface DesktopKeyBindingSection {
  id: string;
  title: string;
  bindings: DesktopKeyBinding[];
}

export interface DesktopGesture {
  id: string;
  title: string;
  description: string;
}

export const DESKTOP_KEY_BINDING_SECTIONS: DesktopKeyBindingSection[] = [
  {
    id: 'global',
    title: 'Global',
    bindings: [
      {
        id: 'toggle-shortcuts',
        title: 'Toggle desktop cheat sheet',
        description: 'Show keyboard shortcuts',
        combo: '?',
        displayKeys: ['Shift', '?'],
        group: 'Global',
        configurable: true,
        note: 'Opens this reference overlay from anywhere on the desktop.',
      },
      {
        id: 'open-settings',
        title: 'Open settings',
        description: 'Open settings',
        combo: 'Ctrl+,',
        displayKeys: ['Ctrl', ','],
        group: 'Global',
        configurable: true,
      },
    ],
  },
  {
    id: 'window-management',
    title: 'Window management',
    bindings: [
      {
        id: 'switcher',
        title: 'Open window switcher',
        description: 'Open window switcher',
        combo: 'Alt+Tab',
        displayKeys: ['Alt', 'Tab'],
        group: 'Window management',
        note: 'Hold Alt and tap Tab to keep cycling through apps.',
      },
      {
        id: 'cycle-windows',
        title: 'Cycle windows within app',
        description: 'Cycle windows within app',
        combo: 'Alt+`',
        displayKeys: ['Alt', '`'],
        group: 'Window management',
        note: 'Use Shift for the reverse order.',
      },
      {
        id: 'cycle-apps',
        title: 'Cycle focused apps',
        description: 'Cycle focused apps',
        combo: 'Alt+Tab (hold)',
        displayKeys: ['Alt', 'Tab'],
        group: 'Window management',
        note: 'Continue holding Alt and press Tab to move forward or Shift+Tab to go backward.',
      },
      {
        id: 'snap-window',
        title: 'Snap window',
        description: 'Snap window',
        combo: 'Meta+ArrowLeft',
        displayKeys: ['Super', 'Arrow Keys'],
        group: 'Window management',
        note: 'Use the Super (⌘/Windows) key with any arrow key to snap.',
      },
    ],
  },
  {
    id: 'utilities',
    title: 'Utilities',
    bindings: [
      {
        id: 'clipboard-manager',
        title: 'Open clipboard manager',
        description: 'Open clipboard manager',
        combo: 'Ctrl+Shift+V',
        displayKeys: ['Ctrl', 'Shift', 'V'],
        group: 'Utilities',
      },
    ],
  },
];

export const DESKTOP_KEY_BINDINGS: DesktopKeyBinding[] = DESKTOP_KEY_BINDING_SECTIONS.flatMap(
  (section) => section.bindings,
);

export const CHEAT_SHEET_SHORTCUT = DESKTOP_KEY_BINDINGS.find(
  (binding) => binding.id === 'toggle-shortcuts',
);

if (!CHEAT_SHEET_SHORTCUT) {
  throw new Error('Cheat sheet shortcut metadata is missing');
}

export const CUSTOMIZABLE_DESKTOP_SHORTCUTS = DESKTOP_KEY_BINDINGS.filter(
  (binding) => binding.configurable,
);

export const DESKTOP_GESTURES: DesktopGesture[] = [
  {
    id: 'swipe-to-snap',
    title: 'Swipe to snap',
    description:
      'A quick single-finger swipe left or right on the focused window dispatches the Super+Arrow shortcut and snaps it.',
  },
  {
    id: 'three-finger-overview',
    title: 'Three-finger overview',
    description:
      'Swipe upward with three fingers to open the window overview. Lift all fingers to reset the gesture state.',
  },
];

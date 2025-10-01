export interface StatusBarTip {
  id: string;
  title: string;
  body: string;
}

export const STATUS_BAR_TIPS: StatusBarTip[] = [
  {
    id: 'shortcuts-super',
    title: 'Launcher shortcut',
    body: 'Press the Super key to open the Kali-style launcher and search apps instantly.',
  },
  {
    id: 'lab-mode',
    title: 'Lab Mode reminders',
    body: 'Enable Lab Mode to keep tools in guided simulation. Look for the toggle in security tool windows.',
  },
  {
    id: 'workspace-switching',
    title: 'Workspace switching',
    body: 'Use Ctrl+Alt+Arrow to move between workspaces and keep demos organized.',
  },
  {
    id: 'network-toggle',
    title: 'Safe networking',
    body: 'Disable external networking from Quick Settings when exploring tools to stay in offline simulation.',
  },
];

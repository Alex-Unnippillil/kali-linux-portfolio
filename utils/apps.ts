export type AppType = 'internal' | 'external' | 'game';

export interface AppEntry {
  id: string;
  title: string;
  icon: string;
  type: AppType;
  url?: string; // allowlisted URL for external apps
}

export const appRegistry: Record<string, AppEntry> = {
  chrome: {
    id: 'chrome',
    title: 'Google Chrome',
    icon: './themes/Yaru/apps/chrome.png',
    type: 'external',
    // Allow navigation to any URL within the embedded browser
    url: '*',
  },
  todoist: {
    id: 'todoist',
    title: 'Todoist',
    icon: './themes/Yaru/apps/todoist.png',
    type: 'external',
    url: 'https://todoist.com/showProject?id=220474322',
  },
  ghidra: {
    id: 'ghidra',
    title: 'Ghidra',
    icon: './themes/Yaru/apps/ghidra.svg',
    type: 'external',
    url: 'https://ghidra.app',
  },
  vscode: {
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: './themes/Yaru/apps/vscode.png',
    type: 'external',
    url: 'https://stackblitz.com',
  },
  platformer: {
    id: 'platformer',
    title: 'Platformer',
    icon: './themes/Yaru/apps/platformer.svg',
    type: 'game',
    url: '/apps/platformer/index.html',
  },
  spotify: {
    id: 'spotify',
    title: 'Spotify',
    icon: './themes/Yaru/apps/spotify.svg',
    type: 'external',
    url: 'https://open.spotify.com',
  },
  'github-button': {
    id: 'github-button',
    title: 'GitHub Button',
    icon: '',
    type: 'external',
    url: 'https://ghbtns.com',
  },
};

export default appRegistry;

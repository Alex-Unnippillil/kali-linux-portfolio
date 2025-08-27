export interface AppInfo {
  title: string;
  icon: string;
  type: string;
  url: string;
}

const apps: Record<string, AppInfo> = {
  vscode: {
    title: 'Visual Studio Code',
    icon: './themes/Yaru/apps/vscode.png',
    type: 'external',
    url: 'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md',
  },
  chrome: {
    title: 'Google Chrome',
    icon: './themes/Yaru/apps/chrome.png',
    type: 'external',
    url: 'https://www.google.com/webhp?igu=1',
  },
  spotify: {
    title: 'Spotify',
    icon: './themes/Yaru/apps/spotify.svg',
    type: 'external',
    url: 'https://open.spotify.com/embed/playlist/37i9dQZF1E37fa3zdWtvQY?utm_source=generator&theme=0',
  },
  todoist: {
    title: 'Todoist',
    icon: './themes/Yaru/apps/todoist.png',
    type: 'external',
    url: 'https://todoist.com/showProject?id=220474322',
  },
  ghidra: {
    title: 'Ghidra',
    icon: './themes/Yaru/apps/ghidra.svg',
    type: 'external',
    url: 'https://ghidra.app',
  },
};

export default apps;

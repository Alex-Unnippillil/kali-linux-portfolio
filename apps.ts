export interface AppMeta {
  title: string;
  icon: string;
  type: 'external';
  url: string;
}

const apps: Record<string, AppMeta> = {
  vscode: {
    title: 'Visual Studio Code',
    icon: './themes/Yaru/apps/vscode.png',
    type: 'external',
    url: 'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md',
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
    url: process.env.NEXT_PUBLIC_GHIDRA_URL || 'https://ghidra.app',
  },
};

export default apps;

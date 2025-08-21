import React from 'react';
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga4';

import { displayX } from './components/apps/x';
import { displaySpotify } from './components/apps/spotify';
import { displayVsCode } from './components/apps/vscode';
import { displaySettings } from './components/apps/settings';
import { displayChrome } from './components/apps/chrome';
import { displayTrash } from './components/apps/trash';
import { displayGedit } from './components/apps/gedit';
import { displayAboutAlex } from './components/apps/alex';
import { displayTodoist } from './components/apps/todoist';
import { displayYouTube } from './components/apps/youtube';

const TerminalApp = dynamic(
  () =>
    import('./components/apps/terminal').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Terminal' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Terminal...
      </div>
    ),
  }
);

const CalcApp = dynamic(
  () =>
    import('./components/apps/calc').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Calc' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Calc...
      </div>
    ),
  }
);

const TicTacToeApp = dynamic(
  () =>
    import('./components/apps/tictactoe').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded TicTacToe' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Tic Tac Toe...
      </div>
    ),
  }
);

const SokobanApp = dynamic(
  () =>
    import('./components/apps/sokoban').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Sokoban' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Sokoban...
      </div>
    ),
  }
);

const displayTerminal = (addFolder, openApp) => (
  <TerminalApp addFolder={addFolder} openApp={openApp} />
);

const displayTerminalCalc = (addFolder, openApp) => (
  <CalcApp addFolder={addFolder} openApp={openApp} />
);

const displayTicTacToe = (addFolder, openApp) => (
  <TicTacToeApp addFolder={addFolder} openApp={openApp} />
);

const displaySokoban = (addFolder, openApp) => (
  <SokobanApp addFolder={addFolder} openApp={openApp} />
);

const apps = [
  {
    id: 'chrome',
    title: 'Google Chrome',
    icon: './themes/Yaru/apps/chrome.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayChrome,
  },
  {
    id: 'calc',
    title: 'Calc',
    icon: './themes/Yaru/apps/calc.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminalCalc,
    resizable: false,
    allowMaximize: false,
    defaultWidth: 25,
    defaultHeight: 40,
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: './themes/Yaru/apps/tictactoe.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTicTacToe,
  },
  {
    id: 'about-alex',
    title: 'About Alex',
    icon: './themes/Yaru/system/user-home.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayAboutAlex,
  },
  {
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: './themes/Yaru/apps/vscode.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayVsCode,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: './themes/Yaru/apps/bash.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminal,
  },
  {
    id: 'x',
    title: 'X',
    icon: './themes/Yaru/apps/x.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayX,
  },
  {
    id: 'spotify',
    title: 'Spotify',
    icon: './themes/Yaru/apps/spotify.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySpotify,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: './themes/Yaru/apps/youtube.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayYouTube,
  },
  {
    id: 'todoist',
    title: 'Todoist',
    icon: './themes/Yaru/apps/todoist.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTodoist,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: './themes/Yaru/apps/gnome-control-center.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySettings,
  },
  {
    id: 'trash',
    title: 'Trash',
    icon: './themes/Yaru/system/user-trash-full.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTrash,
  },
  {
    id: 'gedit',
    title: 'Contact Me',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGedit,
  },
];

const games = [
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: './themes/Yaru/apps/tictactoe.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTicTacToe,
  },
  {
    id: 'sokoban',
    title: 'Sokoban',
    icon: './themes/Yaru/apps/sokoban.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySokoban,
  },
];
export default apps;
export { games };

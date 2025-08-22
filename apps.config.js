// File cleared by nuclear merger

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
import { displayConverter } from './components/apps/converter';
import { displayQrTool } from './components/apps/qr_tool';
import { displayMusicPlayer } from './components/apps/music_player';
import { displayAsciiArt } from './components/apps/ascii_art';
import { displayResourceMonitor } from './components/apps/resource_monitor';
import { displayQuoteGenerator } from './components/apps/quote_generator';
import { displayShowcase } from './components/apps/showcase';
import { displayProjectGallery } from './components/apps/project-gallery';

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
const BattleshipApp = dynamic(
  () =>
    import('./components/apps/battleship').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Battleship' });

const BlackjackApp = dynamic(
  () =>
    import('./components/apps/blackjack').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Blackjack' });

const SimonApp = dynamic(
  () =>
    import('./components/apps/simon').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Simon' });

const SolitaireApp = dynamic(
  () =>
    import('./components/apps/solitaire').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Solitaire' });

const Game2048App = dynamic(
  () =>
    import('./components/apps/2048').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded 2048' });
 
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Battleship...

        Loading Blackjack...
        Loading Simon...

        Loading Solitaire...
      </div>
    ),
  },

        Loading 2048...
      </div>
    ),
  }
);

const CarRacerApp = dynamic(
  () =>
    import('./components/apps/car-racer').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Car Racer' });

const AsteroidsApp = dynamic(
  () =>
    import('./components/apps/asteroids').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Asteroids' });
 
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Car Racer...

        Loading Asteroids...
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

const CheckersApp = dynamic(
  () =>
    import('./components/apps/checkers').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Checkers' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Checkers...
      </div>
    ),
  }
);

const TowerDefenseApp = dynamic(
  () =>
    import('./components/apps/tower-defense').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Tower Defense' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Tower Defense...
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
const displaySolitaire = (addFolder, openApp) => (
  <SolitaireApp addFolder={addFolder} openApp={openApp} />
);

const displaySokoban = (addFolder, openApp) => (
  <SokobanApp addFolder={addFolder} openApp={openApp} />
);



const display2048 = (addFolder, openApp) => (
  <Game2048App addFolder={addFolder} openApp={openApp} />
);

const displayCarRacer = (addFolder, openApp) => (
  <CarRacerApp addFolder={addFolder} openApp={openApp} />
);



const displayAsteroids = (addFolder, openApp) => (
  <AsteroidsApp addFolder={addFolder} openApp={openApp} />
);


const displaySimon = (addFolder, openApp) => (
  <SimonApp addFolder={addFolder} openApp={openApp} />
);


const displayBlackjack = (addFolder, openApp) => (
  <BlackjackApp addFolder={addFolder} openApp={openApp} />
);

const displayCheckers = (addFolder, openApp) => (
  <CheckersApp addFolder={addFolder} openApp={openApp} />
);



// Games list used for the "Games" folder on the desktop
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
    id: '2048',
    title: '2048',
    icon: './themes/Yaru/apps/2048.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: display2048,
  },
];

const displayBattleship = (addFolder, openApp) => (
  <BattleshipApp addFolder={addFolder} openApp={openApp} />
);


const displayTowerDefense = (addFolder, openApp) => (
  <TowerDefenseApp addFolder={addFolder} openApp={openApp} />
);


// Main application list displayed on the desktop and app launcher
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
  // Games are included so they appear alongside apps
  ...games,
  {
    id: 'converter',
    title: 'Converter',
    icon: './themes/Yaru/apps/calc.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConverter,
  },
  {
    id: 'qr-tool',
    title: 'QR Tool',
    icon: './themes/Yaru/apps/qr.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQrTool,
  },
  {
    id: 'ascii-art',
    title: 'ASCII Art',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsciiArt,
  },
  {
    id: 'quote-generator',
    title: 'Quote Generator',
    icon: './themes/Yaru/apps/quote.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQuoteGenerator,
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    icon: './themes/Yaru/apps/solitaire.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySolitaire,
    category: 'games',
  },
  {
    id: 'simon',
    title: 'Simon',
    icon: './themes/Yaru/apps/simon.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySimon,
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    icon: './themes/Yaru/apps/blackjack.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBlackjack,
  },
  {
    id: 'battleship',
    title: 'Battleship',
    icon: './themes/Yaru/apps/battleship.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBattleship,
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    icon: './themes/Yaru/apps/asteroids.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsteroids,
  },
  {
    id: 'checkers',
    title: 'Checkers',
    icon: './themes/Yaru/apps/checkers.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCheckers,
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
    id: 'music-player',
    title: 'Music Player',
    icon: './themes/Yaru/apps/music.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayMusicPlayer,
    resizable: false,
    allowMaximize: false,
    defaultWidth: 25,
    defaultHeight: 40,
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
    id: 'resource-monitor',
    title: 'Resource Monitor',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayResourceMonitor,
  },
  {
    id: 'showcase',
    title: '3D Showcase',
    icon: './themes/Yaru/apps/showcase.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayShowcase,
  },
  {
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: './themes/Yaru/apps/project-gallery.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayProjectGallery,
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
    id: 'tower-defense',
    title: 'Tower Defense',
    icon: './themes/Yaru/apps/tower-defense.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTowerDefense,

    id: 'car-racer',
    title: 'Car Racer',
    icon: './themes/Yaru/apps/car-racer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCarRacer,
  },
];

    id: 'sokoban',
    title: 'Sokoban',
    icon: './themes/Yaru/apps/sokoban.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySokoban,
  },
];

    screen: displayTicTacToe,
  },
  {
    id: 'simon',
    title: 'Simon',
    icon: './themes/Yaru/apps/simon.svg',
    screen: displaySimon,
  },
];

export { games };
export default apps;
export { games };

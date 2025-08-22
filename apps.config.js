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

const ChessApp = dynamic(
  () =>
    import('./components/apps/chess').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Chess' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Chess...
      </div>
    ),
  }

);

const HangmanApp = dynamic(
  () =>
    import('./components/apps/hangman').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Hangman' });

const FroggerApp = dynamic(
  () =>
    import('./components/apps/frogger').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Frogger' });

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
        Loading Hangman...

        Loading Frogger...
        Loading 2048...
      </div>
    ),
  }
);

const HangmanApp = dynamic(
  () =>
    import('./components/apps/hangman').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Hangman' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Hangman...
      </div>
    ),
  }

);

const SnakeApp = dynamic(
  () =>
    import('./components/apps/snake').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Snake' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Snake...
      </div>
    ),
  }
);

const MemoryApp = dynamic(
  () =>
    import('./components/apps/memory').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Memory' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Memory...
      </div>
    ),
  }
);

const MinesweeperApp = dynamic(
  () =>
    import('./components/apps/minesweeper').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Minesweeper' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Minesweeper...
      </div>
    ),
  },
);

const PongApp = dynamic(
  () =>
    import('./components/apps/pong').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Pong' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Pong...
      </div>
    ),
  }
);

const PacmanApp = dynamic(
  () =>
    import('./components/apps/pacman').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Pacman' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Pacman...
      </div>
    ),
  }
);

const SudokuApp = dynamic(
  () =>
    import('./components/apps/sudoku').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Sudoku' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Sudoku...
      </div>
    ),
  }
);

const SpaceInvadersApp = dynamic(
  () =>
    import('./components/apps/space-invaders').then((mod) => {
      ReactGA.event({ category: 'Application', action: 'Loaded Space Invaders' });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Space Invaders...
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

const displaySpaceInvaders = (addFolder, openApp) => (
  <SpaceInvadersApp addFolder={addFolder} openApp={openApp} />
);

const displaySudoku = (addFolder, openApp) => (
  <SudokuApp addFolder={addFolder} openApp={openApp} />
);


const displayPacman = (addFolder, openApp) => (
  <PacmanApp addFolder={addFolder} openApp={openApp} />
);


const displayPong = (addFolder, openApp) => (
  <PongApp addFolder={addFolder} openApp={openApp} />
);


const displayMinesweeper = (addFolder, openApp) => (
  <MinesweeperApp addFolder={addFolder} openApp={openApp} />
);


const displayMemory = (addFolder, openApp) => (
  <MemoryApp addFolder={addFolder} openApp={openApp} />
);


const displaySnake = (addFolder, openApp) => (
  <SnakeApp addFolder={addFolder} openApp={openApp} />
);



const displayHangman = (addFolder, openApp) => (
  <HangmanApp addFolder={addFolder} openApp={openApp} />
);


const displayChess = (addFolder, openApp) => (
  <ChessApp addFolder={addFolder} openApp={openApp} />
);



const displayHangman = (addFolder, openApp) => (
  <HangmanApp addFolder={addFolder} openApp={openApp} />
);
const displayFrogger = (addFolder, openApp) => (
  <FroggerApp addFolder={addFolder} openApp={openApp} />
);


const display2048 = (addFolder, openApp) => (
  <Game2048App addFolder={addFolder} openApp={openApp} />
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

    id: 'pong',
    title: 'Pong',
    icon: './themes/Yaru/apps/pong.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPong,
  },
];



    id: 'chess',
    title: 'Chess',
    icon: './themes/Yaru/apps/chess.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayChess,
  },
];


    id: 'hangman',
    title: 'Hangman',
    icon: './themes/Yaru/apps/hangman.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHangman,
  },
];



    id: 'frogger',
    title: 'Frogger',
    icon: './themes/Yaru/apps/frogger.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFrogger,
  },
];


    id: '2048',
    title: '2048',
    icon: './themes/Yaru/apps/2048.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: display2048,
  },
];


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
  ...games,



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
    id: 'space-invaders',
    title: 'Space Invaders',
    icon: './themes/Yaru/apps/space-invaders.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySpaceInvaders,
  },
  {

    id: 'memory',
    title: 'Memory',
    icon: './themes/Yaru/apps/memory.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMemory,
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    icon: './themes/Yaru/apps/sudoku.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySudoku,
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
    id: 'pacman',
    title: 'Pacman',
    icon: './themes/Yaru/apps/pacman.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPacman,
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
    id: 'hangman',
    title: 'Hangman',
    icon: './themes/Yaru/apps/hangman.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHangman,
  },
  {
    id: 'hangman',
    title: 'Hangman',
    icon: './themes/Yaru/apps/hangman.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHangman,
  },    {
      id: 'minesweeper',
      title: 'Minesweeper',
      icon: './themes/Yaru/apps/minesweeper.svg',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: displayMinesweeper,
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
  ...games,
];

const games = [
=======
export const games = [
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
    id: 'space-invaders',
    title: 'Space Invaders',
    icon: './themes/Yaru/apps/space-invaders.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySpaceInvaders,
  },
];


    screen: displayTicTacToe,
  },
  {
    id: 'snake',
    title: 'Snake',
    icon: './themes/Yaru/apps/snake.svg',
    screen: displaySnake,
  },
];
const games = apps.filter((app) => ['tictactoe', 'memory'].includes(app.id));

export { games };




export { games };
export default apps;
export { games };

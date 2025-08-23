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
import { displayWeather } from './components/apps/weather';
import { displayConverter } from './components/apps/converter';
import { displayQrTool } from './components/apps/qr_tool';
import { displayRegexRedactor } from './components/apps/regex-redactor';
import { displayAsciiArt } from './components/apps/ascii_art';
import { displayResourceMonitor } from './components/apps/resource_monitor';
import { displayQuoteGenerator } from './components/apps/quote_generator';
import { displayProjectGallery } from './components/apps/project-gallery';

export const THEME = process.env.NEXT_PUBLIC_THEME || 'Yaru';
export const icon = (name) => `./themes/${THEME}/apps/${name}`;
export const sys = (name) => `./themes/${THEME}/system/${name}`;

const createDynamicApp = (path, name) =>
  dynamic(
    () =>
      import(`./components/apps/${path}`).then((mod) => {
        ReactGA.event({ category: 'Application', action: `Loaded ${name}` });
        return mod.default;
      }),
    {
      ssr: false,
      loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-panel text-white">
          {`Loading ${name}...`}
        </div>
      ),
    }
  );

const createDisplay = (Component) => {
  const DisplayComponent = (addFolder, openApp) => (
    <Component addFolder={addFolder} openApp={openApp} />
  );
  DisplayComponent.displayName = Component.displayName || Component.name || 'Component';
  return DisplayComponent;
};

// Dynamic applications and games
const TerminalApp = createDynamicApp('terminal', 'Terminal');
const CalcApp = createDynamicApp('calc', 'Calc');
const TicTacToeApp = createDynamicApp('tictactoe', 'Tic Tac Toe');
const ChessApp = createDynamicApp('chess', 'Chess');
const ConnectFourApp = createDynamicApp('connect-four', 'Connect Four');
const HangmanApp = createDynamicApp('hangman', 'Hangman');
const FroggerApp = createDynamicApp('frogger', 'Frogger');
const FlappyBirdApp = createDynamicApp('flappy-bird', 'Flappy Bird');
const Game2048App = createDynamicApp('2048', '2048');
const SnakeApp = createDynamicApp('snake', 'Snake');
const MemoryApp = createDynamicApp('memory', 'Memory');
const MinesweeperApp = createDynamicApp('minesweeper', 'Minesweeper');
const PongApp = createDynamicApp('pong', 'Pong');
const PacmanApp = createDynamicApp('pacman', 'Pacman');
const CarRacerApp = createDynamicApp('car-racer', 'Car Racer');
const PlatformerApp = createDynamicApp('platformer', 'Platformer');
const BattleshipApp = createDynamicApp('battleship', 'Battleship');
const CheckersApp = createDynamicApp('checkers', 'Checkers');
const ReversiApp = createDynamicApp('reversi', 'Reversi');
const SimonApp = createDynamicApp('simon', 'Simon');
const SokobanApp = createDynamicApp('sokoban', 'Sokoban');
const SolitaireApp = createDynamicApp('solitaire', 'Solitaire');
const TowerDefenseApp = createDynamicApp('tower-defense', 'Tower Defense');
const WordSearchApp = createDynamicApp('word-search', 'Word Search');
const WordleApp = createDynamicApp('wordle', 'Wordle');
const BlackjackApp = createDynamicApp('blackjack', 'Blackjack');
const BreakoutApp = createDynamicApp('breakout', 'Breakout');
const AsteroidsApp = createDynamicApp('asteroids', 'Asteroids');
const SudokuApp = createDynamicApp('sudoku', 'Sudoku');
const SpaceInvadersApp = createDynamicApp('space-invaders', 'Space Invaders');
const NonogramApp = createDynamicApp('nonogram', 'Nonogram');
const TetrisApp = createDynamicApp('tetris', 'Tetris');
const CandyCrushApp = createDynamicApp('candy-crush', 'Candy Crush');
const MailAuthApp = createDynamicApp('mail-auth', 'Mail Auth');

const CveDashboardApp = createDynamicApp('cve-dashboard', 'CVE Dashboard');

const GomokuApp = createDynamicApp('gomoku', 'Gomoku');
const PinballApp = createDynamicApp('pinball', 'Pinball');
const PcapViewerApp = createDynamicApp('pcap-viewer', 'PCAP Viewer');

const YaraTesterApp = createDynamicApp('yara-tester', 'YARA Tester');

const ThreatModelerApp = createDynamicApp('threat-modeler', 'Threat Modeler');

const ContentFingerprintApp = createDynamicApp('content-fingerprint', 'Content Fingerprint');
const ReportViewerApp = createDynamicApp('report-viewer', 'Report Viewer');

const CookieJarApp = createDynamicApp('cookie-jar', 'Cookie Jar');



const displayTerminal = createDisplay(TerminalApp);
const displayTerminalCalc = createDisplay(CalcApp);
const displayTicTacToe = createDisplay(TicTacToeApp);
const displayChess = createDisplay(ChessApp);
const displayConnectFour = createDisplay(ConnectFourApp);
const displayHangman = createDisplay(HangmanApp);
const displayFrogger = createDisplay(FroggerApp);
const displayFlappyBird = createDisplay(FlappyBirdApp);
const display2048 = createDisplay(Game2048App);
const displaySnake = createDisplay(SnakeApp);
const displayMemory = createDisplay(MemoryApp);
const displayMinesweeper = createDisplay(MinesweeperApp);
const displayPong = createDisplay(PongApp);
const displayPacman = createDisplay(PacmanApp);
const displayCarRacer = createDisplay(CarRacerApp);
const displayPlatformer = createDisplay(PlatformerApp);
const displayBattleship = createDisplay(BattleshipApp);
const displayCheckers = createDisplay(CheckersApp);
const displayReversi = createDisplay(ReversiApp);
const displaySimon = createDisplay(SimonApp);
const displaySokoban = createDisplay(SokobanApp);
const displaySolitaire = createDisplay(SolitaireApp);
const displayTowerDefense = createDisplay(TowerDefenseApp);
const displayWordSearch = createDisplay(WordSearchApp);
const displayWordle = createDisplay(WordleApp);
const displayBlackjack = createDisplay(BlackjackApp);
const displayBreakout = createDisplay(BreakoutApp);
const displayAsteroids = createDisplay(AsteroidsApp);
const displaySudoku = createDisplay(SudokuApp);
const displaySpaceInvaders = createDisplay(SpaceInvadersApp);
const displayNonogram = createDisplay(NonogramApp);
const displayTetris = createDisplay(TetrisApp);
const displayCandyCrush = createDisplay(CandyCrushApp);
const displayMailAuth = createDisplay(MailAuthApp);

const displayCveDashboard = createDisplay(CveDashboardApp);

const displayGomoku = createDisplay(GomokuApp);
const displayPinball = createDisplay(PinballApp);
const displayPcapViewer = createDisplay(PcapViewerApp);

const displayYaraTester = createDisplay(YaraTesterApp);

const displayThreatModeler = createDisplay(ThreatModelerApp);

const displayContentFingerprint = createDisplay(ContentFingerprintApp);
const displayReportViewer = createDisplay(ReportViewerApp);

const displayCookieJar = createDisplay(CookieJarApp);


// Default window sizing for games to prevent oversized frames
const gameDefaults = {
  defaultWidth: 50,
  defaultHeight: 60,
};

// Games list used for the "Games" folder on the desktop
const gameList = [
  {
    id: '2048',
    title: '2048',
    icon: icon('2048.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: display2048,
    defaultWidth: 35,
    defaultHeight: 45,
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    icon: icon('asteroids.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsteroids,
  },
  {
    id: 'battleship',
    title: 'Battleship',
    icon: icon('battleship.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBattleship,
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    icon: icon('blackjack.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBlackjack,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    icon: icon('breakout.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBreakout,
  },
  {
    id: 'car-racer',
    title: 'Car Racer',
    icon: icon('car-racer.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCarRacer,
  },
  {
    id: 'checkers',
    title: 'Checkers',
    icon: icon('checkers.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCheckers,
  },
  {
    id: 'chess',
    title: 'Chess',
    icon: icon('chess.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayChess,
  },
  {
    id: 'connect-four',
    title: 'Connect Four',
    icon: icon('connect-four.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConnectFour,
  },
  {
    id: 'frogger',
    title: 'Frogger',
    icon: icon('frogger.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFrogger,
  },
  {
    id: 'hangman',
    title: 'Hangman',
    icon: icon('hangman.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHangman,
  },
  {
    id: 'memory',
    title: 'Memory',
    icon: icon('memory.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMemory,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    icon: icon('minesweeper.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMinesweeper,
  },
  {
    id: 'pacman',
    title: 'Pacman',
    icon: icon('pacman.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPacman,
  },
  {
    id: 'platformer',
    title: 'Platformer',
    icon: icon('platformer.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPlatformer,
  },
  {
    id: 'pong',
    title: 'Pong',
    icon: icon('pong.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPong,
  },
  {
    id: 'reversi',
    title: 'Reversi',
    icon: icon('reversi.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReversi,
  },
  {
    id: 'simon',
    title: 'Simon',
    icon: icon('simon.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySimon,
  },
  {
    id: 'snake',
    title: 'Snake',
    icon: icon('snake.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySnake,
  },
  {
    id: 'sokoban',
    title: 'Sokoban',
    icon: icon('sokoban.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySokoban,
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    icon: icon('solitaire.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySolitaire,
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: icon('tictactoe.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTicTacToe,
  },
  {
    id: 'tetris',
    title: 'Tetris',
    icon: icon('tetris.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTetris,
  },
  {
    id: 'tower-defense',
    title: 'Tower Defense',
    icon: icon('tower-defense.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTowerDefense,
  },
  {
    id: 'word-search',
    title: 'Word Search',
    icon: icon('word-search.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordSearch,
  },
  {
    id: 'wordle',
    title: 'Wordle',
    icon: icon('wordle.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordle,
  },
  {
    id: 'nonogram',
    title: 'Nonogram',
    icon: icon('nonogram.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNonogram,
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    icon: icon('space-invaders.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySpaceInvaders,
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    icon: icon('sudoku.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySudoku,
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    icon: icon('flappy-bird.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFlappyBird,
  },
  {
    id: 'candy-crush',
    title: 'Candy Crush',
    icon: icon('candy-crush.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCandyCrush,
  },
  {
    id: 'gomoku',
    title: 'Gomoku',
    icon: icon('gomoku.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGomoku,
  },
  {
    id: 'pinball',
    title: 'Pinball',
    icon: icon('pinball.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPinball,
  },
];

export const games = gameList.map((game) => ({ ...gameDefaults, ...game }));

const apps = [
  {
    id: 'chrome',
    title: 'Firefox',
    icon: icon('kali-browser.svg'),
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayChrome,
  },
  {
    id: 'calc',
    title: 'Calc',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTerminalCalc,
    resizable: false,
    allowMaximize: false,
    defaultWidth: 25,
    defaultHeight: 40,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: icon('bash.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminal,
  },
  {
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: icon('vscode.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayVsCode,
  },
  {
    id: 'x',
    title: 'X',
    icon: icon('x.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayX,
  },
  {
    id: 'spotify',
    title: 'Spotify',
    icon: icon('spotify.svg'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySpotify,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: icon('youtube.svg'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayYouTube,
  },
  {
    id: 'about-alex',
    title: 'About Alex',
    icon: sys('user-home.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayAboutAlex,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: icon('gnome-control-center.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySettings,
  },
  {
    id: 'resource-monitor',
    title: 'Resource Monitor',
    icon: icon('resource-monitor.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayResourceMonitor,
  },
  {
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: icon('project-gallery.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayProjectGallery,
  },
  {
    id: 'todoist',
    title: 'Todoist',
    icon: icon('todoist.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTodoist,
  },
  {
    id: 'trash',
    title: 'Trash',
    icon: sys('user-trash-full.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTrash,
  },
  {
    id: 'gedit',
    title: 'Contact Me',
    icon: icon('gedit.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGedit,
  },
  {
    id: 'converter',
    title: 'Converter',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConverter,
  },
  {
    id: 'qr-tool',
    title: 'QR Tool',
    icon: icon('qr.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQrTool,
  },
  {
    id: 'regex-redactor',
    title: 'Regex Redactor',
    icon: './themes/Yaru/apps/regex-redactor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRegexRedactor,
  },
  {
    id: 'ascii-art',
    title: 'ASCII Art',
    icon: icon('gedit.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsciiArt,
  },
  {
    id: 'quote-generator',
    title: 'Quote Generator',
    icon: icon('quote.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQuoteGenerator,
  },
  {
    id: 'cve-dashboard',
    title: 'CVE Dashboard',
    icon: './themes/Yaru/apps/calc.png',
    id: 'pcap-viewer',
    title: 'PCAP Viewer',
    icon: './themes/Yaru/apps/pcap-viewer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPcapViewer,

    id: 'yara-tester',
    title: 'YARA Tester',
    icon: './themes/Yaru/apps/bash.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayYaraTester,
  },
  {
    id: 'weather',
    title: 'Weather',
    icon: icon('weather.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCveDashboard,
  },


  {
    id: 'mail-auth',
    title: 'Mail Auth',
    icon: './themes/Yaru/apps/mail-auth.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMailAuth,

    id: 'threat-modeler',
    title: 'Threat Modeler',
    icon: './themes/Yaru/apps/threat-modeler.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayThreatModeler,
  },
  // Games are included so they appear alongside apps
  ...games,
];

    {
      id: 'weather',
      title: 'Weather',
      icon: './themes/Yaru/apps/weather.svg',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: displayWeather,
    },
    {
      id: 'cookie-jar',
      title: 'Cookie Jar',
      icon: './themes/Yaru/apps/cookie-jar.svg',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: displayCookieJar,
    },
    {
      id: 'content-fingerprint',
      title: 'Content Fingerprint',
      icon: './themes/Yaru/apps/content-fingerprint.svg',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: displayContentFingerprint,
    },
    {
      id: 'report-viewer',
      title: 'Report Viewer',
      icon: './themes/Yaru/apps/gedit.png',
      disabled: false,
      favourite: false,
      desktop_shortcut: false,
      screen: displayReportViewer,
    },
    // Games are included so they appear alongside apps
    ...games,
  ];

export default apps;

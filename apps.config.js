import { display2048 } from './components/apps/2048';
import { displayAboutAlex } from './components/apps/alex';
import { displayAsciiArt } from './components/apps/ascii_art';
import { displayAsteroids } from './components/apps/asteroids';
import { displayAutopsy } from './components/apps/autopsy';
import { displayBattleship } from './components/apps/battleship';
import { displayBeef } from './components/apps/beef';
import { displayBlackjack } from './components/apps/blackjack';
import { displayBluetooth } from './components/apps/bluetooth';
import { displayBreakout } from './components/apps/breakout';
import { displayTerminalCalc } from './components/apps/calc';
import { displayCandyCrush } from './components/apps/candy-crush';
import { displayCarRacer } from './components/apps/car-racer';
import { displayCheckers } from './components/apps/checkers';
import { displayChess } from './components/apps/chess';
import { displayChrome } from './components/apps/chrome';
import { displayConnectFour } from './components/apps/connect-four';
import { displayConverter } from './components/apps/converter';
import { displayDsniff } from './components/apps/dsniff';
import { displayEttercap } from './components/apps/ettercap';
import { displayFiglet } from './components/apps/figlet';
import { displayFlappyBird } from './components/apps/flappy-bird';
import { displayFrogger } from './components/apps/frogger';
import { displayGame } from './components/apps/game';
import { displayGedit } from './components/apps/gedit';
import { displayGhidra } from './components/apps/ghidra';
import { displayGomoku } from './components/apps/gomoku';
import { displayHangman } from './components/apps/hangman';
import { displayHashcat } from './components/apps/hashcat';
import { displayHydra } from './components/apps/hydra';
import { displayJohn } from './components/apps/john';
import { displayKismet } from './components/apps/kismet';
import { displayMemory } from './components/apps/memory';
import { displayMetasploit } from './components/apps/metasploit';
import { displayMimikatz } from './components/apps/mimikatz';
import { displayMinesweeper } from './components/apps/minesweeper';
import { displayMsfPost } from './components/apps/msf-post';
import { displayNessus } from './components/apps/nessus';
import { displayNikto } from './components/apps/nikto';
import { displayNmapNSE } from './components/apps/nmap-nse';
import { displayNonogram } from './components/apps/nonogram';
import { displayOpenVAS } from './components/apps/openvas';
import { displayPacman } from './components/apps/pacman';
import { displayPinball } from './components/apps/pinball';
import { displayPlatformer } from './components/apps/platformer';
import { displayPong } from './components/apps/pong';
import { displayProjectGallery } from './components/apps/project-gallery';
import { displayQrTool } from './components/apps/qr_tool';
import { displayQuoteGenerator } from './components/apps/quote_generator';
import { displayRadare2 } from './components/apps/radare2';
import { displayReaver } from './components/apps/reaver';
import { displayReconNG } from './components/apps/reconng';
import { displayResourceMonitor } from './components/apps/resource_monitor';
import { displayReversi } from './components/apps/reversi';
import { displaySettings } from './components/apps/settings';
import { displaySimon } from './components/apps/simon';
import { displaySnake } from './components/apps/snake';
import { displaySokoban } from './components/apps/sokoban';
import { displaySolitaire } from './components/apps/solitaire';
import { displaySpaceInvaders } from './components/apps/space-invaders';
import { displaySpotify } from './components/apps/spotify';
import { displaySudoku } from './components/apps/sudoku';
import { displayTerminal } from './components/apps/terminal';
import { displayTetris } from './components/apps/tetris';
import { displayTictactoe } from './components/apps/tictactoe';
import { displayTodoist } from './components/apps/todoist';
import { displayTowerDefense } from './components/apps/tower-defense';
import { displayTrash } from './components/apps/trash';
import { displayVolatility } from './components/apps/volatility';
import { displayVsCode } from './components/apps/vscode';
import { displayWeather } from './components/apps/weather';
import { displayWireshark } from './components/apps/wireshark';
import { displayWordSearch } from './components/apps/word-search';
import { displayWordle } from './components/apps/wordle';
import { displayX } from './components/apps/x';
import { displayYouTube } from './components/apps/youtube';

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
    icon: './themes/Yaru/apps/2048.svg',
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
    icon: './themes/Yaru/apps/asteroids.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsteroids,
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
    id: 'blackjack',
    title: 'Blackjack',
    icon: './themes/Yaru/apps/blackjack.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBlackjack,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    icon: './themes/Yaru/apps/breakout.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBreakout,
  },
  {
    id: 'car-racer',
    title: 'Car Racer',
    icon: './themes/Yaru/apps/car-racer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCarRacer,
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
    id: 'chess',
    title: 'Chess',
    icon: './themes/Yaru/apps/chess.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayChess,
  },
  {
    id: 'connect-four',
    title: 'Connect Four',
    icon: './themes/Yaru/apps/connect-four.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConnectFour,
  },
  {
    id: 'frogger',
    title: 'Frogger',
    icon: './themes/Yaru/apps/frogger.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFrogger,
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
    id: 'memory',
    title: 'Memory',
    icon: './themes/Yaru/apps/memory.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMemory,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    icon: './themes/Yaru/apps/minesweeper.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMinesweeper,
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
    id: 'platformer',
    title: 'Platformer',
    icon: './themes/Yaru/apps/platformer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPlatformer,
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
  {
    id: 'reversi',
    title: 'Reversi',
    icon: './themes/Yaru/apps/reversi.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReversi,
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
    id: 'snake',
    title: 'Snake',
    icon: './themes/Yaru/apps/snake.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySnake,
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
  {
    id: 'solitaire',
    title: 'Solitaire',
    icon: './themes/Yaru/apps/solitaire.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySolitaire,
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
    id: 'tetris',
    title: 'Tetris',
    icon: './themes/Yaru/apps/tetris.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTetris,
  },
  {
    id: 'tower-defense',
    title: 'Tower Defense',
    icon: './themes/Yaru/apps/tower-defense.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTowerDefense,
  },
  {
    id: 'word-search',
    title: 'Word Search',
    icon: './themes/Yaru/apps/word-search.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordSearch,
  },
  {
    id: 'wordle',
    title: 'Wordle',
    icon: './themes/Yaru/apps/wordle.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordle,
  },
  {
    id: 'nonogram',
    title: 'Nonogram',
    icon: './themes/Yaru/apps/nonogram.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNonogram,
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
    id: 'sudoku',
    title: 'Sudoku',
    icon: './themes/Yaru/apps/sudoku.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySudoku,
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    icon: './themes/Yaru/apps/flappy-bird.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFlappyBird,
  },
  {
    id: 'candy-crush',
    title: 'Candy Crush',
    icon: './themes/Yaru/apps/candy-crush.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCandyCrush,

    id: 'gomoku',
    title: 'Gomoku',
    icon: './themes/Yaru/apps/gomoku.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGomoku,

    id: 'pinball',
    title: 'Pinball',
    icon: './themes/Yaru/apps/pinball.svg',
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
    icon: './themes/Yaru/apps/bash.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminal,
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
    id: 'beef',
    title: 'BeEF',
    icon: './themes/Yaru/apps/beef.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBeef,
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
    id: 'settings',
    title: 'Settings',
    icon: './themes/Yaru/apps/gnome-control-center.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySettings,
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
    id: 'ettercap',
    title: 'Ettercap',
    icon: './themes/Yaru/apps/ettercap.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayEttercap,
  },
  {
    id: 'bluetooth-tools',
    title: 'Bluetooth Tools',
    icon: './themes/Yaru/apps/bluetooth.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBluetooth,
  },
  {
    id: 'metasploit',
    title: 'Metasploit',
    icon: './themes/Yaru/apps/metasploit.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMetasploit,
  },
  {
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: './themes/Yaru/apps/project-gallery.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayProjectGallery,
  },
  {
    id: 'wireshark',
    title: 'Wireshark',
    icon: './themes/Yaru/apps/wireshark.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWireshark,
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
    id: 'kismet',
    title: 'Kismet',
    icon: './themes/Yaru/apps/kismet.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayKismet,
  },
  {
    id: 'nikto',
    title: 'Nikto',
    icon: './themes/Yaru/apps/nikto.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNikto,
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
    id: 'autopsy',
    title: 'Autopsy',
    icon: './themes/Yaru/apps/autopsy.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAutopsy,
  },
  {    id: 'reaver',
    title: 'Reaver',
    icon: './themes/Yaru/apps/reaver.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReaver,
  },
  {
    id: 'nessus',
    title: 'Nessus',
    icon: './themes/Yaru/apps/nessus.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNessus,
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
    id: 'figlet',
    title: 'Figlet',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFiglet,
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
    id: 'ghidra',
    title: 'Ghidra',
    icon: './themes/Yaru/apps/ghidra.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGhidra,
  },
  {
    id: 'mimikatz',
    title: 'Mimikatz',
    icon: './themes/Yaru/apps/mimikatz.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMimikatz,
  },
  {
    id: 'hydra',
    title: 'Hydra',
    icon: './themes/Yaru/apps/hydra.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHydra,
  },
  {
    id: 'nmap-nse',
    title: 'Nmap NSE',
    icon: './themes/Yaru/apps/nmap-nse.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNmapNSE,
  },
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
    id: 'radare2',
    title: 'Radare2',
    icon: './themes/Yaru/apps/radare2.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRadare2,
  },
  {
    id: 'volatility',
    title: 'Volatility',
    icon: './themes/Yaru/apps/volatility.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayVolatility,
  },
  {
    id: 'hashcat',
    title: 'Hashcat',
    icon: './themes/Yaru/apps/hashcat.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHashcat,
  },
  {
    id: 'msf-post',
    title: 'Metasploit Post',
    icon: './themes/Yaru/apps/msf-post.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMsfPost,
  },
  {
    id: 'dsniff',
    title: 'dsniff',
    icon: './themes/Yaru/apps/dsniff.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayDsniff,
  },
  {
    id: 'john',
    title: 'John the Ripper',
    icon: './themes/Yaru/apps/john.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayJohn,
  },
  {
    id: 'openvas',
    title: 'OpenVAS',
    icon: './themes/Yaru/apps/openvas.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayOpenVAS,
  },
  {
    id: 'recon-ng',
    title: 'Recon-ng',
    icon: './themes/Yaru/apps/reconng.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReconNG,
  },
  // Games are included so they appear alongside apps
  ...games,
];

export default apps;

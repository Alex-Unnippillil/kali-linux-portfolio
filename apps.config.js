import { createDynamicApp, createDisplay } from './utils/createDynamicApp';

import { displayX } from './components/apps/x';
import { displaySpotify } from './components/apps/spotify';
import { displaySettings } from './components/apps/settings';
import { displayChrome } from './components/apps/chrome';
import { displayGedit } from './components/apps/gedit';
import { displayTodoist } from './components/apps/todoist';
import { displayWeather } from './components/apps/weather';
import { displayClipboardManager } from './components/apps/ClipboardManager';
import { displayFiglet } from './components/apps/figlet';
import { displayResourceMonitor } from './components/apps/resource_monitor';
import { displayScreenRecorder } from './components/apps/screen-recorder';
import { displayNikto } from './components/apps/nikto';

export const chromeDefaultTiles = [
  { title: 'MDN', url: 'https://developer.mozilla.org/' },
  { title: 'Wikipedia', url: 'https://en.wikipedia.org' },
  { title: 'Example', url: 'https://example.com' },
];

// Dynamic applications and games
const TerminalApp = createDynamicApp('terminal', 'Terminal');
// VSCode app uses a Stack iframe, so no editor dependencies are required
const VsCodeApp = createDynamicApp('vscode', 'VsCode');
const YouTubeApp = createDynamicApp('youtube', 'YouTube');
const CalculatorApp = createDynamicApp('calculator', 'Calculator');
const ConverterApp = createDynamicApp('converter', 'Converter');
const TicTacToeApp = createDynamicApp('tictactoe', 'Tic Tac Toe');
const ChessApp = createDynamicApp('chess', 'Chess');
// Classic four-in-a-row game
const ConnectFourApp = createDynamicApp('connect-four', 'Connect Four');
const HangmanApp = createDynamicApp('hangman', 'Hangman');
const FroggerApp = createDynamicApp('frogger', 'Frogger');
const FlappyBirdApp = createDynamicApp('flappy-bird', 'Flappy Bird');
const Game2048App = createDynamicApp('2048', '2048');
const SnakeApp = createDynamicApp('snake', 'Snake');
const MemoryApp = createDynamicApp('memory', 'Memory');
// Classic puzzle where players clear a minefield.
const MinesweeperApp = createDynamicApp('minesweeper', 'Minesweeper');
const PongApp = createDynamicApp('pong', 'Pong');
const PacmanApp = createDynamicApp('pacman', 'Pacman');
const CarRacerApp = createDynamicApp('car-racer', 'Car Racer');
const LaneRunnerApp = createDynamicApp('lane-runner', 'Lane Runner');
const PlatformerApp = createDynamicApp('platformer', 'Platformer');
const BattleshipApp = createDynamicApp('battleship', 'Battleship');
const CheckersApp = createDynamicApp('checkers', 'Checkers');
const ReversiApp = createDynamicApp('reversi', 'Reversi');
const SimonApp = createDynamicApp('simon', 'Simon');
const SokobanApp = createDynamicApp('sokoban', 'Sokoban');
// Use the enhanced TypeScript implementation of Solitaire that supports
// draw-3 mode, hints, animations, and auto-complete.
const SolitaireApp = createDynamicApp('solitaire/index', 'Solitaire');
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
const FileExplorerApp = createDynamicApp('file-explorer', 'Files');
const Radare2App = createDynamicApp('radare2', 'Radare2');
const AboutAlexApp = createDynamicApp('alex', 'About Alex');

const QrApp = createDynamicApp('qr', 'QR Tool');
const AsciiArtApp = createDynamicApp('ascii_art', 'ASCII Art');
const QuoteApp = createDynamicApp('quote', 'Quote');
const ProjectGalleryApp = createDynamicApp('project-gallery', 'Project Gallery');
const WeatherWidgetApp = createDynamicApp('weather_widget', 'Weather Widget');
const InputLabApp = createDynamicApp('input-lab', 'Input Lab');
const GhidraApp = createDynamicApp('ghidra', 'Ghidra');

const StickyNotesApp = createDynamicApp('sticky_notes', 'Sticky Notes');
const TrashApp = createDynamicApp('trash', 'Trash');
const SerialTerminalApp = createDynamicApp('serial-terminal', 'Serial Terminal');


const WiresharkApp = createDynamicApp('wireshark', 'Wireshark');
const BleSensorApp = createDynamicApp('ble-sensor', 'BLE Sensor');
const DsniffApp = createDynamicApp('dsniff', 'dsniff');
const BeefApp = createDynamicApp('beef', 'BeEF');
const MetasploitApp = createDynamicApp('metasploit', 'Metasploit');

const AutopsyApp = createDynamicApp('autopsy', 'Autopsy');
const PluginManagerApp = createDynamicApp('plugin-manager', 'Plugin Manager');

const GomokuApp = createDynamicApp('gomoku', 'Gomoku');
const PinballApp = createDynamicApp('pinball', 'Pinball');
const VolatilityApp = createDynamicApp('volatility', 'Volatility');

const KismetApp = createDynamicApp('kismet.jsx', 'Kismet');

const HashcatApp = createDynamicApp('hashcat', 'Hashcat');
const MsfPostApp = createDynamicApp('msf-post', 'Metasploit Post');
const EvidenceVaultApp = createDynamicApp('evidence-vault', 'Evidence Vault');
const MimikatzApp = createDynamicApp('mimikatz', 'Mimikatz');
const MimikatzOfflineApp = createDynamicApp('mimikatz/offline', 'Mimikatz Offline');
const EttercapApp = createDynamicApp('ettercap', 'Ettercap');
const ReaverApp = createDynamicApp('reaver', 'Reaver');
const HydraApp = createDynamicApp('hydra', 'Hydra');
const JohnApp = createDynamicApp('john', 'John the Ripper');
const NessusApp = createDynamicApp('nessus', 'Nessus');
const NmapNSEApp = createDynamicApp('nmap-nse', 'Nmap NSE');
const OpenVASApp = createDynamicApp('openvas', 'OpenVAS');
const ReconNGApp = createDynamicApp('reconng', 'Recon-ng');
const SecurityToolsApp = createDynamicApp('security-tools', 'Security Tools');
const SSHApp = createDynamicApp('ssh', 'SSH Command Builder');
const HTTPApp = createDynamicApp('http', 'HTTP Request Builder');
const HtmlRewriteApp = createDynamicApp('html-rewriter', 'HTML Rewriter');
const ContactApp = createDynamicApp('contact', 'Contact');



const displayTerminal = createDisplay(TerminalApp);
const displayVsCode = createDisplay(VsCodeApp);
const displayYouTube = createDisplay(YouTubeApp);
const displayCalculator = createDisplay(CalculatorApp);
const displayConverter = createDisplay(ConverterApp);
const displayTicTacToe = createDisplay(TicTacToeApp);
const displayChess = createDisplay(ChessApp);
const displayConnectFour = createDisplay(ConnectFourApp);
const displayHangman = createDisplay(HangmanApp);
const displayFrogger = createDisplay(FroggerApp);
const displayFlappyBird = createDisplay(FlappyBirdApp);
const displayGame2048 = createDisplay(Game2048App);
const displaySnake = createDisplay(SnakeApp);
const displayMemory = createDisplay(MemoryApp);
const displayMinesweeper = createDisplay(MinesweeperApp);
const displayPong = createDisplay(PongApp);
const displayPacman = createDisplay(PacmanApp);
const displayCarRacer = createDisplay(CarRacerApp);
const displayLaneRunner = createDisplay(LaneRunnerApp);
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
const displayFileExplorer = createDisplay(FileExplorerApp);
const displayRadare2 = createDisplay(Radare2App);
const displayAboutAlex = createDisplay(AboutAlexApp);

const displayQr = createDisplay(QrApp);
const displayAsciiArt = createDisplay(AsciiArtApp);
const displayQuote = createDisplay(QuoteApp);
const displayProjectGallery = createDisplay(ProjectGalleryApp);
const displayTrash = createDisplay(TrashApp);
const displayStickyNotes = createDisplay(StickyNotesApp);
const displaySerialTerminal = createDisplay(SerialTerminalApp);
const displayWeatherWidget = createDisplay(WeatherWidgetApp);
const displayInputLab = createDisplay(InputLabApp);

const displayGhidra = createDisplay(GhidraApp);

const displayAutopsy = createDisplay(AutopsyApp);
const displayPluginManager = createDisplay(PluginManagerApp);

const displayWireshark = createDisplay(WiresharkApp);
const displayBleSensor = createDisplay(BleSensorApp);
const displayBeef = createDisplay(BeefApp);
const displayMetasploit = createDisplay(MetasploitApp);
const displayDsniff = createDisplay(DsniffApp);
const displayGomoku = createDisplay(GomokuApp);
const displayPinball = createDisplay(PinballApp);
const displayVolatility = createDisplay(VolatilityApp);

const displayMsfPost = createDisplay(MsfPostApp);
const displayEvidenceVault = createDisplay(EvidenceVaultApp);
const displayMimikatz = createDisplay(MimikatzApp);
const displayMimikatzOffline = createDisplay(MimikatzOfflineApp);
const displayEttercap = createDisplay(EttercapApp);
const displayReaver = createDisplay(ReaverApp);
const displayHydra = createDisplay(HydraApp);
const displayJohn = createDisplay(JohnApp);
const displayNessus = createDisplay(NessusApp);
const displayNmapNSE = createDisplay(NmapNSEApp);
const displayOpenVAS = createDisplay(OpenVASApp);
const displayReconNG = createDisplay(ReconNGApp);
const displaySecurityTools = createDisplay(SecurityToolsApp);
const displaySSH = createDisplay(SSHApp);
const displayHTTP = createDisplay(HTTPApp);
const displayHtmlRewrite = createDisplay(HtmlRewriteApp);
const displayContact = createDisplay(ContactApp);

const displayHashcat = createDisplay(HashcatApp);

const displayKismet = createDisplay(KismetApp);

// Utilities list used for the "Utilities" folder on the desktop
const utilityList = [
  {
    id: 'qr',
    title: 'QR Tool',
    icon: '/themes/Kali/apps/qr.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQr,
  },
  {
    id: 'ascii-art',
    title: 'ASCII Art',
    icon: '/themes/Kali/apps/utility.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsciiArt,
  },
  {
    id: 'clipboard-manager',
    title: 'Clipboard Manager',
    icon: '/themes/Kali/apps/clipboard.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayClipboardManager,
  },
  {
    id: 'figlet',
    title: 'Figlet',
    icon: '/themes/Kali/apps/utility.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFiglet,
  },
  {
    id: 'quote',
    title: 'Quote',
    icon: '/themes/Kali/apps/quote.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQuote,
  },
  {
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: '/themes/Kali/apps/project.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayProjectGallery,
  },
  {
    id: 'input-lab',
    title: 'Input Lab',
    icon: '/themes/Kali/apps/utility.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayInputLab,
  },
];

export const utilities = utilityList;

// Default window sizing for games to prevent oversized frames
export const gameDefaults = {
  defaultWidth: 50,
  defaultHeight: 60,
};

// Games list used for the "Games" folder on the desktop
const gameList = [
  {
    id: '2048',
    title: '2048',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGame2048,
    defaultWidth: 35,
    defaultHeight: 45,
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsteroids,
  },
  {
    id: 'battleship',
    title: 'Battleship',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBattleship,
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBlackjack,
    ...gameDefaults,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBreakout,
  },
  {
    id: 'car-racer',
    title: 'Car Racer',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCarRacer,
  },
  {
    id: 'lane-runner',
    title: 'Lane Runner',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayLaneRunner,
  },
  {
    id: 'checkers',
    title: 'Checkers',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCheckers,
  },
  {
    id: 'chess',
    title: 'Chess',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayChess,
  },
  // Simple placeholder implementation
  {
    id: 'connect-four',
    title: 'Connect Four',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConnectFour,
  },
  {
    id: 'frogger',
    title: 'Frogger',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFrogger,
  },
  {
    id: 'hangman',
    title: 'Hangman',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHangman,
  },
  {
    id: 'memory',
    title: 'Memory',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMemory,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMinesweeper,
  },
  {
    id: 'pacman',
    title: 'Pacman',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPacman,
  },
  {
    id: 'platformer',
    title: 'Platformer',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPlatformer,
  },
  {
    id: 'pong',
    title: 'Pong',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPong,
  },
  {
    id: 'reversi',
    title: 'Reversi',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReversi,
  },
  {
    id: 'simon',
    title: 'Simon',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySimon,
  },
  {
    id: 'snake',
    title: 'Snake',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySnake,
  },
  {
    id: 'sokoban',
    title: 'Sokoban',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySokoban,
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySolitaire,
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTicTacToe,
    ...gameDefaults,
  },
  {
    id: 'tetris',
    title: 'Tetris',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTetris,
  },
  {
    id: 'tower-defense',
    title: 'Tower Defense',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTowerDefense,
  },
  {
    id: 'word-search',
    title: 'Word Search',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordSearch,
  },
  {
    id: 'wordle',
    title: 'Wordle',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordle,
  },
  {
    id: 'nonogram',
    title: 'Nonogram',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNonogram,
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySpaceInvaders,
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySudoku,
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFlappyBird,
  },
  {
    id: 'candy-crush',
    title: 'Candy Crush',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCandyCrush,
  },
  {
    id: 'gomoku',
    title: 'Gomoku',
    icon: '/themes/Kali/apps/games.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGomoku,
  },
  {
    id: 'pinball',
    title: 'Pinball',
    icon: '/themes/Kali/apps/games.svg',
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
    icon: '/themes/Kali/apps/browser.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayChrome,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '/themes/Kali/apps/calculator.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCalculator,
    resizable: false,
    allowMaximize: false,
    defaultWidth: 28,
    defaultHeight: 50,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: '/themes/Kali/apps/terminal.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminal,
  },
  {
    // VSCode app uses a Stack iframe, so no editor dependencies are required
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: '/themes/Kali/apps/code.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayVsCode,
    defaultWidth: 85,
    defaultHeight: 85,
  },
  {
    id: 'x',
    title: 'X',
    icon: '/themes/Kali/apps/browser.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayX,
  },
  {
    id: 'spotify',
    title: 'Spotify',
    icon: '/themes/Kali/apps/music.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySpotify,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: '/themes/Kali/apps/video.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayYouTube,
  },
  {
    id: 'beef',
    title: 'BeEF',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBeef,
  },
  {
    id: 'about',
    title: 'About Alex',
    icon: '/themes/Kali/apps/profile.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayAboutAlex,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '/themes/Kali/system/settings.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySettings,
  },
  {
    id: 'files',
    title: 'Files',
    icon: '/themes/Kali/system/folder.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFileExplorer,
  },
  {
    id: 'resource-monitor',
    title: 'Resource Monitor',
    icon: '/themes/Kali/apps/monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayResourceMonitor,
  },
  {
    id: 'screen-recorder',
    title: 'Screen Recorder',
    icon: '/themes/Kali/apps/record.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayScreenRecorder,
  },
  {
    id: 'ettercap',
    title: 'Ettercap',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayEttercap,
  },
  {
    id: 'ble-sensor',
    title: 'BLE Sensor',
    icon: '/themes/Kali/apps/network.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBleSensor,
  },
  {
    id: 'metasploit',
    title: 'Metasploit',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMetasploit,
  },
  {
    id: 'wireshark',
    title: 'Wireshark',
    icon: '/themes/Kali/apps/network.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWireshark,
  },
  {
    id: 'todoist',
    title: 'Todoist',
    icon: '/themes/Kali/apps/task.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTodoist,
  },
  {
    id: 'sticky_notes',
    title: 'Sticky Notes',
    icon: '/themes/Kali/apps/editor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayStickyNotes,
  },
  {
    id: 'trash',
    title: 'Trash',
    icon: '/themes/Kali/status/trash-empty.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTrash,
  },
  {
    id: 'gedit',
    title: 'Contact Me',
    icon: '/themes/Kali/apps/editor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGedit,
  },
  {
    id: 'converter',
    title: 'Converter',
    icon: '/themes/Kali/apps/calculator.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConverter,
  },
  {
    id: 'kismet',
    title: 'Kismet',
    icon: '/themes/Kali/apps/network.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayKismet,
  },
  {
    id: 'nikto',
    title: 'Nikto',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNikto,
  },
  {
    id: 'autopsy',
    title: 'Autopsy',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAutopsy,
  },
  {
    id: 'plugin-manager',
    title: 'Plugin Manager',
    icon: '/themes/Kali/apps/utility.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPluginManager,
  },
  {    id: 'reaver',
    title: 'Reaver',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReaver,
  },
  {
    id: 'nessus',
    title: 'Nessus',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNessus,
  },
  {
    id: 'ghidra',
    title: 'Ghidra',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGhidra,
  },
  {
    id: 'mimikatz',
    title: 'Mimikatz',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMimikatz,
  },
  {
    id: 'mimikatz/offline',
    title: 'Mimikatz Offline',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMimikatzOffline,
  },
  {
    id: 'ssh',
    title: 'SSH Builder',
    icon: '/themes/Kali/apps/network.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySSH,
  },
  {
    id: 'http',
    title: 'HTTP Builder',
    icon: '/themes/Kali/apps/network.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHTTP,
  },
  {
    id: 'html-rewriter',
    title: 'HTML Rewriter',
    icon: '/themes/Kali/apps/code.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHtmlRewrite,
  },
  {
    id: 'contact',
    title: 'Contact',
    icon: '/themes/Kali/apps/contact.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayContact,
  },
  {
    id: 'hydra',
    title: 'Hydra',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHydra,
  },
  {
    id: 'nmap-nse',
    title: 'Nmap NSE',
    icon: '/themes/Kali/apps/network.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNmapNSE,
  },
  {
    id: 'weather',
    title: 'Weather',
    icon: '/themes/Kali/apps/weather.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWeather,
  },
  {
    id: 'weather-widget',
    title: 'Weather Widget',
    icon: '/themes/Kali/apps/weather.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWeatherWidget,
  },
  {
    id: 'serial-terminal',
    title: 'Serial Terminal',
    icon: '/themes/Kali/apps/terminal.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySerialTerminal,
  },
  {
    id: 'radare2',
    title: 'Radare2',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRadare2,
  },
  {
    id: 'volatility',
    title: 'Volatility',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayVolatility,
  },
  {
    id: 'hashcat',
    title: 'Hashcat',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHashcat,
  },
  {
    id: 'msf-post',
    title: 'Metasploit Post',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMsfPost,
  },
  {
    id: 'evidence-vault',
    title: 'Evidence Vault',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayEvidenceVault,
  },
  {
    id: 'dsniff',
    title: 'dsniff',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayDsniff,
  },
  {
    id: 'john',
    title: 'John the Ripper',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayJohn,
  },
  {
    id: 'openvas',
    title: 'OpenVAS',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayOpenVAS,
  },
  {
    id: 'recon-ng',
    title: 'Recon-ng',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReconNG,
  },
  {
    id: 'security-tools',
    title: 'Security Tools',
    icon: '/themes/Kali/apps/security.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySecurityTools,
  },
  // Utilities are grouped separately
  ...utilities,
  // Games are included so they appear alongside apps
  ...games,
];

export default apps;

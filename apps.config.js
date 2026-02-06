import { createDynamicApp, createDisplay } from './utils/createDynamicApp';

import { DEFAULT_DESKTOP_FOLDERS } from './data/desktopFolders';

export const APP_CATEGORIES = {
  system: {
    id: 'system',
    title: 'System & Workspace',
    description: 'Core desktop controls and preferences.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#38bdf8',
    defaultOpen: true,
  },
  productivity: {
    id: 'productivity',
    title: 'Productivity & Media',
    description: 'Everyday apps, media, and communication.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#f97316',
  },
  development: {
    id: 'development',
    title: 'Development & Builders',
    description: 'Coding, request builders, and terminals.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#a855f7',
  },
  recon: {
    id: 'recon',
    title: 'Recon & Monitoring',
    description: 'Discovery, scanning, and situational awareness.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#22d3ee',
  },
  exploitation: {
    id: 'exploitation',
    title: 'Exploitation & Post-Exploitation',
    description: 'Credential attacks and offensive tooling simulations.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#facc15',
  },
  forensics: {
    id: 'forensics',
    title: 'Forensics & Reverse Engineering',
    description: 'Analysis suites and evidence tooling.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#f472b6',
  },
  utilities: {
    id: 'utilities',
    title: 'Utilities & Widgets',
    description: 'Quick helpers, calculators, and widgets.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#34d399',
  },
  games: {
    id: 'games',
    title: 'Games & Arcade',
    description: 'Retro games and quick challenges.',
    icon: '/themes/Yaru/system/folder.png',
    accent: '#fb7185',
  },
};

const CATEGORY_DEFAULTS = {
  system: {
    tags: ['system', 'desktop', 'workspace'],
    capabilities: ['system'],
  },
  productivity: {
    tags: ['productivity', 'media', 'communication'],
    capabilities: ['productivity'],
  },
  development: {
    tags: ['development', 'builder', 'terminal'],
    capabilities: ['development'],
  },
  recon: {
    tags: ['recon', 'monitoring', 'discovery'],
    capabilities: ['recon'],
  },
  exploitation: {
    tags: ['exploitation', 'offensive', 'credential'],
    capabilities: ['offensive'],
  },
  forensics: {
    tags: ['forensics', 'analysis', 'reverse-engineering'],
    capabilities: ['analysis'],
  },
  utilities: {
    tags: ['utility', 'widget', 'helper'],
    capabilities: ['utility'],
  },
  games: {
    tags: ['game', 'arcade', 'retro'],
    capabilities: ['game'],
  },
};

const withCategoryDefaults = (app) => {
  const defaults = CATEGORY_DEFAULTS[app.category] || {};
  const tags = [...new Set([...(defaults.tags || []), ...(app.tags || [])])];
  const capabilities = [...new Set([...(defaults.capabilities || []), ...(app.capabilities || [])])];
  return {
    ...app,
    tags,
    capabilities,
  };
};

// Dynamic applications and games
const TerminalApp = createDynamicApp(() => import('./components/apps/terminal'), 'Terminal');
// VSCode app uses a Stack iframe, so no editor dependencies are required
const VsCodeApp = createDynamicApp(() => import('./components/apps/vscode'), 'VsCode');
const YouTubeApp = createDynamicApp(() => import('./components/apps/youtube'), 'YouTube');
const CalculatorApp = createDynamicApp(() => import('./components/apps/calculator'), 'Calculator');
const ConverterApp = createDynamicApp(() => import('./components/apps/converter'), 'Converter');
const TicTacToeApp = createDynamicApp(() => import('./components/apps/tictactoe'), 'Tic Tac Toe');
const ChessApp = createDynamicApp(() => import('./components/apps/chess'), 'Chess');
// Classic four-in-a-row game
const ConnectFourApp = createDynamicApp(() => import('./components/apps/connect-four'), 'Connect Four');
const HangmanApp = createDynamicApp(() => import('./components/apps/hangman'), 'Hangman');
const FroggerApp = createDynamicApp(() => import('./components/apps/frogger'), 'Frogger');
const FlappyBirdApp = createDynamicApp(() => import('./components/apps/flappy-bird'), 'Flappy Bird');
const Game2048App = createDynamicApp(() => import('./components/apps/2048'), '2048');
const SnakeApp = createDynamicApp(() => import('./components/apps/snake'), 'Snake');
const MemoryApp = createDynamicApp(() => import('./components/apps/memory'), 'Memory');
// Classic puzzle where players clear a minefield.
const MinesweeperApp = createDynamicApp(() => import('./components/apps/minesweeper'), 'Minesweeper');
const PongApp = createDynamicApp(() => import('./components/apps/pong'), 'Pong');
const PacmanApp = createDynamicApp(() => import('./components/apps/pacman'), 'Pacman');
const CarRacerApp = createDynamicApp(() => import('./components/apps/car-racer'), 'Car Racer');
const LaneRunnerApp = createDynamicApp(() => import('./components/apps/lane-runner'), 'Lane Runner');
const PlatformerApp = createDynamicApp(() => import('./components/apps/platformer'), 'Platformer');
const BattleshipApp = createDynamicApp(() => import('./components/apps/battleship.js'), 'Battleship');
const CheckersApp = createDynamicApp(() => import('./components/apps/checkers'), 'Checkers');
const ReversiApp = createDynamicApp(() => import('./components/apps/reversi'), 'Reversi');
const SimonApp = createDynamicApp(() => import('./components/apps/simon'), 'Simon');
const SokobanApp = createDynamicApp(() => import('./components/apps/sokoban'), 'Sokoban');
// Use the enhanced TypeScript implementation of Solitaire that supports
// draw-3 mode, hints, animations, and auto-complete.
const SolitaireApp = createDynamicApp(() => import('./components/apps/solitaire/index'), 'Solitaire');
const TowerDefenseApp = createDynamicApp(() => import('./components/apps/tower-defense'), 'Tower Defense');
const WordSearchApp = createDynamicApp(() => import('./components/apps/word-search'), 'Word Search');
const WordleApp = createDynamicApp(() => import('./components/apps/wordle'), 'Wordle');
const BlackjackApp = createDynamicApp(() => import('./components/apps/blackjack'), 'Blackjack');
const BreakoutApp = createDynamicApp(() => import('./components/apps/breakout'), 'Breakout');
const AsteroidsApp = createDynamicApp(() => import('./components/apps/asteroids'), 'Asteroids');
const SudokuApp = createDynamicApp(() => import('./components/apps/sudoku'), 'Sudoku');
const SpaceInvadersApp = createDynamicApp(() => import('./components/apps/space-invaders'), 'Space Invaders');
const NonogramApp = createDynamicApp(() => import('./components/apps/nonogram'), 'Nonogram');
const TetrisApp = createDynamicApp(() => import('./components/apps/tetris'), 'Tetris');
const CandyCrushApp = createDynamicApp(() => import('./components/apps/candy-crush'), 'Candy Crush');
const FileExplorerApp = createDynamicApp(() => import('./components/apps/file-explorer'), 'Files');
const Radare2App = createDynamicApp(() => import('./components/apps/radare2'), 'Radare2');
const AboutAlexApp = createDynamicApp(() => import('./components/apps/alex'), 'About Alex');

const QrApp = createDynamicApp(() => import('./components/apps/qr'), 'QR Tool');
const AsciiArtApp = createDynamicApp(() => import('./components/apps/ascii_art'), 'ASCII Art');
const QuoteApp = createDynamicApp(() => import('./components/apps/quote'), 'Quote');
const ProjectGalleryApp = createDynamicApp(() => import('./components/apps/project-gallery'), 'Project Gallery');
const WeatherWidgetApp = createDynamicApp(() => import('./components/apps/weather_widget'), 'Weather Widget');
const InputLabApp = createDynamicApp(() => import('./components/apps/input-lab'), 'Input Lab');
const SubnetCalculatorApp = createDynamicApp(() => import('./components/apps/subnet-calculator'), 'Subnet Calculator');
const GhidraApp = createDynamicApp(() => import('./components/apps/ghidra'), 'Ghidra');

const StickyNotesApp = createDynamicApp(() => import('./components/apps/sticky_notes'), 'Sticky Notes');
const NotepadApp = createDynamicApp(() => import('./components/apps/notepad'), 'Notepad');
const TrashApp = createDynamicApp(() => import('./components/apps/trash'), 'Trash');
const SerialTerminalApp = createDynamicApp(() => import('./components/apps/serial-terminal'), 'Serial Terminal');

const LogConsoleApp = createDynamicApp('log-console', 'Log Console');


const WiresharkApp = createDynamicApp(() => import('./components/apps/wireshark'), 'Wireshark');
const BleSensorApp = createDynamicApp(() => import('./components/apps/ble-sensor'), 'BLE Sensor');
const DsniffApp = createDynamicApp(() => import('./components/apps/dsniff'), 'dsniff');
const BeefApp = createDynamicApp(() => import('./components/apps/beef'), 'BeEF');
const MetasploitApp = createDynamicApp(() => import('./components/apps/metasploit'), 'Metasploit');

const AutopsyApp = createDynamicApp(() => import('./components/apps/autopsy'), 'Autopsy');
const PluginManagerApp = createDynamicApp(() => import('./components/apps/plugin-manager'), 'Plugin Manager');

const GomokuApp = createDynamicApp(() => import('./components/apps/gomoku'), 'Gomoku');
const PinballApp = createDynamicApp(() => import('./components/apps/pinball'), 'Pinball');
const VolatilityApp = createDynamicApp(() => import('./components/apps/volatility'), 'Volatility');

const KismetApp = createDynamicApp(() => import('./components/apps/kismet.jsx'), 'Kismet');

const HashcatApp = createDynamicApp(() => import('./components/apps/hashcat'), 'Hashcat');
const MsfPostApp = createDynamicApp(() => import('./components/apps/msf-post'), 'Metasploit Post');
const EvidenceVaultApp = createDynamicApp(() => import('./components/apps/evidence-vault'), 'Evidence Vault');
const MimikatzApp = createDynamicApp(() => import('./components/apps/mimikatz'), 'Mimikatz');
const MimikatzOfflineApp = createDynamicApp(() => import('./components/apps/mimikatz/offline'), 'Mimikatz Offline');
const EttercapApp = createDynamicApp(() => import('./components/apps/ettercap'), 'Ettercap');
const ReaverApp = createDynamicApp(() => import('./components/apps/reaver'), 'Reaver');
const HydraApp = createDynamicApp(() => import('./components/apps/hydra'), 'Hydra');
const JohnApp = createDynamicApp(() => import('./components/apps/john'), 'John the Ripper');
const NessusApp = createDynamicApp(() => import('./components/apps/nessus'), 'Nessus');
const NmapNSEApp = createDynamicApp(() => import('./components/apps/nmap-nse'), 'Nmap NSE');
const OpenVASApp = createDynamicApp(() => import('./components/apps/openvas'), 'OpenVAS');
const ReconNGApp = createDynamicApp(() => import('./components/apps/reconng'), 'Recon-ng');
const SecurityToolsApp = createDynamicApp(() => import('./components/apps/security-tools'), 'Security Tools');
const SSHApp = createDynamicApp(() => import('./apps/ssh'), 'SSH Command Builder');
const HTTPApp = createDynamicApp(() => import('./apps/http'), 'HTTP Request Builder');
const HtmlRewriteApp = createDynamicApp(() => import('./apps/html-rewriter'), 'HTML Rewriter');
const ContactApp = createDynamicApp(() => import('./components/apps/contact'), 'Contact');

// Previously-static displays are now dynamic to keep initial compilation fast.
const DesktopFolderApp = createDynamicApp(() => import('./components/apps/desktop-folder'), 'Folder');
const XApp = createDynamicApp(() => import('./components/apps/x'), 'X');
const SpotifyApp = createDynamicApp(() => import('./components/apps/spotify'), 'Spotify');
const SettingsApp = createDynamicApp(() => import('./components/apps/settings'), 'Settings');
const FirefoxApp = createDynamicApp(() => import('./components/apps/firefox'), 'Firefox');
const TodoistApp = createDynamicApp(() => import('./components/apps/todoist'), 'Todoist');
const WeatherApp = createDynamicApp(() => import('./components/apps/weather'), 'Weather');

const FigletApp = createDynamicApp(() => import('./components/apps/figlet'), 'Figlet');
const ResourceMonitorApp = createDynamicApp(() => import('./components/apps/resource_monitor'), 'Resource Monitor');
const ScreenRecorderApp = createDynamicApp(() => import('./components/apps/screen-recorder'), 'Screen Recorder');
const NiktoApp = createDynamicApp(() => import('./components/apps/nikto'), 'Nikto');
const CameraApp = createDynamicApp(() => import('./components/apps/camera'), 'Camera');



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
const displayNotepad = createDisplay(NotepadApp);
const displaySerialTerminal = createDisplay(SerialTerminalApp);
const displayLogConsole = createDisplay(LogConsoleApp);
const displayWeatherWidget = createDisplay(WeatherWidgetApp);
const displayInputLab = createDisplay(InputLabApp);
const displaySubnetCalculator = createDisplay(SubnetCalculatorApp);

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

export const displayDesktopFolder = createDisplay(DesktopFolderApp);
const displayX = createDisplay(XApp);
const displaySpotify = createDisplay(SpotifyApp);
const displaySettings = createDisplay(SettingsApp);
const displayFirefox = createDisplay(FirefoxApp);
const displayTodoist = createDisplay(TodoistApp);
const displayWeather = createDisplay(WeatherApp);

const displayFiglet = createDisplay(FigletApp);
const displayResourceMonitor = createDisplay(ResourceMonitorApp);
const displayScreenRecorder = createDisplay(ScreenRecorderApp);
const displayNikto = createDisplay(NiktoApp);
const displayCamera = createDisplay(CameraApp);

// Utilities list used for the "Utilities" folder on the desktop
const utilityList = [
  {
    id: 'qr',
    title: 'QR Tool',
    icon: '/themes/Yaru/apps/qr.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayQr,
    category: 'utilities',
  },
  {
    id: 'ascii-art',
    title: 'ASCII Art',
    icon: '/themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayAsciiArt,
    category: 'utilities',
  },
  {
    id: 'figlet',
    title: 'Figlet',
    icon: '/themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayFiglet,
    category: 'utilities',
  },
  {
    id: 'quote',
    title: 'Quote',
    icon: '/themes/Yaru/apps/quote.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayQuote,
    category: 'utilities',
  },
  {
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: '/themes/Yaru/apps/project-gallery.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayProjectGallery,
    category: 'utilities',
  },
  {
    id: 'input-lab',
    title: 'Input Lab',
    icon: '/themes/Yaru/apps/input-lab.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayInputLab,
    category: 'utilities',
  },
  {
    id: 'subnet-calculator',
    title: 'Subnet Calculator',
    icon: '/themes/Yaru/apps/subnet-calculator.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySubnetCalculator,
    category: 'utilities',
  },
  {
    id: 'camera',
    title: 'Camera',
    icon: '/themes/Yaru/apps/camera.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayCamera,
    category: 'utilities',
  },
];

export const utilities = utilityList.map((app) => withCategoryDefaults(app));

// Default window sizing for games to prevent oversized frames
export const gameDefaults = {
  defaultWidth: 50,
  defaultHeight: 60,
  responsiveWidth: { mobile: 90, desktop: 50 },
  responsiveHeight: { mobile: 80, desktop: 60 },
};

// Games list used for the "Games" folder on the desktop
const gameList = [
  {
    id: '2048',
    title: '2048',
    icon: '/themes/Yaru/apps/2048.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGame2048,
    defaultWidth: 35,
    defaultHeight: 45,
    prefetchOnHover: false,
  },
  {
    id: 'asteroids',
    title: 'Asteroids',
    icon: '/themes/Yaru/apps/asteroids.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayAsteroids,
  },
  {
    id: 'battleship',
    title: 'Battleship',
    icon: '/themes/Yaru/apps/battleship.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayBattleship,
  },
  {
    id: 'blackjack',
    title: 'Blackjack',
    icon: '/themes/Yaru/apps/blackjack.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayBlackjack,
    ...gameDefaults,
  },
  {
    id: 'breakout',
    title: 'Breakout',
    icon: '/themes/Yaru/apps/breakout.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayBreakout,
  },
  {
    id: 'car-racer',
    title: 'Car Racer',
    icon: '/themes/Yaru/apps/car-racer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayCarRacer,
  },
  {
    id: 'lane-runner',
    title: 'Lane Runner',
    icon: '/themes/Yaru/apps/car-racer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayLaneRunner,
  },
  {
    id: 'checkers',
    title: 'Checkers',
    icon: '/themes/Yaru/apps/checkers.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayCheckers,
  },
  {
    id: 'chess',
    title: 'Chess',
    icon: '/themes/Yaru/apps/chess.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayChess,
    prefetchOnHover: false,
  },
  // Simple placeholder implementation
  {
    id: 'connect-four',
    title: 'Connect Four',
    icon: '/themes/Yaru/apps/connect-four.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayConnectFour,
  },
  {
    id: 'frogger',
    title: 'Frogger',
    icon: '/themes/Yaru/apps/frogger.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayFrogger,
  },
  {
    id: 'hangman',
    title: 'Hangman',
    icon: '/themes/Yaru/apps/hangman.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayHangman,
  },
  {
    id: 'memory',
    title: 'Memory',
    icon: '/themes/Yaru/apps/memory.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayMemory,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    icon: '/themes/Yaru/apps/minesweeper.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayMinesweeper,
  },
  {
    id: 'pacman',
    title: 'Pacman',
    icon: '/themes/Yaru/apps/pacman.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayPacman,
  },
  {
    id: 'platformer',
    title: 'Platformer',
    icon: '/themes/Yaru/apps/platformer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayPlatformer,
  },
  {
    id: 'pong',
    title: 'Pong',
    icon: '/themes/Yaru/apps/pong.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayPong,
  },
  {
    id: 'reversi',
    title: 'Reversi',
    icon: '/themes/Yaru/apps/reversi.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayReversi,
  },
  {
    id: 'simon',
    title: 'Simon',
    icon: '/themes/Yaru/apps/simon.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySimon,
  },
  {
    id: 'snake',
    title: 'Snake',
    icon: '/themes/Yaru/apps/snake.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySnake,
  },
  {
    id: 'sokoban',
    title: 'Sokoban',
    icon: '/themes/Yaru/apps/sokoban.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySokoban,
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    icon: '/themes/Yaru/apps/solitaire.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySolitaire,
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: '/themes/Yaru/apps/tictactoe.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTicTacToe,
    ...gameDefaults,
  },
  {
    id: 'tetris',
    title: 'Tetris',
    icon: '/themes/Yaru/apps/tetris.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTetris,
  },
  {
    id: 'tower-defense',
    title: 'Tower Defense',
    icon: '/themes/Yaru/apps/tower-defense.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTowerDefense,
    ...gameDefaults,
    defaultWidth: 70,
    defaultHeight: 72,
  },
  {
    id: 'word-search',
    title: 'Word Search',
    icon: '/themes/Yaru/apps/word-search.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayWordSearch,
  },
  {
    id: 'wordle',
    title: 'Wordle',
    icon: '/themes/Yaru/apps/wordle.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayWordle,
  },
  {
    id: 'nonogram',
    title: 'Nonogram',
    icon: '/themes/Yaru/apps/nonogram.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayNonogram,
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    icon: '/themes/Yaru/apps/space-invaders.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySpaceInvaders,
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    icon: '/themes/Yaru/apps/sudoku.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySudoku,
  },
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    icon: '/themes/Yaru/apps/flappy-bird.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayFlappyBird,
  },
  {
    id: 'candy-crush',
    title: 'Candy Crush',
    icon: '/themes/Yaru/apps/candy-crush.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayCandyCrush,
  },
  {
    id: 'gomoku',
    title: 'Gomoku',
    icon: '/themes/Yaru/apps/gomoku.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGomoku,
  },
  {
    id: 'pinball',
    title: 'Pinball',
    icon: '/themes/Yaru/apps/pinball.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayPinball,
  },
];

export const games = gameList.map((game) =>
  withCategoryDefaults({ ...gameDefaults, ...game, category: 'games' })
);

const folderApps = DEFAULT_DESKTOP_FOLDERS.map((folder) => ({
  id: folder.id,
  title: folder.title,
  icon: folder.icon || '/themes/Yaru/system/folder.png',
  disabled: false,
  favourite: false,
  desktop_shortcut: true,
  isFolder: true,
  screen: displayDesktopFolder,
  category: 'system',
  defaultWidth: 64,
  defaultHeight: 70,
  responsiveWidth: { mobile: 95, desktop: 55 },
  responsiveHeight: { mobile: 85, desktop: 60 },
}));

const apps = [
  ...folderApps,
  {
    id: 'firefox',
    title: 'Firefox',
    icon: '/themes/Yaru/apps/firefox.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayFirefox,
    category: 'productivity',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '/themes/Yaru/apps/calc.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayCalculator,
    category: 'productivity',
    resizable: false,
    allowMaximize: false,
    responsiveWidth: { mobile: 85, desktop: 28 },
    responsiveHeight: { mobile: 65, desktop: 50 },
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: '/themes/Yaru/apps/bash.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayTerminal,
    category: 'system',
    resizable: true,
    responsiveWidth: { mobile: 95, desktop: 68 },
    responsiveHeight: { mobile: 85, desktop: 72 },
  },
  {
    // VSCode app uses a Stack iframe, so no editor dependencies are required
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: '/themes/Yaru/apps/vscode.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    taskbarMobilePinned: true,
    screen: displayVsCode,
    category: 'development',
    responsiveWidth: { mobile: 95, desktop: 85 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'x',
    title: 'X',
    icon: '/themes/Yaru/apps/x.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayX,
    category: 'productivity',
    responsiveWidth: { mobile: 95, desktop: 60 },
    responsiveHeight: { mobile: 85, desktop: 80 },
  },
  {
    id: 'spotify',
    title: 'Spotify',
    icon: '/themes/Yaru/apps/spotify.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displaySpotify,
    category: 'productivity',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: '/themes/Yaru/apps/youtube.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    taskbarMobilePinned: true,
    screen: displayYouTube,
    category: 'productivity',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 85, desktop: 80 },
  },
  {
    id: 'beef',
    title: 'BeEF',
    icon: '/themes/Yaru/apps/beef.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayBeef,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'about',
    title: 'About Alex',
    icon: '/themes/Yaru/system/user-home.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    taskbarMobilePinned: true,
    screen: displayAboutAlex,
    category: 'system',
    responsiveWidth: { mobile: 95, desktop: 55 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '/themes/Yaru/apps/gnome-control-center.svg',
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    taskbarMobilePinned: true,
    screen: displaySettings,
    category: 'system',
    responsiveWidth: { mobile: 95, desktop: 60 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'files',
    title: 'Files',
    icon: '/themes/Yaru/system/folder.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayFileExplorer,
    category: 'system',
    responsiveWidth: { mobile: 95, desktop: 65 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'resource-monitor',
    title: 'Resource Monitor',
    icon: '/themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayResourceMonitor,
    category: 'system',
    responsiveWidth: { mobile: 95, desktop: 60 },
    responsiveHeight: { mobile: 85, desktop: 75 },
  },
  {
    id: 'log-console',
    title: 'Log Console',
    icon: '/themes/Yaru/apps/radar-symbolic.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayLogConsole,
  },
  {
    id: 'screen-recorder',
    title: 'Screen Recorder',
    icon: '/themes/Yaru/apps/screen-recorder.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayScreenRecorder,
    category: 'system',
    responsiveWidth: { mobile: 90, desktop: 50 },
    responsiveHeight: { mobile: 75, desktop: 55 },
  },
  {
    id: 'ettercap',
    title: 'Ettercap',
    icon: '/themes/Yaru/apps/ettercap.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayEttercap,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'ble-sensor',
    title: 'BLE Sensor',
    icon: '/themes/Yaru/apps/bluetooth.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayBleSensor,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 55 },
    responsiveHeight: { mobile: 85, desktop: 70 },
  },
  {
    id: 'metasploit',
    title: 'Metasploit',
    icon: '/themes/Yaru/apps/metasploit.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayMetasploit,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'wireshark',
    title: 'Wireshark',
    icon: '/themes/Yaru/apps/wireshark.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayWireshark,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 80 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'todoist',
    title: 'Todoist',
    icon: '/themes/Yaru/apps/todoist.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTodoist,
    category: 'productivity',
    responsiveWidth: { mobile: 95, desktop: 50 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'sticky_notes',
    title: 'Sticky Notes',
    icon: '/themes/Yaru/apps/sticky-notes.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayStickyNotes,
    category: 'productivity',
    responsiveWidth: { mobile: 85, desktop: 40 },
    responsiveHeight: { mobile: 70, desktop: 60 },
  },
  {
    id: 'trash',
    title: 'Trash',
    icon: '/themes/Yaru/status/user-trash-symbolic.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTrash,
    category: 'system',
    responsiveWidth: { mobile: 90, desktop: 50 },
    responsiveHeight: { mobile: 85, desktop: 70 },
  },
  {
    id: 'converter',
    title: 'Converter',
    icon: '/themes/Yaru/apps/calc.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayConverter,
    category: 'productivity',
    responsiveWidth: { mobile: 85, desktop: 35 },
    responsiveHeight: { mobile: 70, desktop: 55 },
  },
  {
    id: 'kismet',
    title: 'Kismet',
    icon: '/themes/Yaru/apps/kismet.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayKismet,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'nikto',
    title: 'Nikto',
    icon: '/themes/Yaru/apps/nikto.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNikto,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'autopsy',
    title: 'Autopsy',
    icon: '/themes/Yaru/apps/autopsy.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayAutopsy,
    category: 'forensics',
    responsiveWidth: { mobile: 95, desktop: 80 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'plugin-manager',
    title: 'Plugin Manager',
    icon: '/themes/Yaru/apps/plugin-manager.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayPluginManager,
    category: 'system',
    responsiveWidth: { mobile: 95, desktop: 55 },
    responsiveHeight: { mobile: 85, desktop: 75 },
  },
  {
    id: 'reaver',
    title: 'Reaver',
    icon: '/themes/Yaru/apps/reaver.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayReaver,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 65 },
    responsiveHeight: { mobile: 85, desktop: 75 },
  },
  {
    id: 'nessus',
    title: 'Nessus',
    icon: '/themes/Yaru/apps/nessus.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayNessus,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'ghidra',
    title: 'Ghidra',
    icon: '/themes/Yaru/apps/ghidra.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGhidra,
    category: 'forensics',
    responsiveWidth: { mobile: 95, desktop: 85 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'mimikatz',
    title: 'Mimikatz',
    icon: '/themes/Yaru/apps/mimikatz.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayMimikatz,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'mimikatz/offline',
    title: 'Mimikatz Offline',
    icon: '/themes/Yaru/apps/mimikatz.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayMimikatzOffline,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'ssh',
    title: 'SSH Builder',
    icon: '/themes/Yaru/apps/ssh.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySSH,
    category: 'development',
    responsiveWidth: { mobile: 95, desktop: 55 },
    responsiveHeight: { mobile: 85, desktop: 70 },
  },
  {
    id: 'http',
    title: 'HTTP Builder',
    icon: '/themes/Yaru/apps/http.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayHTTP,
    category: 'development',
    responsiveWidth: { mobile: 95, desktop: 60 },
    responsiveHeight: { mobile: 85, desktop: 75 },
  },
  {
    id: 'html-rewriter',
    title: 'HTML Rewriter',
    icon: '/themes/Yaru/apps/html-rewriter.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayHtmlRewrite,
    category: 'development',
    responsiveWidth: { mobile: 95, desktop: 65 },
    responsiveHeight: { mobile: 85, desktop: 75 },
  },
  {
    id: 'contact',
    title: 'Contact',
    icon: '/themes/Yaru/apps/contact.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayContact,
    category: 'productivity',
    responsiveWidth: { mobile: 95, desktop: 50 },
    responsiveHeight: { mobile: 85, desktop: 70 },
  },
  {
    id: 'hydra',
    title: 'Hydra',
    icon: '/themes/Yaru/apps/hydra.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayHydra,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'nmap-nse',
    title: 'Nmap NSE',
    icon: '/themes/Yaru/apps/nmap-nse.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayNmapNSE,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'weather',
    title: 'Weather Dashboard',
    icon: '/themes/Yaru/apps/weather.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayWeather,
    category: 'utilities',
    responsiveWidth: { mobile: 90, desktop: 45 },
    responsiveHeight: { mobile: 80, desktop: 65 },
  },
  {
    id: 'weather-widget',
    title: 'Weather Widget',
    icon: '/themes/Yaru/apps/weather.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayWeatherWidget,
    category: 'utilities',
    responsiveWidth: { mobile: 85, desktop: 35 },
    responsiveHeight: { mobile: 70, desktop: 50 },
  },
  {
    id: 'serial-terminal',
    title: 'Serial Terminal',
    icon: '/themes/Yaru/apps/bash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySerialTerminal,
    category: 'development',
    responsiveWidth: { mobile: 95, desktop: 65 },
    responsiveHeight: { mobile: 85, desktop: 70 },
  },
  {
    id: 'radare2',
    title: 'Radare2',
    icon: '/themes/Yaru/apps/radare2.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayRadare2,
    category: 'forensics',
    responsiveWidth: { mobile: 95, desktop: 80 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'volatility',
    title: 'Volatility',
    icon: '/themes/Yaru/apps/volatility.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayVolatility,
    category: 'forensics',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'hashcat',
    title: 'Hashcat',
    icon: '/themes/Yaru/apps/hashcat.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayHashcat,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'msf-post',
    title: 'Metasploit Post',
    icon: '/themes/Yaru/apps/msf-post.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayMsfPost,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'evidence-vault',
    title: 'Evidence Vault',
    icon: '/themes/Yaru/apps/project-gallery.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayEvidenceVault,
    category: 'forensics',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'dsniff',
    title: 'dsniff',
    icon: '/themes/Yaru/apps/dsniff.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayDsniff,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'john',
    title: 'John the Ripper',
    icon: '/themes/Yaru/apps/john.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayJohn,
    category: 'exploitation',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'openvas',
    title: 'OpenVAS',
    icon: '/themes/Yaru/apps/openvas.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayOpenVAS,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 75 },
    responsiveHeight: { mobile: 90, desktop: 85 },
  },
  {
    id: 'recon-ng',
    title: 'Recon-ng',
    icon: '/themes/Yaru/apps/reconng.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayReconNG,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  {
    id: 'security-tools',
    title: 'Security Tools',
    icon: '/themes/Yaru/apps/project-gallery.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displaySecurityTools,
    category: 'recon',
    responsiveWidth: { mobile: 95, desktop: 70 },
    responsiveHeight: { mobile: 90, desktop: 80 },
  },
  // Utilities are grouped separately
  ...utilities,
  // Games are included so they appear alongside apps
  ...games,
].map((app) => withCategoryDefaults(app));

export default apps;

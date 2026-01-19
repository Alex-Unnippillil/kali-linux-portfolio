import { createDynamicApp, createDisplay } from '../utils/createDynamicApp';
import { coreApps, coreGames, coreUtilities, gameDefaults } from './registry-core';

// Dynamic applications and games
const TerminalApp = createDynamicApp(() => import('../components/apps/terminal'), 'Terminal');
// VSCode app uses a Stack iframe, so no editor dependencies are required
const VsCodeApp = createDynamicApp(() => import('../components/apps/vscode'), 'VsCode');
const YouTubeApp = createDynamicApp(() => import('../components/apps/youtube'), 'YouTube');
const CalculatorApp = createDynamicApp(() => import('../components/apps/calculator'), 'Calculator');
const ConverterApp = createDynamicApp(() => import('../components/apps/converter'), 'Converter');
const TicTacToeApp = createDynamicApp(() => import('../components/apps/tictactoe'), 'Tic Tac Toe');
const ChessApp = createDynamicApp(() => import('../components/apps/chess'), 'Chess');
// Classic four-in-a-row game
const ConnectFourApp = createDynamicApp(() => import('../components/apps/connect-four'), 'Connect Four');
const HangmanApp = createDynamicApp(() => import('../components/apps/hangman'), 'Hangman');
const FroggerApp = createDynamicApp(() => import('../components/apps/frogger'), 'Frogger');
const FlappyBirdApp = createDynamicApp(() => import('../components/apps/flappy-bird'), 'Flappy Bird');
const Game2048App = createDynamicApp(() => import('../components/apps/2048'), '2048');
const SnakeApp = createDynamicApp(() => import('../components/apps/snake'), 'Snake');
const MemoryApp = createDynamicApp(() => import('../components/apps/memory'), 'Memory');
// Classic puzzle where players clear a minefield.
const MinesweeperApp = createDynamicApp(() => import('../components/apps/minesweeper'), 'Minesweeper');
const PongApp = createDynamicApp(() => import('../components/apps/pong'), 'Pong');
const PacmanApp = createDynamicApp(() => import('../components/apps/pacman'), 'Pacman');
const CarRacerApp = createDynamicApp(() => import('../components/apps/car-racer'), 'Car Racer');
const LaneRunnerApp = createDynamicApp(() => import('../components/apps/lane-runner'), 'Lane Runner');
const PlatformerApp = createDynamicApp(() => import('../components/apps/platformer'), 'Platformer');
const BattleshipApp = createDynamicApp(() => import('../components/apps/battleship'), 'Battleship');
const CheckersApp = createDynamicApp(() => import('../components/apps/checkers'), 'Checkers');
const ReversiApp = createDynamicApp(() => import('../components/apps/reversi'), 'Reversi');
const SimonApp = createDynamicApp(() => import('../components/apps/simon'), 'Simon');
const SokobanApp = createDynamicApp(() => import('../components/apps/sokoban'), 'Sokoban');
// Use the enhanced TypeScript implementation of Solitaire that supports
// draw-3 mode, hints, animations, and auto-complete.
const SolitaireApp = createDynamicApp(() => import('../components/apps/solitaire/index'), 'Solitaire');
const TowerDefenseApp = createDynamicApp(() => import('../components/apps/tower-defense'), 'Tower Defense');
const WordSearchApp = createDynamicApp(() => import('../components/apps/word-search'), 'Word Search');
const WordleApp = createDynamicApp(() => import('../components/apps/wordle'), 'Wordle');
const BlackjackApp = createDynamicApp(() => import('../components/apps/blackjack'), 'Blackjack');
const BreakoutApp = createDynamicApp(() => import('../components/apps/breakout'), 'Breakout');
const AsteroidsApp = createDynamicApp(() => import('../components/apps/asteroids'), 'Asteroids');
const SudokuApp = createDynamicApp(() => import('../components/apps/sudoku'), 'Sudoku');
const SpaceInvadersApp = createDynamicApp(() => import('../components/apps/space-invaders'), 'Space Invaders');
const NonogramApp = createDynamicApp(() => import('../components/apps/nonogram'), 'Nonogram');
const TetrisApp = createDynamicApp(() => import('../components/apps/tetris'), 'Tetris');
const CandyCrushApp = createDynamicApp(() => import('../components/apps/candy-crush'), 'Candy Crush');
const FileExplorerApp = createDynamicApp(() => import('../components/apps/file-explorer'), 'Files');
const Radare2App = createDynamicApp(() => import('../components/apps/radare2'), 'Radare2');
const AboutAlexApp = createDynamicApp(() => import('../components/apps/alex'), 'About Alex');

const QrApp = createDynamicApp(() => import('../components/apps/qr'), 'QR Tool');
const AsciiArtApp = createDynamicApp(() => import('../components/apps/ascii_art'), 'ASCII Art');
const QuoteApp = createDynamicApp(() => import('../components/apps/quote'), 'Quote');
const ProjectGalleryApp = createDynamicApp(() => import('../components/apps/project-gallery'), 'Project Gallery');
const WeatherWidgetApp = createDynamicApp(() => import('../components/apps/weather_widget'), 'Weather Widget');
const InputLabApp = createDynamicApp(() => import('../components/apps/input-lab'), 'Input Lab');
const SubnetCalculatorApp = createDynamicApp(() => import('../components/apps/subnet-calculator'), 'Subnet Calculator');
const GhidraApp = createDynamicApp(() => import('../components/apps/ghidra'), 'Ghidra');

const StickyNotesApp = createDynamicApp(() => import('../components/apps/sticky_notes'), 'Sticky Notes');
const TrashApp = createDynamicApp(() => import('../components/apps/trash'), 'Trash');
const SerialTerminalApp = createDynamicApp(() => import('../components/apps/serial-terminal'), 'Serial Terminal');


const WiresharkApp = createDynamicApp(() => import('../components/apps/wireshark'), 'Wireshark');
const BleSensorApp = createDynamicApp(() => import('../components/apps/ble-sensor'), 'BLE Sensor');
const DsniffApp = createDynamicApp(() => import('../components/apps/dsniff'), 'dsniff');
const BeefApp = createDynamicApp(() => import('../components/apps/beef'), 'BeEF');
const MetasploitApp = createDynamicApp(() => import('../components/apps/metasploit'), 'Metasploit');

const AutopsyApp = createDynamicApp(() => import('../components/apps/autopsy'), 'Autopsy');
const PluginManagerApp = createDynamicApp(() => import('../components/apps/plugin-manager'), 'Plugin Manager');

const GomokuApp = createDynamicApp(() => import('../components/apps/gomoku'), 'Gomoku');
const PinballApp = createDynamicApp(() => import('../components/apps/pinball'), 'Pinball');
const VolatilityApp = createDynamicApp(() => import('../components/apps/volatility'), 'Volatility');

const KismetApp = createDynamicApp(() => import('../components/apps/kismet.jsx'), 'Kismet');

const HashcatApp = createDynamicApp(() => import('../components/apps/hashcat'), 'Hashcat');
const MsfPostApp = createDynamicApp(() => import('../components/apps/msf-post'), 'Metasploit Post');
const EvidenceVaultApp = createDynamicApp(() => import('../components/apps/evidence-vault'), 'Evidence Vault');
const MimikatzApp = createDynamicApp(() => import('../components/apps/mimikatz'), 'Mimikatz');
const MimikatzOfflineApp = createDynamicApp(() => import('../components/apps/mimikatz/offline'), 'Mimikatz Offline');
const EttercapApp = createDynamicApp(() => import('../components/apps/ettercap'), 'Ettercap');
const ReaverApp = createDynamicApp(() => import('../components/apps/reaver'), 'Reaver');
const HydraApp = createDynamicApp(() => import('../components/apps/hydra'), 'Hydra');
const JohnApp = createDynamicApp(() => import('../components/apps/john'), 'John the Ripper');
const NessusApp = createDynamicApp(() => import('../components/apps/nessus'), 'Nessus');
const NmapNSEApp = createDynamicApp(() => import('../components/apps/nmap-nse'), 'Nmap NSE');
const OpenVASApp = createDynamicApp(() => import('../components/apps/openvas'), 'OpenVAS');
const ReconNGApp = createDynamicApp(() => import('../components/apps/reconng'), 'Recon-ng');
const SecurityToolsApp = createDynamicApp(() => import('../components/apps/security-tools'), 'Security Tools');
const SSHApp = createDynamicApp(() => import('./ssh'), 'SSH Command Builder');
const HTTPApp = createDynamicApp(() => import('./http'), 'HTTP Request Builder');
const HtmlRewriteApp = createDynamicApp(() => import('./html-rewriter'), 'HTML Rewriter');
const ContactApp = createDynamicApp(() => import('../components/apps/contact'), 'Contact');

// Previously-static displays are now dynamic to keep initial compilation fast.
const DesktopFolderApp = createDynamicApp(() => import('../components/apps/desktop-folder'), 'Folder');
const XApp = createDynamicApp(() => import('../components/apps/x'), 'X');
const SpotifyApp = createDynamicApp(() => import('../components/apps/spotify'), 'Spotify');
const SettingsApp = createDynamicApp(() => import('../components/apps/settings'), 'Settings');
const FirefoxApp = createDynamicApp(() => import('../components/apps/firefox'), 'Firefox');
const GeditApp = createDynamicApp(() => import('../components/apps/gedit'), 'Gedit');
const TodoistApp = createDynamicApp(() => import('../components/apps/todoist'), 'Todoist');
const WeatherApp = createDynamicApp(() => import('../components/apps/weather'), 'Weather');
const ClipboardManagerApp = createDynamicApp(() => import('../components/apps/ClipboardManager'), 'Clipboard Manager');
const FigletApp = createDynamicApp(() => import('../components/apps/figlet'), 'Figlet');
const ResourceMonitorApp = createDynamicApp(() => import('../components/apps/resource_monitor'), 'Resource Monitor');
const ScreenRecorderApp = createDynamicApp(() => import('../components/apps/screen-recorder'), 'Screen Recorder');
const NiktoApp = createDynamicApp(() => import('../components/apps/nikto'), 'Nikto');



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

const displayDesktopFolder = createDisplay(DesktopFolderApp);
const displayX = createDisplay(XApp);
const displaySpotify = createDisplay(SpotifyApp);
const displaySettings = createDisplay(SettingsApp);
const displayFirefox = createDisplay(FirefoxApp);
const displayGedit = createDisplay(GeditApp);
const displayTodoist = createDisplay(TodoistApp);
const displayWeather = createDisplay(WeatherApp);
const displayClipboardManager = createDisplay(ClipboardManagerApp);
const displayFiglet = createDisplay(FigletApp);
const displayResourceMonitor = createDisplay(ResourceMonitorApp);
const displayScreenRecorder = createDisplay(ScreenRecorderApp);
const displayNikto = createDisplay(NiktoApp);

// Utilities list used for the "Utilities" folder on the desktop
const screenRegistry: Record<string, any> = {
  'qr': displayQr,
  'ascii-art': displayAsciiArt,
  'clipboard-manager': displayClipboardManager,
  'figlet': displayFiglet,
  'quote': displayQuote,
  'project-gallery': displayProjectGallery,
  'input-lab': displayInputLab,
  'subnet-calculator': displaySubnetCalculator,
  '2048': displayGame2048,
  'asteroids': displayAsteroids,
  'battleship': displayBattleship,
  'blackjack': displayBlackjack,
  'breakout': displayBreakout,
  'car-racer': displayCarRacer,
  'lane-runner': displayLaneRunner,
  'checkers': displayCheckers,
  'chess': displayChess,
  'connect-four': displayConnectFour,
  'frogger': displayFrogger,
  'hangman': displayHangman,
  'memory': displayMemory,
  'minesweeper': displayMinesweeper,
  'pacman': displayPacman,
  'platformer': displayPlatformer,
  'pong': displayPong,
  'reversi': displayReversi,
  'simon': displaySimon,
  'snake': displaySnake,
  'sokoban': displaySokoban,
  'solitaire': displaySolitaire,
  'tictactoe': displayTicTacToe,
  'tetris': displayTetris,
  'tower-defense': displayTowerDefense,
  'word-search': displayWordSearch,
  'wordle': displayWordle,
  'nonogram': displayNonogram,
  'space-invaders': displaySpaceInvaders,
  'sudoku': displaySudoku,
  'flappy-bird': displayFlappyBird,
  'candy-crush': displayCandyCrush,
  'gomoku': displayGomoku,
  'pinball': displayPinball,
  'firefox': displayFirefox,
  'calculator': displayCalculator,
  'terminal': displayTerminal,
  'vscode': displayVsCode,
  'x': displayX,
  'spotify': displaySpotify,
  'youtube': displayYouTube,
  'beef': displayBeef,
  'about': displayAboutAlex,
  'settings': displaySettings,
  'files': displayFileExplorer,
  'resource-monitor': displayResourceMonitor,
  'screen-recorder': displayScreenRecorder,
  'ettercap': displayEttercap,
  'ble-sensor': displayBleSensor,
  'metasploit': displayMetasploit,
  'wireshark': displayWireshark,
  'todoist': displayTodoist,
  'sticky_notes': displayStickyNotes,
  'trash': displayTrash,
  'gedit': displayGedit,
  'converter': displayConverter,
  'kismet': displayKismet,
  'nikto': displayNikto,
  'autopsy': displayAutopsy,
  'plugin-manager': displayPluginManager,
  'reaver': displayReaver,
  'nessus': displayNessus,
  'ghidra': displayGhidra,
  'mimikatz': displayMimikatz,
  'mimikatz/offline': displayMimikatzOffline,
  'ssh': displaySSH,
  'http': displayHTTP,
  'html-rewriter': displayHtmlRewrite,
  'contact': displayContact,
  'hydra': displayHydra,
  'nmap-nse': displayNmapNSE,
  'weather': displayWeather,
  'weather-widget': displayWeatherWidget,
  'serial-terminal': displaySerialTerminal,
  'radare2': displayRadare2,
  'volatility': displayVolatility,
  'hashcat': displayHashcat,
  'msf-post': displayMsfPost,
  'evidence-vault': displayEvidenceVault,
  'dsniff': displayDsniff,
  'john': displayJohn,
  'openvas': displayOpenVAS,
  'recon-ng': displayReconNG,
  'security-tools': displaySecurityTools,
};

const attachScreens = (entries) =>
  entries.map((entry) => ({
    ...entry,
    screen: entry.isFolder ? displayDesktopFolder : screenRegistry[entry.id],
  }));

export const utilities = attachScreens(coreUtilities);
export const games = attachScreens(coreGames);

const apps = attachScreens(coreApps);

export { gameDefaults };
export default apps;

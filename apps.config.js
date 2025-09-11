import { createDynamicApp, createDisplay } from "./utils/createDynamicApp";

/**
 * @typedef {import('./types/app').AppMetadata} AppMetadata
 */

export const chromeDefaultTiles = [
  { title: "Example", url: "https://example.com" },
];

// TODO: restore YouTube (youtube)
// TODO: restore Converter (converter)
// TODO: restore Tic Tac Toe (tictactoe)
// TODO: restore Chess (chess)
// TODO: restore Connect Four (connect-four)
// TODO: restore Hangman (hangman)
// TODO: restore Frogger (frogger)
// TODO: restore Flappy Bird (flappy-bird)
// TODO: restore Snake (snake)
// TODO: restore Memory (memory)
// TODO: restore Minesweeper (minesweeper)
// TODO: restore Pong (pong)
// TODO: restore Pacman (pacman)
// TODO: restore Car Racer (car-racer)
// TODO: restore Lane Runner (lane-runner)
// TODO: restore Platformer (platformer)
// TODO: restore Battleship (battleship)
// TODO: restore Checkers (checkers)
// TODO: restore Reversi (reversi)
// TODO: restore Simon (simon)
// TODO: restore Sokoban (sokoban)
// TODO: restore Solitaire (solitaire/index)
// TODO: restore Tower Defense (tower-defense)
// TODO: restore Word Search (word-search)
// TODO: restore Wordle (wordle)
// TODO: restore Blackjack (blackjack)
// TODO: restore Breakout (breakout)
// TODO: restore Asteroids (asteroids)
// TODO: restore Sudoku (sudoku)
// TODO: restore Space Invaders (space-invaders)
// TODO: restore Nonogram (nonogram)
// TODO: restore Tetris (tetris)
// TODO: restore Candy Crush (candy-crush)
// TODO: restore Files (file-explorer)
// TODO: restore Image Viewer (ristretto)
// TODO: restore Radare2 (radare2)
// TODO: restore About Alex (alex)
// TODO: restore Power Settings (power)
// TODO: restore X (x)
// TODO: restore Spotify (spotify)
// TODO: restore Settings (settings)
// TODO: restore Chrome (chrome)
// TODO: restore Gedit (gedit)
// TODO: restore Todoist (todoist)
// TODO: restore Weather (weather)
// TODO: restore Clipboard Manager (ClipboardManager)
// TODO: restore Figlet (figlet)
// TODO: restore Resource Monitor (resource_monitor)
// TODO: restore Screen Recorder (screen-recorder)
// TODO: restore Task Manager (task_manager)
// TODO: restore Nikto (nikto)
// TODO: restore QR Tool (qr)
// TODO: restore ASCII Art (ascii_art)
// TODO: restore Quote (quote)
// TODO: restore Project Gallery (project-gallery)
// TODO: restore Weather Widget (weather_widget)
// TODO: restore Input Lab (input-lab)
// TODO: restore Ghidra (ghidra)
// TODO: restore Brasero (brasero)
// TODO: restore Sticky Notes (sticky_notes)
// TODO: restore Trash (trash)
// TODO: restore Serial Terminal (serial-terminal)
// TODO: restore Network Connections (network/connections)
// TODO: restore BLE Sensor (ble-sensor)
// TODO: restore Bluetooth (bluetooth)
// TODO: restore dsniff (dsniff)
// TODO: restore BeEF (beef)
// TODO: restore Metasploit (metasploit)
// TODO: restore Network Manager (network-manager)
// TODO: restore Autopsy (autopsy)
// TODO: restore Plugin Manager (plugin-manager)
// TODO: restore Panel Profiles (panel-profiles)
// TODO: restore Gomoku (gomoku)
// TODO: restore Pinball (pinball)
// TODO: restore Volatility (volatility)
// TODO: restore Kismet (kismet.jsx)
// TODO: restore Hashcat (hashcat)
// TODO: restore Metasploit Post (msf-post)
// TODO: restore Evidence Vault (evidence-vault)
// TODO: restore Mimikatz (mimikatz)
// TODO: restore Mimikatz Offline (mimikatz/offline)
// TODO: restore Ettercap (ettercap)
// TODO: restore Reaver (reaver)
// TODO: restore Hydra (hydra)
// TODO: restore John the Ripper (john)
// TODO: restore Nessus (nessus)
// TODO: restore Nmap NSE (nmap-nse)
// TODO: restore OpenVAS (openvas)
// TODO: restore Recon-ng (reconng)
// TODO: restore Kali Tools (kali-tools)
// TODO: restore Security Tools (security-tools)
// TODO: restore Kali Tweaks (kali-tweaks)
// TODO: restore SSH Command Builder (ssh)
// TODO: restore HTTP Request Builder (http)
// TODO: restore HTML Rewriter (html-rewriter)
// TODO: restore Contact (contact)
// TODO: restore Gigolo (gigolo)

const TerminalApp = createDynamicApp("terminal", "Terminal");
const VsCodeApp = createDynamicApp("vscode", "Visual Studio Code");
const CalcApp = createDynamicApp("calc", "Calculator");
const ConverterApp = createDynamicApp("converter", "Converter");
const TicTacToeApp = createDynamicApp("tictactoe", "Tic Tac Toe");
const ChessApp = createDynamicApp("chess", "Chess");
// Classic four-in-a-row game
const ConnectFourApp = createDynamicApp("connect-four", "Connect Four");
const HangmanApp = createDynamicApp("hangman", "Hangman");
const FroggerApp = createDynamicApp("frogger", "Frogger");
const FlappyBirdApp = createDynamicApp("flappy-bird", "Flappy Bird");
const SnakeApp = createDynamicApp("snake", "Snake");
const MemoryApp = createDynamicApp("memory", "Memory");
// Classic puzzle where players clear a minefield.
const MinesweeperApp = createDynamicApp("minesweeper", "Minesweeper");
const PongApp = createDynamicApp("pong", "Pong");
const PacmanApp = createDynamicApp("pacman", "Pacman");
const CarRacerApp = createDynamicApp("car-racer", "Car Racer");
const LaneRunnerApp = createDynamicApp("lane-runner", "Lane Runner");
const PlatformerApp = createDynamicApp("platformer", "Platformer");
const BattleshipApp = createDynamicApp("battleship", "Battleship");
const CheckersApp = createDynamicApp("checkers", "Checkers");
const ReversiApp = createDynamicApp("reversi", "Reversi");
const SimonApp = createDynamicApp("simon", "Simon");
const SokobanApp = createDynamicApp("sokoban", "Sokoban");
// Use the enhanced TypeScript implementation of Solitaire that supports
// draw-3 mode, hints, animations, and auto-complete.
const SolitaireApp = createDynamicApp("solitaire/index", "Solitaire");
const TowerDefenseApp = createDynamicApp("tower-defense", "Tower Defense");
const WordSearchApp = createDynamicApp("word-search", "Word Search");
const WordleApp = createDynamicApp("wordle", "Wordle");
const BlackjackApp = createDynamicApp("blackjack", "Blackjack");
const BreakoutApp = createDynamicApp("breakout", "Breakout");
const AsteroidsApp = createDynamicApp("asteroids", "Asteroids");
const SudokuApp = createDynamicApp("sudoku", "Sudoku");
const SpaceInvadersApp = createDynamicApp("space-invaders", "Space Invaders");
const NonogramApp = createDynamicApp("nonogram", "Nonogram");
const TetrisApp = createDynamicApp("tetris", "Tetris");
const CandyCrushApp = createDynamicApp("candy-crush", "Candy Crush");
const FileExplorerApp = createDynamicApp("file-explorer", "Files");
const RistrettoApp = createDynamicApp("ristretto", "Image Viewer");
const Radare2App = createDynamicApp("radare2", "Radare2");
const AboutAlexApp = createDynamicApp("About", "About Alex");
const PowerApp = createDynamicApp("power", "Power Settings");

const XApp = createDynamicApp("x", "X");
const SpotifyApp = createDynamicApp("spotify", "Spotify");
const SettingsApp = createDynamicApp("settings", "Settings");
const ChromeApp = createDynamicApp("chrome", "Google Chrome");
const GeditApp = createDynamicApp("gedit", "Gedit");
const MousepadApp = createDynamicApp("mousepad", "Mousepad Preferences");
const TodoistApp = createDynamicApp("todoist", "Todoist");
const WeatherApp = createDynamicApp("weather", "Weather");
const ClipboardManagerApp = createDynamicApp(
  "clipboard_manager",
  "Clipboard Manager",
);
const FigletApp = createDynamicApp("figlet", "Figlet");
const ResourceMonitorApp = createDynamicApp(
  "resource_monitor",
  "Resource Monitor",
);
const ScreenRecorderApp = createDynamicApp(
  "screen-recorder",
  "Screen Recorder",
);
const TaskManagerApp = createDynamicApp("task_manager", "Task Manager");
const NiktoApp = createDynamicApp("nikto", "Nikto");

const QrApp = createDynamicApp("qr", "QR Tool");
const AsciiArtApp = createDynamicApp("ascii_art", "ASCII Art");
const QuoteApp = createDynamicApp("quote", "Quote");
const ProjectGalleryApp = createDynamicApp(
  "project-gallery",
  "Project Gallery",
);
const WeatherWidgetApp = createDynamicApp("weather_widget", "Weather Widget");
const InputLabApp = createDynamicApp("input-lab", "Input Lab");
const GhidraApp = createDynamicApp("ghidra", "Ghidra");
const BraseroApp = createDynamicApp("brasero", "Brasero");

const StickyNotesApp = createDynamicApp("sticky_notes", "Sticky Notes");
const TrashApp = createDynamicApp("trash", "Trash");
const SerialTerminalApp = createDynamicApp(
  "serial-terminal",
  "Serial Terminal",
);

const NetworkConnectionsApp = createDynamicApp(
  "network/connections",
  "Network Connections",
);
const BleSensorApp = createDynamicApp("ble-sensor", "BLE Sensor");
const BluetoothApp = createDynamicApp("bluetooth", "Bluetooth");
const DsniffApp = createDynamicApp("dsniff", "dsniff");
const BeefApp = createDynamicApp("beef", "BeEF");
const MetasploitApp = createDynamicApp("metasploit", "Metasploit");
const NetworkManagerApp = createDynamicApp(
  "network-manager",
  "Network Manager",
);

const AutopsyApp = createDynamicApp("autopsy", "Autopsy");
const PluginManagerApp = createDynamicApp("plugin-manager", "Plugin Manager");
const PanelProfilesApp = createDynamicApp("panel-profiles", "Panel Profiles");

const GomokuApp = createDynamicApp("gomoku", "Gomoku");
const PinballApp = createDynamicApp("pinball", "Pinball");
const VolatilityApp = createDynamicApp("volatility", "Volatility");

const KismetApp = createDynamicApp("kismet", "Kismet");

const HashcatApp = createDynamicApp("hashcat", "Hashcat");
const MsfPostApp = createDynamicApp("metasploit-post", "Metasploit Post");
const EvidenceVaultApp = createDynamicApp("evidence-vault", "Evidence Vault");
const MimikatzApp = createDynamicApp("mimikatz", "Mimikatz");
const MimikatzOfflineApp = createDynamicApp(
  "mimikatz/offline",
  "Mimikatz Offline",
);
const EttercapApp = createDynamicApp("ettercap", "Ettercap");
const ReaverApp = createDynamicApp("reaver", "Reaver");
const HydraApp = createDynamicApp("hydra", "Hydra");
const JohnApp = createDynamicApp("john", "John the Ripper");
const NessusApp = createDynamicApp("nessus", "Nessus");
const NmapNSEApp = createDynamicApp("nmap-nse", "Nmap NSE");
const OpenVASApp = createDynamicApp("openvas", "OpenVAS");
const ReconNGApp = createDynamicApp("reconng", "Recon-ng");
const KaliToolsApp = createDynamicApp("kali-tools", "Kali Tools");
const SecurityToolsApp = createDynamicApp("security-tools", "Security Tools");
const KaliTweaksApp = createDynamicApp("kali-tweaks", "Kali Tweaks");
const SSHApp = createDynamicApp("ssh", "SSH Command Builder");
const HTTPApp = createDynamicApp("http", "HTTP Request Builder");
const HtmlRewriteApp = createDynamicApp("html-rewriter", "HTML Rewriter");
const ContactApp = createDynamicApp("contact", "Contact");
const GigoloApp = createDynamicApp("gigolo", "Gigolo");

const displayTerminal = createDisplay(TerminalApp);
const displayChrome = createDisplay(ChromeApp);
const displayVsCode = createDisplay(VsCodeApp);
const displayCalc = createDisplay(CalcApp);
const displayConverter = createDisplay(ConverterApp);
const displayTicTacToe = createDisplay(TicTacToeApp);
const displayChess = createDisplay(ChessApp);
const displayConnectFour = createDisplay(ConnectFourApp);
const displayHangman = createDisplay(HangmanApp);
const displayFrogger = createDisplay(FroggerApp);
const displayFlappyBird = createDisplay(FlappyBirdApp);
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
const displayRistretto = createDisplay(RistrettoApp);
const displayRadare2 = createDisplay(Radare2App);
const displayAboutAlex = createDisplay(AboutAlexApp);
const displayPower = createDisplay(PowerApp);

const displayX = createDisplay(XApp);
const displaySpotify = createDisplay(SpotifyApp);
const displaySettings = createDisplay(SettingsApp);
const displayGedit = createDisplay(GeditApp);
const displayMousepad = createDisplay(MousepadApp);
const displayTodoist = createDisplay(TodoistApp);
const displayWeather = createDisplay(WeatherApp);
const displayClipboardManager = createDisplay(ClipboardManagerApp);
const displayFiglet = createDisplay(FigletApp);
const displayResourceMonitor = createDisplay(ResourceMonitorApp);
const displayScreenRecorder = createDisplay(ScreenRecorderApp);
const displayTaskManager = createDisplay(TaskManagerApp);
const displayNikto = createDisplay(NiktoApp);

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
const displayBrasero = createDisplay(BraseroApp);

const displayAutopsy = createDisplay(AutopsyApp);
const displayPluginManager = createDisplay(PluginManagerApp);
const displayPanelProfiles = createDisplay(PanelProfilesApp);

const displayNetworkConnections = createDisplay(NetworkConnectionsApp);
const displayBleSensor = createDisplay(BleSensorApp);
const displayBluetooth = createDisplay(BluetoothApp);
const displayBeef = createDisplay(BeefApp);
const displayMetasploit = createDisplay(MetasploitApp);
const displayNetworkManager = createDisplay(NetworkManagerApp);
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
const displayKaliTools = createDisplay(KaliToolsApp);
const displaySecurityTools = createDisplay(SecurityToolsApp);
const displayKaliTweaks = createDisplay(KaliTweaksApp);
const displaySSH = createDisplay(SSHApp);
const displayHTTP = createDisplay(HTTPApp);
const displayHtmlRewrite = createDisplay(HtmlRewriteApp);
const displayContact = createDisplay(ContactApp);
const displayGigolo = createDisplay(GigoloApp);

const displayHashcat = createDisplay(HashcatApp);

const displayKismet = createDisplay(KismetApp);

// Utilities list used for the "Utilities" folder on the desktop
/** @type {AppMetadata[]} */
const utilityList = [
  {
    id: "qr",
    title: "QR Tool",
    icon: "/themes/Yaru/apps/qr.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQr,
  },
  {
    id: "ascii-art",
    title: "ASCII Art",
    icon: "/themes/Yaru/apps/gedit.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsciiArt,
  },
  {
    id: "clipboard-manager",
    title: "Clipboard Manager",
    icon: "/themes/Yaru/apps/gedit.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayClipboardManager,
  },
  {
    id: "figlet",
    title: "Figlet",
    icon: "/themes/Yaru/apps/gedit.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFiglet,
  },
  {
    id: "quote",
    title: "Quote",
    icon: "/themes/Yaru/apps/quote.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQuote,
  },
  {
    id: "project-gallery",
    title: "Project Gallery",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayProjectGallery,
  },
  {
    id: "brasero",
    title: "Brasero",
    icon: "/themes/Yaru/apps/brasero.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBrasero,
  },
  {
    id: "input-lab",
    title: "Input Lab",
    icon: "/themes/Yaru/apps/input-lab.svg",
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
    id: "asteroids",
    title: "Asteroids",
    icon: "/themes/Yaru/apps/asteroids.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsteroids,
  },
  {
    id: "battleship",
    title: "Battleship",
    icon: "/themes/Yaru/apps/battleship.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBattleship,
  },
  {
    id: "blackjack",
    title: "Blackjack",
    icon: "/themes/Yaru/apps/blackjack.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBlackjack,
    ...gameDefaults,
  },
  {
    id: "breakout",
    title: "Breakout",
    icon: "/themes/Yaru/apps/breakout.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBreakout,
  },
  {
    id: "car-racer",
    title: "Car Racer",
    icon: "/themes/Yaru/apps/car-racer.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCarRacer,
  },
  {
    id: "lane-runner",
    title: "Lane Runner",
    icon: "/themes/Yaru/apps/car-racer.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayLaneRunner,
  },
  {
    id: "checkers",
    title: "Checkers",
    icon: "/themes/Yaru/apps/checkers.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCheckers,
  },
  {
    id: "chess",
    title: "Chess",
    icon: "/themes/Yaru/apps/chess.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayChess,
  },
  // Simple placeholder implementation
  {
    id: "connect-four",
    title: "Connect Four",
    icon: "/themes/Yaru/apps/connect-four.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConnectFour,
  },
  {
    id: "frogger",
    title: "Frogger",
    icon: "/themes/Yaru/apps/frogger.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFrogger,
  },
  {
    id: "hangman",
    title: "Hangman",
    icon: "/themes/Yaru/apps/hangman.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHangman,
  },
  {
    id: "memory",
    title: "Memory",
    icon: "/themes/Yaru/apps/memory.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMemory,
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    icon: "/themes/Yaru/apps/minesweeper.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMinesweeper,
  },
  {
    id: "pacman",
    title: "Pacman",
    icon: "/themes/Yaru/apps/pacman.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPacman,
  },
  {
    id: "platformer",
    title: "Platformer",
    icon: "/themes/Yaru/apps/platformer.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPlatformer,
  },
  {
    id: "pong",
    title: "Pong",
    icon: "/themes/Yaru/apps/pong.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPong,
  },
  {
    id: "reversi",
    title: "Reversi",
    icon: "/themes/Yaru/apps/reversi.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReversi,
  },
  {
    id: "simon",
    title: "Simon",
    icon: "/themes/Yaru/apps/simon.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySimon,
  },
  {
    id: "snake",
    title: "Snake",
    icon: "/themes/Yaru/apps/snake.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySnake,
  },
  {
    id: "sokoban",
    title: "Sokoban",
    icon: "/themes/Yaru/apps/sokoban.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySokoban,
  },
  {
    id: "solitaire",
    title: "Solitaire",
    icon: "/themes/Yaru/apps/solitaire.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySolitaire,
  },
  {
    id: "tictactoe",
    title: "Tic Tac Toe",
    icon: "/themes/Yaru/apps/tictactoe.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTicTacToe,
    ...gameDefaults,
  },
  {
    id: "tetris",
    title: "Tetris",
    icon: "/themes/Yaru/apps/tetris.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTetris,
  },
  {
    id: "tower-defense",
    title: "Tower Defense",
    icon: "/themes/Yaru/apps/tower-defense.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTowerDefense,
  },
  {
    id: "word-search",
    title: "Word Search",
    icon: "/themes/Yaru/apps/word-search.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordSearch,
  },
  {
    id: "wordle",
    title: "Wordle",
    icon: "/themes/Yaru/apps/wordle.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWordle,
  },
  {
    id: "nonogram",
    title: "Nonogram",
    icon: "/themes/Yaru/apps/nonogram.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNonogram,
  },
  {
    id: "space-invaders",
    title: "Space Invaders",
    icon: "/themes/Yaru/apps/space-invaders.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySpaceInvaders,
  },
  {
    id: "sudoku",
    title: "Sudoku",
    icon: "/themes/Yaru/apps/sudoku.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySudoku,
  },
  {
    id: "flappy-bird",
    title: "Flappy Bird",
    icon: "/themes/Yaru/apps/flappy-bird.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFlappyBird,
  },
  {
    id: "candy-crush",
    title: "Candy Crush",
    icon: "/themes/Yaru/apps/candy-crush.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCandyCrush,
  },
  {
    id: "gomoku",
    title: "Gomoku",
    icon: "/themes/Yaru/apps/gomoku.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGomoku,
  },
  {
    id: "pinball",
    title: "Pinball",
    icon: "/themes/Yaru/apps/pinball.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPinball,
  },
];

/** @type {AppMetadata[]} */
export const games = gameList.map((game) => ({ ...gameDefaults, ...game }));

/** @type {AppMetadata[]} */
const apps = [
  {
    id: "terminal",
    title: "Terminal",
    icon: "/themes/Yaru/apps/bash.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminal,
  },
  {
    // VSCode app uses a Stack iframe, so no editor dependencies are required
    id: "vscode",
    title: "Visual Studio Code",
    icon: "/themes/Yaru/apps/vscode.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayVsCode,
    defaultWidth: 85,
    defaultHeight: 85,
  },
  {
    id: "chrome",
    title: "Google Chrome",
    icon: "/themes/Yaru/apps/chrome.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayChrome,
  },
  {
    id: "calc",
    title: "Calculator",
    icon: "/themes/Yaru/apps/calc.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayCalc,
  },
  {
    id: "x",
    title: "X",
    icon: "/themes/Yaru/apps/x.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayX,
  },
  {
    id: "spotify",
    title: "Spotify",
    icon: "/themes/Yaru/apps/spotify.svg",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySpotify,
  },
  {
    id: "beef",
    title: "BeEF",
    icon: "/themes/Yaru/apps/beef.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBeef,
  },
  {
    id: "about",
    title: "About Alex",
    icon: "/themes/Yaru/system/user-home.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayAboutAlex,
  },
  {
    id: "settings",
    title: "Settings",
    icon: "/themes/Yaru/apps/gnome-control-center.png",
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySettings,
  },
  {
    id: "power",
    title: "Power",
    icon: "/themes/Yaru/status/power-button.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPower,
  },
  {
    id: "files",
    title: "Files",
    icon: "/themes/Yaru/system/folder.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayFileExplorer,
  },
  {
    id: "ristretto",
    title: "Image Viewer",
    icon: "/themes/Yaru/apps/ristretto.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRistretto,
  },
  {
    id: "resource-monitor",
    title: "Resource Monitor",
    icon: "/themes/Yaru/apps/resource-monitor.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayResourceMonitor,
  },
  {
    id: "task-manager",
    title: "Task Manager",
    icon: "/themes/Yaru/apps/resource-monitor.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTaskManager,
  },
  {
    id: "screen-recorder",
    title: "Screen Recorder",
    icon: "/themes/Yaru/apps/screen-recorder.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayScreenRecorder,
  },
  {
    id: "ettercap",
    title: "Ettercap",
    icon: "/themes/Yaru/apps/ettercap.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayEttercap,
  },
  {
    id: "ble-sensor",
    title: "BLE Sensor",
    icon: "/themes/Yaru/apps/bluetooth.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBleSensor,
  },
  {
    id: "bluetooth",
    title: "Bluetooth",
    icon: "/themes/Yaru/apps/bluetooth.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBluetooth,
  },
  {
    id: "metasploit",
    title: "Metasploit",
    icon: "/themes/Yaru/apps/metasploit.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMetasploit,
  },
  {
    id: "network/connections",
    title: "Network Connections",
    icon: "/themes/Yaru/status/network-wireless-signal-good-symbolic.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNetworkConnections,
  },
  {
    id: "todoist",
    title: "Todoist",
    icon: "/themes/Yaru/apps/todoist.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTodoist,
  },
  {
    id: "sticky_notes",
    title: "Sticky Notes",
    icon: "/themes/Yaru/apps/gedit.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayStickyNotes,
  },
  {
    id: "trash",
    title: "Trash",
    icon: "/themes/Yaru/status/user-trash-symbolic.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTrash,
  },
  {
    id: "mousepad",
    title: "Mousepad Preferences",
    icon: "/themes/Yaru/apps/gedit.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMousepad,
  },
  {
    id: "gedit",
    title: "Contact Me",
    icon: "/themes/Yaru/apps/gedit.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGedit,
  },
  {
    id: "converter",
    title: "Converter",

    icon: "/themes/Yaru/apps/calc.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConverter,
  },
  {
    id: "kismet",
    title: "Kismet",
    icon: "/themes/Yaru/apps/kismet.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayKismet,
  },
  {
    id: "nikto",
    title: "Nikto",
    icon: "/themes/Yaru/apps/nikto.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNikto,
  },
  {
    id: "autopsy",
    title: "Autopsy",
    icon: "/themes/Yaru/apps/autopsy.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAutopsy,
  },
  {
    id: "plugin-manager",
    title: "Plugin Manager",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPluginManager,
  },
  {
    id: "panel-profiles",
    title: "Panel Profiles",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPanelProfiles,
  },
  {
    id: "reaver",
    title: "Reaver",
    icon: "/themes/Yaru/apps/reaver.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReaver,
  },
  {
    id: "nessus",
    title: "Nessus",
    icon: "/themes/Yaru/apps/nessus.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNessus,
  },
  {
    id: "ghidra",
    title: "Ghidra",
    icon: "/themes/Yaru/apps/ghidra.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGhidra,
  },
  {
    id: "gigolo",
    title: "Gigolo",
    icon: "/themes/Yaru/apps/ftp.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayGigolo,
  },
  {
    id: "mimikatz",
    title: "Mimikatz",
    icon: "/themes/Yaru/apps/mimikatz.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMimikatz,
  },
  {
    id: "mimikatz/offline",
    title: "Mimikatz Offline",
    icon: "/themes/Yaru/apps/mimikatz.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMimikatzOffline,
  },
  {
    id: "ssh",
    title: "SSH Builder",
    icon: "/themes/Yaru/apps/ssh.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySSH,
  },
  {
    id: "http",
    title: "HTTP Builder",
    icon: "/themes/Yaru/apps/http.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHTTP,
  },
  {
    id: "html-rewriter",
    title: "HTML Rewriter",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHtmlRewrite,
  },
  ...(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    ? [
        {
          id: "contact",
          title: "Contact",
          icon: "/themes/Yaru/apps/project-gallery.svg",
          disabled: false,
          favourite: false,
          desktop_shortcut: false,
          screen: displayContact,
        },
      ]
    : []),
  {
    id: "hydra",
    title: "Hydra",
    icon: "/themes/Yaru/apps/hydra.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHydra,
  },
  {
    id: "nmap-nse",
    title: "Nmap NSE",
    icon: "/themes/Yaru/apps/nmap-nse.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNmapNSE,
  },
  {
    id: "weather",
    title: "Weather",
    icon: "/themes/Yaru/apps/weather.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWeather,
  },
  {
    id: "weather-widget",
    title: "Weather Widget",
    icon: "/themes/Yaru/apps/weather.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWeatherWidget,
  },
  {
    id: "serial-terminal",
    title: "Serial Terminal",
    icon: "/themes/Yaru/apps/bash.png",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySerialTerminal,
  },
  {
    id: "radare2",
    title: "Radare2",
    icon: "/themes/Yaru/apps/radare2.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRadare2,
  },
  {
    id: "volatility",
    title: "Volatility",
    icon: "/themes/Yaru/apps/volatility.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayVolatility,
  },
  {
    id: "hashcat",
    title: "Hashcat",
    icon: "/themes/Yaru/apps/hashcat.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayHashcat,
  },
  {
    id: "metasploit-post",
    title: "Metasploit Post",
    icon: "/themes/Yaru/apps/msf-post.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayMsfPost,
  },
  {
    id: "evidence-vault",
    title: "Evidence Vault",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayEvidenceVault,
  },
  {
    id: "dsniff",
    title: "dsniff",
    icon: "/themes/Yaru/apps/dsniff.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayDsniff,
  },
  {
    id: "network-manager",
    title: "Network Manager",
    icon: "/themes/Yaru/apps/resource-monitor.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayNetworkManager,
  },
  {
    id: "john",
    title: "John the Ripper",
    icon: "/themes/Yaru/apps/john.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayJohn,
  },
  {
    id: "openvas",
    title: "OpenVAS",
    icon: "/themes/Yaru/apps/openvas.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayOpenVAS,
  },
  {
    id: "recon-ng",
    title: "Recon-ng",
    icon: "/themes/Yaru/apps/reconng.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayReconNG,
  },
  {
    id: "kali-tools",
    title: "Kali Tools",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayKaliTools,
  },
  {
    id: "security-tools",
    title: "Security Tools",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySecurityTools,
  },
  {
    id: "kali-tweaks",
    title: "Kali Tweaks",
    icon: "/themes/Yaru/apps/project-gallery.svg",
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayKaliTweaks,
  },
];

export default apps;

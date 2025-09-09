import { createDynamicApp, createDisplay } from './utils/createDynamicApp';

/**
 * @typedef {import('./types/app').AppMetadata} AppMetadata
 */

export const chromeDefaultTiles = [
  { title: 'Example', url: 'https://example.com' },
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

const TerminalApp = createDynamicApp('terminal', 'Terminal');
const VsCodeApp = createDynamicApp('vscode', 'VsCode');
const CalculatorApp = createDynamicApp('calculator', 'Calculator');

const displayTerminal = createDisplay(TerminalApp);
const displayVsCode = createDisplay(VsCodeApp);
const displayCalculator = createDisplay(CalculatorApp);

/** @type {AppMetadata[]} */
const apps = [
  {
    id: 'terminal',
    title: 'Terminal',
    icon: '/themes/Yaru/apps/bash.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayTerminal,
  },
  {
    // VSCode app uses a Stack iframe, so no editor dependencies are required
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: '/themes/Yaru/apps/vscode.png',
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayVsCode,
    defaultWidth: 85,
    defaultHeight: 85,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '/themes/Yaru/apps/calc.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCalculator,
    resizable: false,
    allowMaximize: false,
    defaultWidth: 28,
    defaultHeight: 50,
  },
];

export const utilities = [];
export const gameDefaults = { defaultWidth: 50, defaultHeight: 60 };
export const games = [];

export default apps;

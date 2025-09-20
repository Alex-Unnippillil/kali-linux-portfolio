export interface AppMetadata {
  tags: string[];
}

const baseTagConfig: Record<string, string[]> = {
  chrome: ['browser', 'web', 'internet', 'utility'],
  calculator: ['math', 'calculator', 'utility'],
  terminal: ['terminal', 'shell', 'cli', 'system'],
  vscode: ['editor', 'code', 'development', 'productivity'],
  x: ['social', 'media', 'feed'],
  spotify: ['music', 'media', 'streaming'],
  youtube: ['video', 'media', 'streaming'],
  beef: ['security', 'web', 'exploitation', 'browser'],
  about: ['about', 'profile', 'portfolio'],
  settings: ['settings', 'preferences', 'system'],
  files: ['files', 'explorer', 'system', 'storage'],
  'resource-monitor': ['system', 'performance', 'monitoring', 'utility'],
  'screen-recorder': ['screen', 'recording', 'media', 'utility'],
  ettercap: ['security', 'network', 'sniffer', 'mitm'],
  'ble-sensor': ['security', 'bluetooth', 'wireless', 'monitoring'],
  metasploit: ['security', 'framework', 'exploitation'],
  wireshark: ['security', 'network', 'analysis', 'sniffer'],
  todoist: ['productivity', 'tasks', 'todo'],
  sticky_notes: ['productivity', 'notes', 'reminders'],
  trash: ['system', 'cleanup', 'storage'],
  gedit: ['contact', 'email', 'communication'],
  converter: ['utility', 'math', 'conversion'],
  kismet: ['security', 'wifi', 'monitoring', 'network'],
  nikto: ['security', 'scanner', 'web'],
  autopsy: ['security', 'forensics', 'analysis'],
  'plugin-manager': ['system', 'plugins', 'management'],
  reaver: ['security', 'wifi', 'bruteforce'],
  nessus: ['security', 'scanner', 'vulnerability'],
  ghidra: ['security', 'reverse-engineering', 'analysis'],
  mimikatz: ['security', 'credentials', 'exfiltration'],
  'mimikatz/offline': ['security', 'credentials', 'offline'],
  ssh: ['network', 'ssh', 'builder', 'utility'],
  http: ['network', 'http', 'builder', 'utility'],
  'html-rewriter': ['web', 'html', 'utility'],
  contact: ['contact', 'communication', 'form'],
  hydra: ['security', 'password', 'bruteforce'],
  'nmap-nse': ['security', 'network', 'scanner'],
  weather: ['weather', 'forecast', 'utility'],
  'weather-widget': ['weather', 'widget', 'dashboard'],
  'serial-terminal': ['hardware', 'serial', 'debugging', 'utility'],
  radare2: ['security', 'reverse-engineering', 'analysis'],
  volatility: ['security', 'memory', 'forensics'],
  hashcat: ['security', 'password', 'cracking'],
  'msf-post': ['security', 'metasploit', 'post-exploitation'],
  'evidence-vault': ['security', 'forensics', 'notes'],
  dsniff: ['security', 'network', 'sniffer'],
  john: ['security', 'password', 'cracking'],
  openvas: ['security', 'scanner', 'vulnerability'],
  'recon-ng': ['security', 'osint', 'reconnaissance'],
  'security-tools': ['security', 'dashboard', 'collection'],
};

const utilityTagConfig: Record<string, string[]> = {
  qr: ['utility', 'generator', 'qr'],
  'ascii-art': ['utility', 'art', 'text'],
  'clipboard-manager': ['utility', 'clipboard', 'productivity'],
  figlet: ['utility', 'ascii', 'text'],
  quote: ['utility', 'quotes', 'reading'],
  'project-gallery': ['portfolio', 'projects', 'showcase'],
  'input-lab': ['utility', 'testing', 'forms', 'accessibility'],
};

const gameTagConfig: Record<string, string[]> = {
  '2048': ['game', 'puzzle', 'numbers'],
  asteroids: ['game', 'arcade', 'space'],
  battleship: ['game', 'strategy', 'board'],
  blackjack: ['game', 'card', 'casino'],
  breakout: ['game', 'arcade', 'retro'],
  'car-racer': ['game', 'racing', 'arcade'],
  'lane-runner': ['game', 'endless', 'runner'],
  checkers: ['game', 'board', 'strategy'],
  chess: ['game', 'board', 'strategy'],
  'connect-four': ['game', 'board', 'puzzle'],
  frogger: ['game', 'arcade', 'retro'],
  hangman: ['game', 'word', 'puzzle'],
  memory: ['game', 'puzzle', 'memory'],
  minesweeper: ['game', 'puzzle', 'logic'],
  pacman: ['game', 'arcade', 'retro'],
  platformer: ['game', 'platformer', 'retro'],
  pong: ['game', 'arcade', 'retro'],
  reversi: ['game', 'board', 'strategy'],
  simon: ['game', 'memory', 'rhythm'],
  snake: ['game', 'arcade', 'retro'],
  sokoban: ['game', 'puzzle', 'logic'],
  solitaire: ['game', 'card', 'patience'],
  tictactoe: ['game', 'board', 'puzzle'],
  tetris: ['game', 'puzzle', 'retro'],
  'tower-defense': ['game', 'strategy', 'defense'],
  'word-search': ['game', 'word', 'puzzle'],
  wordle: ['game', 'word', 'puzzle'],
  nonogram: ['game', 'puzzle', 'logic'],
  'space-invaders': ['game', 'arcade', 'space'],
  sudoku: ['game', 'puzzle', 'numbers'],
  'flappy-bird': ['game', 'arcade', 'endless'],
  'candy-crush': ['game', 'puzzle', 'match-three'],
  gomoku: ['game', 'board', 'strategy'],
  pinball: ['game', 'arcade', 'retro'],
};

const buildMetadata = () => {
  const map = new Map<string, Set<string>>();

  const addTags = (id: string, tags: string[]) => {
    if (!map.has(id)) {
      map.set(id, new Set());
    }
    const tagSet = map.get(id)!;
    tags.forEach((tag) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized) tagSet.add(normalized);
    });
  };

  [baseTagConfig, utilityTagConfig, gameTagConfig].forEach((config) => {
    Object.entries(config).forEach(([id, tags]) => addTags(id, tags));
  });

  const metadata: Record<string, AppMetadata> = {};
  map.forEach((tags, id) => {
    metadata[id] = { tags: Array.from(tags).sort() };
  });
  return metadata;
};

const APP_METADATA = buildMetadata();

export const getAppMetadata = (id: string): AppMetadata => APP_METADATA[id] || { tags: [] };

export default APP_METADATA;

export type AppRegistryNode = {
  id: string;
  label: string;
  apps?: string[];
  children?: AppRegistryNode[];
  /** Expand this node by default when the menu is first opened */
  defaultOpen?: boolean;
};

const GAME_TREE: AppRegistryNode[] = [
  {
    id: 'games-arcade',
    label: 'Arcade & Action',
    defaultOpen: true,
    apps: [
      'asteroids',
      'car-racer',
      'lane-runner',
      'frogger',
      'platformer',
      'space-invaders',
      'flappy-bird',
      'pinball',
    ],
  },
  {
    id: 'games-retro',
    label: 'Retro Classics',
    apps: ['pacman', 'pong', 'breakout', 'snake'],
  },
  {
    id: 'games-puzzle',
    label: 'Puzzle & Logic',
    apps: ['2048', 'minesweeper', 'nonogram', 'sudoku', 'tetris', 'sokoban', 'memory', 'candy-crush'],
  },
  {
    id: 'games-word',
    label: 'Word & Trivia',
    apps: ['hangman', 'word-search', 'wordle'],
  },
  {
    id: 'games-board',
    label: 'Board & Strategy',
    apps: [
      'chess',
      'checkers',
      'reversi',
      'battleship',
      'tictactoe',
      'gomoku',
      'tower-defense',
      'connect-four',
    ],
  },
  {
    id: 'games-card',
    label: 'Cards & Tabletop',
    apps: ['blackjack', 'solitaire'],
  },
  {
    id: 'games-memory',
    label: 'Memory & Rhythm',
    apps: ['simon'],
  },
];

export const APP_REGISTRY = {
  all: [
    {
      id: 'workspace',
      label: 'Workspace',
      defaultOpen: true,
      children: [
        {
          id: 'workspace-core',
          label: 'Core Applications',
          defaultOpen: true,
          apps: [
            'chrome',
            'files',
            'settings',
            'resource-monitor',
            'screen-recorder',
            'plugin-manager',
            'trash',
            'about',
          ],
        },
        {
          id: 'workspace-developer',
          label: 'Developer Tools',
          defaultOpen: true,
          apps: ['terminal', 'vscode', 'html-rewriter', 'input-lab', 'serial-terminal'],
        },
        {
          id: 'workspace-productivity',
          label: 'Productivity & Notes',
          defaultOpen: true,
          apps: [
            'todoist',
            'sticky_notes',
            'clipboard-manager',
            'gedit',
            'contact',
            'calculator',
            'converter',
            'quote',
            'project-gallery',
          ],
        },
        {
          id: 'workspace-media',
          label: 'Media & Social',
          apps: ['spotify', 'youtube', 'x'],
        },
        {
          id: 'workspace-weather',
          label: 'Weather & Widgets',
          apps: ['weather', 'weather-widget'],
        },
        {
          id: 'workspace-creative',
          label: 'Creative Extras',
          apps: ['ascii-art', 'figlet'],
        },
      ],
    },
    {
      id: 'security-lab',
      label: 'Security Lab',
      defaultOpen: true,
      children: [
        {
          id: 'security-recon',
          label: 'Recon & Scanning',
          defaultOpen: true,
          apps: ['wireshark', 'nmap-nse', 'openvas', 'nessus', 'recon-ng', 'kismet', 'dsniff', 'ble-sensor'],
        },
        {
          id: 'security-exploitation',
          label: 'Exploitation & Delivery',
          defaultOpen: true,
          apps: ['metasploit', 'msf-post', 'beef', 'ettercap', 'nikto', 'hydra', 'reaver'],
        },
        {
          id: 'security-credentials',
          label: 'Credentials & Access',
          apps: ['john', 'hashcat', 'mimikatz', 'mimikatz/offline'],
        },
        {
          id: 'security-forensics',
          label: 'Post-Exploitation & Forensics',
          apps: ['autopsy', 'volatility', 'radare2', 'ghidra', 'evidence-vault'],
        },
        {
          id: 'security-utilities',
          label: 'Builders & Utilities',
          apps: ['subnet-calculator', 'qr', 'ssh', 'http', 'security-tools'],
        },
      ],
    },
    {
      id: 'all-games',
      label: 'Games',
      children: GAME_TREE,
    },
  ],
  utilities: [
    {
      id: 'utilities-productivity',
      label: 'Productivity',
      defaultOpen: true,
      apps: ['clipboard-manager', 'sticky_notes', 'todoist', 'project-gallery', 'quote'],
    },
    {
      id: 'utilities-creative',
      label: 'Creative & Fun',
      apps: ['ascii-art', 'figlet'],
    },
    {
      id: 'utilities-networking',
      label: 'Networking',
      apps: ['qr', 'subnet-calculator'],
    },
    {
      id: 'utilities-developer',
      label: 'Developer Tools',
      apps: ['input-lab'],
    },
  ],
  games: GAME_TREE,
} as const satisfies Record<string, AppRegistryNode[]>;

export type RegistryCategory = keyof typeof APP_REGISTRY;

export const isRegistryCategory = (value: string): value is RegistryCategory =>
  Object.prototype.hasOwnProperty.call(APP_REGISTRY, value);

const collectDefaultExpansion = (nodes: AppRegistryNode[]): string[] => {
  const ids: string[] = [];
  nodes.forEach((node) => {
    if (node.defaultOpen) {
      ids.push(node.id);
    }
    if (node.children) {
      ids.push(...collectDefaultExpansion(node.children));
    }
  });
  return ids;
};

export const DEFAULT_APP_EXPANSION: Record<string, string[]> = Object.fromEntries(
  Object.entries(APP_REGISTRY).map(([category, nodes]) => [
    category,
    collectDefaultExpansion(nodes),
  ]),
);

export const createDefaultExpansionState = (): Record<string, string[]> =>
  JSON.parse(JSON.stringify(DEFAULT_APP_EXPANSION));

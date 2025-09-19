import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(
  path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)),
  '..',
);
const APPS_DIR = path.join(ROOT, 'apps');
const PAGES_DIR = path.join(ROOT, 'pages', 'apps');
const CONFIG_PATH = path.join(ROOT, 'apps.config.js');

const CATEGORY_PURPOSE = {
  game: (title) =>
    `Provides the standalone view for the ${title} mini-game so it can run full-screen as well as inside the desktop window manager.`,
  security: (title) =>
    `Hosts the full-screen simulation of ${title}, keeping the demo strictly educational while mirroring the desktop window experience.`,
  utility: (title) =>
    `Implements the ${title} utility that powers the desktop tile and the direct /apps route.`,
  system: (title) =>
    `Defines the ${title} system surface that is shared between the desktop shell and the standalone route.`,
  shared: (title) =>
    `Contains shared assets and domain logic that the ${title} experience depends on across multiple entry points.`,
};

const CATEGORY_MAP = new Map();

const assignCategory = (names, category) => {
  for (const name of names) {
    CATEGORY_MAP.set(name, category);
  }
};

assignCategory(
  [
    '2048',
    'blackjack',
    'checkers',
    'connect-four',
    'hangman',
    'minesweeper',
    'phaser_matter',
    'pinball',
    'simon',
    'sokoban',
    'solitaire',
    'tower-defense',
    'word_search',
  ],
  'game',
);

assignCategory(
  [
    'autopsy',
    'beef',
    'dsniff',
    'ettercap',
    'ghidra',
    'hashcat',
    'hydra',
    'john',
    'kismet',
    'metasploit',
    'metasploit-post',
    'mimikatz',
    'nessus',
    'nikto',
    'nmap-nse',
    'openvas',
    'radare2',
    'reaver',
    'recon-ng',
    'volatility',
    'wireshark',
  ],
  'security',
);

assignCategory(
  [
    'About',
    'resource-monitor',
    'settings',
    'terminal',
    'trash',
  ],
  'system',
);

assignCategory(
  [
    'games',
    'hangman',
    'recon-ng',
    'todoist',
  ],
  'shared',
);

const TITLE_OVERRIDES = new Map([
  ['About', 'About Alex'],
  ['john', 'John the Ripper'],
  ['nmap-nse', 'Nmap NSE'],
  ['openvas', 'OpenVAS'],
  ['recon-ng', 'Recon-ng'],
  ['radare2', 'radare2'],
  ['http', 'HTTP Builder'],
  ['phaser_matter', 'Phaser + Matter Demo'],
  ['qr', 'QR Tool'],
  ['ssh', 'SSH Command Builder'],
  ['sticky_notes', 'Sticky Notes'],
  ['subnet-calculator', 'Subnet Calculator'],
  ['timer_stopwatch', 'Timer & Stopwatch'],
  ['vscode', 'Visual Studio Code'],
  ['weather_widget', 'Weather Widget'],
  ['word_search', 'Word Search'],
  ['x', 'X (Twitter)'],
  ['youtube', 'YouTube'],
]);

const NOTES = new Map([
  ['2048', 'It exposes the seeded daily challenge, undo history, and IndexedDB replay recorder used by automated tests.'],
  ['About', 'Wraps the resume carousel, contact links, and profile metadata from `components/apps/About` into a full-page layout.'],
  ['ascii-art', 'Provides font selection, ANSI color wrapping, and image-to-ASCII helpers for demos.'],
  ['autopsy', 'Adds tabbed navigation between the simulated case workspace and the keyword tester while persisting the selection in the URL hash.'],
  ['beef', 'Surfaces the BeEF simulation with a faux incident log beside the shared hook manager UI.'],
  ['blackjack', 'Exposes the blackjack game board, dealer logic, and score tracking for the standalone route.'],
  ['calculator', 'Bootstraps the advanced calculator UI, math.js loader, and persistent history tape.'],
  ['checkers', 'Renders the checkers board with move validation and keyboard shortcuts.'],
  ['chrome', 'Packages the simulated browser tabs, address bar, and reader mode preview for standalone use.'],
  ['clipboard_manager', 'Stores the static web assets that back the clipboard manager share-target prototype.'],
  ['color_picker', 'Contains the legacy DOM color picker demo retained for historical reference.'],
  ['connect-four', 'Ships a lightweight vanilla Connect Four board for the direct `/apps` route.'],
  ['contact', 'Composes the EmailJS contact form, validation state machine, and sent-message history panel.'],
  ['converter', 'Loads the multi-tool unit converter pages and drives the embedded navigation.'],
  ['dsniff', 'Layers the educational notes, canned packet captures, and module toggles for the dsniff simulator.'],
  ['ettercap', 'Provides the safe Ettercap walkthrough with host discovery and profile inspectors.'],
  ['figlet', 'Combines the worker-based font renderer, preview canvas, and preset gallery for FIGlet text art.'],
  ['games', 'Holds reusable game logic such as RNG helpers, puzzles, and physics engines used across mini-games.'],
  ['ghidra', 'Hosts the simulated Ghidra interface with module loader, project explorer, and WASM download guardrails.'],
  ['hangman', 'Exports the pure hangman engine and dictionaries shared by the windowed UI.'],
  ['hashcat', 'Delivers the password attack simulator with scenario tabs, keyspace calculators, and canned logs.'],
  ['html-rewriter', 'Implements the HTML rewriting playground with diff preview and sanitisation helpers.'],
  ['http', 'Builds the HTTP request composer with method toggles, header editor, and response preview.'],
  ['hydra', 'Wraps the Hydra simulation with tabbed run management and the training overlay.'],
  ['input-lab', 'Hosts the accessibility playground that captures keyboard, pointer, and gamepad events.'],
  ['john', 'Includes the John the Ripper workflow, rules presets, and sample crack output.'],
  ['kismet', 'Pairs the sample capture viewer with filters, map view, and device timeline.'],
  ['metasploit', 'Provides the module browser, session dashboard, and lab-safe command builder.'],
  ['metasploit-post', 'Focuses on post-exploitation checklists, issue tracking samples, and privilege escalation guides.'],
  ['mimikatz', 'Wraps the credential dump simulator alongside the offline walkthrough entry point.'],
  ['minesweeper', 'Contains the classic Minesweeper grid logic, timer, and flag controls.'],
  ['nessus', 'Displays the scan scheduler, plugin feed, and findings explorer for the Nessus demo.'],
  ['nikto', 'Offers scanning scenarios, report viewer, and mitigation callouts for Nikto.'],
  ['nmap-nse', 'Runs the NSE script selector, sample outputs, and worker-based emulation.'],
  ['openvas', 'Bundles the task planner, credential manager, and canned scan reports.'],
  ['password_generator', 'Delivers the password generator with entropy meter, clipboard helpers, and preset recipes.'],
  ['phaser_matter', 'Demonstrates Phaser with Matter.js physics for arcade experiments.'],
  ['pinball', 'Mounts the canvas-based pinball game and keyboard controls.'],
  ['plugin-manager', 'Exposes the plugin registry UI used to toggle experimental desktop modules.'],
  ['project-gallery', 'Renders the paginated project cards, filter chips, and detail modal for the portfolio gallery.'],
  ['qr', 'Ships the QR generator and scanner with logo uploads, presets, and download utilities.'],
  ['quote', 'Houses the inspirational quote rotator with tag filters and sharing utilities.'],
  ['radare2', 'Supplies the disassembly viewer, script console, and sample binary metadata.'],
  ['reaver', 'Demonstrates the WPS attack simulator with timeline, command builder, and mitigations.'],
  ['recon-ng', 'Provides planning widgets (data model explorer, module planner) consumed by the Recon-ng window.'],
  ['resource-monitor', 'Collects system metrics, FPS sampler, and export helpers for monitoring demos.'],
  ['settings', 'Manages theme selection, wallpaper state, and feature toggles for the desktop shell.'],
  ['simon', 'Implements the Simon memory game with audio cues and difficulty scaling.'],
  ['sokoban', 'Delivers the Sokoban puzzle with level data and undo support.'],
  ['solitaire', 'Hosts the solitaire game with drag-and-drop interactions and auto-complete helpers.'],
  ['spotify', 'Implements the playlist editor, crossfade audio player, and visualizer for the Spotify clone.'],
  ['ssh', 'Builds the SSH command generator with option toggles, saved presets, and copy helpers.'],
  ['sticky_notes', 'Contains the sticky notes board with share-target handling and OPFS persistence.'],
  ['subnet-calculator', 'Calculates subnet ranges, CIDR math, and allocation tables for lab planning.'],
  ['terminal', 'Wires the Xterm wrapper, command registry, and scripting tabs for the simulated terminal.'],
  ['timer_stopwatch', 'Stores the vanilla timer/stopwatch widget used for legacy demos.'],
  ['todoist', 'Exports the kanban components and recurrence parser used by the Todoist-style task manager.'],
  ['tower-defense', 'Runs the tower defense game, enemy waves, and upgrade logic.'],
  ['trash', 'Implements the trash bin with restore, purge, and metadata tracking.'],
  ['volatility', 'Presents the memory forensics scenarios, plugin explorer, and timeline viewer.'],
  ['vscode', 'Embeds the StackBlitz-powered VS Code surface plus workspace persistence.'],
  ['weather', 'Provides the configurable weather dashboard, fake data adapters, and location search.'],
  ['weather_widget', 'Supplies the compact weather widget demo with sample data loader.'],
  ['wireshark', 'Delivers the packet capture explorer, display filters, and annotation tools.'],
  ['word_search', 'Generates word search puzzles with solver logic and print/export options.'],
  ['x', 'Wraps the X/Twitter embed timeline with theme toggles and focus guards.'],
  ['youtube', 'Implements the video browser, playlist memory, and embed sandbox for YouTube.'],
]);

const ENTRY_OVERRIDES = new Map([
  [
    'games',
    [
      {
        path: 'rng.ts',
        description: 'Shared pseudo-random generator used across multiple games.',
      },
      {
        path: 'sudoku/',
        description: 'Puzzle-specific helpers referenced by the desktop Sudoku window.',
      },
      {
        path: 'tower-defense/',
        description: 'Core tower-defense engine consumed by the windowed game.',
      },
    ],
  ],
  [
    'hangman',
    [
      {
        path: 'engine.ts',
        description: 'Pure hangman game logic shared by the desktop implementation.',
      },
    ],
  ],
  [
    'project-gallery',
    [
      {
        path: 'pages/index.tsx',
        description: 'Next.js page module that renders the gallery grid and filters.',
      },
      {
        path: 'components/',
        description: 'UI fragments (filter chips, cards) reused by both desktop and standalone views.',
      },
    ],
  ],
  [
    'recon-ng',
    [
      {
        path: 'components/DataModelExplorer.tsx',
        description: 'Explorer widget visualising recon-ng data models for simulations.',
      },
      {
        path: 'components/ModulePlanner.tsx',
        description: 'Module planner UI wired into the desktop Recon-ng window.',
      },
    ],
  ],
  [
    'todoist',
    [
      {
        path: 'components/KanbanBoard.tsx',
        description: 'Task board component rendered by the Todoist-style productivity app.',
      },
      {
        path: 'utils/recurringParser.ts',
        description: 'Date parsing utility that powers recurring task scheduling.',
      },
    ],
  ],
]);

function getTitle(dir) {
  if (TITLE_OVERRIDES.has(dir)) return TITLE_OVERRIDES.get(dir);
  const cleaned = dir.replace(/_/g, ' ').replace(/-/g, ' ');
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getCategory(dir) {
  return CATEGORY_MAP.get(dir) || 'utility';
}

function loadConfigIds() {
  if (!fs.existsSync(CONFIG_PATH)) return [];
  const content = fs.readFileSync(CONFIG_PATH, 'utf8');
  return Array.from(content.matchAll(/id:\s*'([^']+)'/g)).map(([, id]) => id);
}

function findConfigId(dir, ids) {
  const variants = [
    dir,
    dir.toLowerCase(),
    dir.replace(/_/g, '-'),
    dir.replace(/_/g, ''),
    dir.replace(/-/g, '_'),
  ];
  return (
    ids.find((id) => {
      const lower = id.toLowerCase();
      return variants.some((variant) => variant.toLowerCase() === lower);
    }) || null
  );
}

function findSlugs(dir) {
  if (!fs.existsSync(PAGES_DIR)) return [];
  const matches = new Set();
  const patterns = [
    `../../apps/${dir}`,
    `../../../apps/${dir}`,
    `../../apps/${dir}/`,
    `../../../apps/${dir}/`,
  ];
  for (const entry of fs.readdirSync(PAGES_DIR)) {
    const full = path.join(PAGES_DIR, entry);
    if (fs.statSync(full).isDirectory()) {
      for (const file of fs.readdirSync(full)) {
        const fp = path.join(full, file);
        const text = fs.readFileSync(fp, 'utf8');
        if (patterns.some((p) => text.includes(p))) {
          const rel = path.relative(PAGES_DIR, fp);
          matches.add(rel.replace(/\\/g, '/'));
        }
      }
    } else {
      const text = fs.readFileSync(full, 'utf8');
      if (patterns.some((p) => text.includes(p))) {
        const rel = path.relative(PAGES_DIR, full);
        matches.add(rel.replace(/\\/g, '/'));
      }
    }
  }
  return Array.from(matches)
    .map((slug) => slug.replace(/index\.(jsx|tsx)$/, '').replace(/\.(jsx|tsx)$/, ''))
    .filter(Boolean);
}

function defaultEntries(dir) {
  if (ENTRY_OVERRIDES.has(dir)) {
    return ENTRY_OVERRIDES.get(dir);
  }
  const entries = [];
  const tsx = path.join(APPS_DIR, dir, 'index.tsx');
  const jsx = path.join(APPS_DIR, dir, 'index.jsx');
  const js = path.join(APPS_DIR, dir, 'index.js');
  const html = path.join(APPS_DIR, dir, 'index.html');
  if (fs.existsSync(tsx)) {
    entries.push({
      path: 'index.tsx',
      description: 'React entry point that renders the standalone experience.',
    });
  } else if (fs.existsSync(jsx)) {
    entries.push({
      path: 'index.jsx',
      description: 'React entry point that renders the standalone experience.',
    });
  } else if (fs.existsSync(js)) {
    entries.push({
      path: 'index.js',
      description: 'Vanilla JavaScript entry used by the standalone view.',
    });
  } else if (fs.existsSync(html)) {
    entries.push({
      path: 'index.html',
      description: 'Static prototype bundled with the repository for reference.',
    });
  }
  return entries;
}

function buildPurpose(dir, title) {
  const category = getCategory(dir);
  const baseBuilder = CATEGORY_PURPOSE[category] || CATEGORY_PURPOSE.utility;
  const base = baseBuilder(title);
  const note = NOTES.get(dir);
  return note ? `${base} ${note}` : base;
}

function buildEntrySection(entries, slugs, configId) {
  const lines = [];
  for (const entry of entries) {
    lines.push(`- \`${entry.path}\` — ${entry.description}`);
  }
  for (const slug of slugs) {
    lines.push(
      `- \`pages/apps/${slug}.jsx\` — Next.js wrapper that dynamically imports this folder for the \`/apps/${slug}\` route.`,
    );
  }
  if (configId) {
    lines.push(
      `- \`apps.config.js\` — registers the \`${configId}\` tile so the desktop launcher opens the shared window component.`,
    );
  }
  return lines.join('\n');
}

function buildLocalSection(dir, title, slugs) {
  const steps = [];
  steps.push('`yarn dev`');
  if (slugs.length) {
    const normalizedDir = dir.replace(/_/g, '-').toLowerCase();
    let preferred = slugs[0];
    for (const slug of slugs) {
      const normalizedSlug = slug.replace(/_/g, '-').toLowerCase();
      const segments = normalizedSlug.split('/');
      const last = segments[segments.length - 1];
      if (normalizedSlug === normalizedDir || last === normalizedDir) {
        preferred = slug;
        break;
      }
    }
    steps.push(`Visit \`http://localhost:3000/apps/${preferred}\` or open the “${title}” tile from the app grid.`);
  } else {
    steps.push('Open `http://localhost:3000` and launch the app from the desktop grid.');
  }
  return `1. ${steps[0]}\n2. ${steps[1]}`;
}

function buildReadme(dir, ids) {
  const title = getTitle(dir);
  const configId = findConfigId(dir, ids);
  const slugs = findSlugs(dir);
  const entries = defaultEntries(dir);
  const purpose = buildPurpose(dir, title);
  const entrySection = buildEntrySection(entries, slugs, configId);
  const localSection = buildLocalSection(dir, title, slugs);

  return `# ${title}\n\n## Purpose\n${purpose}\n\n## Entry Points\n${entrySection}\n\n## Local Development\n${localSection}\n\n## Owner\n- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)\n`;
}

function ensureReadmes() {
  const ids = loadConfigIds();
  const dirs = fs
    .readdirSync(APPS_DIR)
    .filter((name) => fs.statSync(path.join(APPS_DIR, name)).isDirectory())
    .sort();
  for (const dir of dirs) {
    const readmePath = path.join(APPS_DIR, dir, 'README.md');
    const content = buildReadme(dir, ids);
    fs.writeFileSync(readmePath, `${content}`);
  }
}

ensureReadmes();

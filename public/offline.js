/* eslint-disable no-top-level-window/no-top-level-window-or-document */
(function initializeOfflinePage(globalScope) {
  const scope = globalScope || (typeof window !== 'undefined' ? window : undefined);
  if (!scope) {
    return;
  }

  const APP_NAME_OVERRIDES = {
    terminal: 'Terminal',
    weather: 'Weather Dashboard',
    'weather_widget': 'Weather Widget',
    'sticky_notes': 'Sticky Notes',
    'subnet-calculator': 'Subnet Calculator',
    'resource-monitor': 'Resource Monitor',
    'clipboard_manager': 'Clipboard Manager',
    'project-gallery': 'Project Gallery',
    'security-tools': 'Security Tools',
    quote: 'Daily Quotes',
    converter: 'Unit Converter',
    calculator: 'Calculator',
    'timer_stopwatch': 'Timer & Stopwatch',
    todoist: 'Task Board',
    qr: 'QR Tool',
    http: 'HTTP Request Builder',
    ssh: 'SSH Command Builder',
    'html-rewriter': 'HTML Rewriter',
    'input-lab': 'Input Lab',
    'radare2': 'Radare2 Lab',
    'metasploit-post': 'Metasploit Post Exploitation',
    metasploit: 'Metasploit Console',
    hydra: 'Hydra Brute-Force Trainer',
    hashcat: 'Hashcat Practice Lab',
    mimikatz: 'Mimikatz Walkthrough',
    'mimikatz/offline': 'Mimikatz Offline Suite',
    checkers: 'Checkers',
    tetris: 'Tetris',
    '2048': '2048',
    snake: 'Snake',
    sudoku: 'Sudoku',
    solitaire: 'Solitaire',
    'tower-defense': 'Tower Defense',
    'space-invaders': 'Space Invaders',
    pinball: 'Pinball',
    blackjack: 'Blackjack',
    hangman: 'Hangman',
    minesweeper: 'Minesweeper',
    pong: 'Pong',
    pacman: 'Pacman',
    frogger: 'Frogger',
    breakout: 'Breakout',
    'connect-four': 'Connect Four',
    'word-search': 'Word Search',
    wordle: 'Wordle',
    gomoku: 'Gomoku',
    reversi: 'Reversi',
    battleship: 'Battleship',
    simon: 'Simon',
    sokoban: 'Sokoban',
    'lane-runner': 'Lane Runner',
    'car-racer': 'Car Racer',
    asteroids: 'Asteroids',
  };

  const APP_DESCRIPTIONS = {
    terminal: 'Replay simulated CLI missions and review saved command history.',
    weather: 'Check cached forecasts and satellite snapshots gathered earlier.',
    'sticky_notes': 'Review your pinned notes or draft new findings for later sync.',
    'subnet-calculator': 'Map out lab networks using the stored subnet planner.',
    'resource-monitor': 'Inspect the latest resource metrics captured in your session.',
    calculator: 'Crunch numbers without a network dependency.',
    converter: 'Convert units locally using the offline-ready converter.',
    qr: 'Generate QR payloads and share them when you reconnect.',
    quote: 'Cycle through the cached inspiration feed.',
    checkers: 'Keep the streak alive with an offline match.',
    tetris: 'Stack tetrominoes and chase your personal best offline.',
    snake: 'Sharpen your reflexes in the retro grid arena.',
    minesweeper: 'Sweep the board to stay sharp between engagements.',
    sudoku: 'Solve a puzzle and keep your logic skills fresh.',
    'project-gallery': 'Revisit past case studies stored on this device.',
    'security-tools': 'Browse the toolkit reference without leaving lab mode.',
  };

  const CATEGORY_OVERRIDES = {
    terminal: 'tools',
    weather: 'reference',
    'weather_widget': 'reference',
    'sticky_notes': 'tools',
    'subnet-calculator': 'tools',
    'resource-monitor': 'tools',
    'clipboard_manager': 'tools',
    'project-gallery': 'reference',
    'security-tools': 'reference',
    quote: 'reference',
    converter: 'tools',
    calculator: 'tools',
    'timer_stopwatch': 'tools',
    todoist: 'tools',
    qr: 'tools',
    http: 'tools',
    ssh: 'tools',
    'html-rewriter': 'tools',
    'input-lab': 'tools',
    'radare2': 'reference',
    metasploit: 'reference',
    'metasploit-post': 'reference',
    hydra: 'reference',
    hashcat: 'reference',
    mimikatz: 'reference',
    'mimikatz/offline': 'reference',
  };

  const TOOL_KEYWORDS = [
    'calc',
    'note',
    'tool',
    'monitor',
    'terminal',
    'builder',
    'widget',
    'manager',
    'resource',
    'qr',
    'timer',
    'http',
    'ssh',
    'clipboard',
    'input',
    'lab',
    'subnet',
    'weather',
    'resource',
  ];

  const GAME_KEYWORDS = [
    'game',
    '2048',
    'snake',
    'tetris',
    'sudoku',
    'chess',
    'checkers',
    'hangman',
    'frogger',
    'flappy',
    'minesweeper',
    'pong',
    'pacman',
    'memory',
    'solitaire',
    'tower',
    'runner',
    'platformer',
    'pinball',
    'gomoku',
    'reversi',
    'battleship',
    'blackjack',
    'breakout',
    'candy',
    'word',
    'simon',
    'sokoban',
    'nonogram',
    'racer',
    'invaders',
    'defense',
  ];

  const REFERENCE_KEYWORDS = [
    'report',
    'gallery',
    'project',
    'security',
    'guide',
    'vault',
    'evidence',
    'catalog',
    'reference',
    'quote',
  ];

  const SUGGESTION_LIBRARY = {
    tools: {
      category: 'tools',
      title: 'Keep working with offline simulators',
      description: 'These utilities run entirely in the browser so you can continue practicing while disconnected.',
      items: [
        { label: 'Re-run saved terminal missions to stay sharp.', href: '/apps/terminal' },
        { label: 'Capture findings in Sticky Notes and sync later.', href: '/apps/sticky_notes' },
        { label: 'Design lab networks with the Subnet Calculator.', href: '/apps/subnet-calculator' },
      ],
    },
    games: {
      category: 'games',
      title: 'Take a break with cached arcade classics',
      description: 'Offline-friendly games are cached for quick practice sessions.',
      items: [
        { label: 'Challenge yourself in Checkers or Gomoku.', href: '/apps/checkers' },
        { label: 'Speed-run 2048 or Tetris between syncs.', href: '/apps/2048' },
        { label: 'Sharpen pattern spotting with Minesweeper.', href: '/apps/minesweeper' },
      ],
    },
    reference: {
      category: 'reference',
      title: 'Review saved research and briefings',
      description: 'Reference modules stay accessible so you can plan your next move.',
      items: [
        { label: 'Browse the Security Tools catalog.', href: '/apps/security-tools' },
        { label: 'Revisit the Project Gallery for past case studies.', href: '/apps/project-gallery' },
        { label: 'Load the Quote widget for quick inspiration.', href: '/apps/quote' },
      ],
    },
    general: {
      category: 'general',
      title: 'Make the most of offline mode',
      description: 'Cached content remains available until you reconnect to sync live dashboards.',
      items: [
        { label: 'Once back online, refresh to resume data sync.' },
        { label: 'Pin any critical apps while online to keep them cached.' },
        { label: 'Open the notification center to review the latest activity.' },
      ],
    },
  };

  const DEFAULT_SUGGESTION_ORDER = ['tools', 'games', 'reference'];

  const shouldSkipPath = (path) => /\.(?:js|json|map|css|wasm)$/i.test(path);

  const toTitleCase = (value) =>
    value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const normalizePath = (path) => {
    if (!path) return path;
    let normalized = path;
    normalized = normalized.replace(/\/?index\.html?$/i, '');
    normalized = normalized.replace(/\/?index$/i, '');
    if (normalized.endsWith('/') && normalized !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  };

  const normalizeSlug = (slug) => {
    if (!slug) return '';
    const cleaned = slug.replace(/^\/+|\/+$/g, '');
    const [root] = cleaned.split('/');
    return (root || cleaned).toLowerCase();
  };

  const categorizeSlug = (slug) => {
    const normalized = normalizeSlug(slug);
    if (!normalized) return 'general';
    if (CATEGORY_OVERRIDES[normalized]) return CATEGORY_OVERRIDES[normalized];
    if (GAME_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'games';
    if (TOOL_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'tools';
    if (REFERENCE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'reference';
    return 'general';
  };

  const displayNameFor = (slug) => {
    const normalized = normalizeSlug(slug);
    if (!normalized) return 'App';
    return APP_NAME_OVERRIDES[normalized] || toTitleCase(normalized);
  };

  const descriptionFor = (slug, category) => {
    const normalized = normalizeSlug(slug);
    if (APP_DESCRIPTIONS[normalized]) return APP_DESCRIPTIONS[normalized];
    if (category === 'games') {
      return 'Launch an offline-friendly game to stay sharp.';
    }
    if (category === 'tools') {
      return 'This utility is cached locally for offline use.';
    }
    if (category === 'reference') {
      return 'Review saved intel and documentation while offline.';
    }
    return 'Cached experience ready to open when you need it.';
  };

  const toAppMetadata = (path) => {
    if (typeof path !== 'string' || !path.startsWith('/apps/') || shouldSkipPath(path)) {
      return null;
    }
    const normalizedPath = normalizePath(path);
    const slug = normalizeSlug(normalizedPath.slice('/apps/'.length));
    if (!slug) return null;
    const category = categorizeSlug(slug);
    return {
      url: normalizedPath,
      slug,
      category,
      name: displayNameFor(slug),
      description: descriptionFor(slug, category),
    };
  };

  const collectCachedApps = async (cacheStorage) => {
    const apps = new Map();
    if (!cacheStorage || typeof cacheStorage.keys !== 'function') {
      return [];
    }

    const names = await cacheStorage.keys();
    for (const cacheName of names) {
      try {
        const cache = await cacheStorage.open(cacheName);
        const requests = await cache.keys();
        for (const request of requests) {
          const url = new URL(request.url);
          const meta = toAppMetadata(url.pathname);
          if (meta && !apps.has(meta.slug)) {
            apps.set(meta.slug, meta);
          }
        }
      } catch (err) {
        console.warn('Unable to inspect cache', cacheName, err);
      }
    }

    return Array.from(apps.values());
  };

  const clearChildren = (node) => {
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  };

  const renderCachedApps = (listElement, apps) => {
    if (!listElement) return;
    clearChildren(listElement);
    const doc = listElement.ownerDocument;

    if (!apps.length) {
      const item = doc.createElement('li');
      item.className = 'empty-state';
      item.textContent = 'No cached apps yet. Launch an app while online to make it available offline.';
      listElement.appendChild(item);
      return;
    }

    const sorted = apps.slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const app of sorted) {
      const li = doc.createElement('li');
      li.setAttribute('role', 'listitem');
      const anchor = doc.createElement('a');
      anchor.href = app.url;
      anchor.textContent = app.name;
      anchor.rel = 'noopener';
      li.appendChild(anchor);
      if (app.description) {
        const details = doc.createElement('span');
        details.className = 'cached-app-description';
        details.textContent = app.description;
        li.appendChild(details);
      }
      listElement.appendChild(li);
    }
  };

  const createSuggestionCard = (doc, config) => {
    const card = doc.createElement('article');
    card.className = 'suggestion-card';
    card.setAttribute('role', 'listitem');

    const title = doc.createElement('h3');
    title.textContent = config.title;
    card.appendChild(title);

    const description = doc.createElement('p');
    description.textContent = config.description;
    card.appendChild(description);

    const list = doc.createElement('ul');
    for (const item of config.items) {
      const li = doc.createElement('li');
      if (item.href) {
        const link = doc.createElement('a');
        link.href = item.href;
        link.textContent = item.label;
        link.rel = 'noopener';
        li.appendChild(link);
      } else {
        li.textContent = item.label;
      }
      if (item.detail) {
        const detail = doc.createElement('span');
        detail.className = 'suggestion-detail';
        detail.textContent = ` ${item.detail}`;
        li.appendChild(detail);
      }
      list.appendChild(li);
    }
    card.appendChild(list);
    return card;
  };

  const renderSuggestions = (container, categories) => {
    if (!container) return;
    clearChildren(container);
    const doc = container.ownerDocument;

    const prioritized = [];
    categories.forEach((category) => {
      if (category && category !== 'general' && SUGGESTION_LIBRARY[category]) {
        prioritized.push(category);
      }
    });

    const order = [...new Set([...prioritized, ...DEFAULT_SUGGESTION_ORDER])];
    if (!order.includes('general')) {
      order.push('general');
    }

    for (const key of order) {
      const config = SUGGESTION_LIBRARY[key];
      if (!config) continue;
      const card = createSuggestionCard(doc, config);
      container.appendChild(card);
    }
  };

  const updateStatus = (statusNode) => {
    if (!statusNode) return;
    const online = typeof scope.navigator !== 'undefined' ? scope.navigator.onLine !== false : false;
    statusNode.textContent = online
      ? 'Back online — reload to resume live data.'
      : 'Offline mode';
  };

  let initialized = false;
  const bootstrap = async () => {
    if (initialized) {
      return;
    }
    const doc = scope.document;
    if (!doc) return;

    initialized = true;

    const retry = doc.getElementById('retry');
    const appsList = doc.getElementById('apps');
    const suggestionsContainer = doc.getElementById('suggestion-groups');
    const statusNode = doc.getElementById('offline-status');

    if (retry && scope.location && typeof scope.location.reload === 'function') {
      retry.addEventListener('click', () => {
        scope.location.reload();
      });
    }

    updateStatus(statusNode);
    if (scope.addEventListener) {
      scope.addEventListener('online', () => updateStatus(statusNode));
      scope.addEventListener('offline', () => updateStatus(statusNode));
    }

    let cachedApps = [];
    if (scope.caches && appsList) {
      try {
        cachedApps = await collectCachedApps(scope.caches);
      } catch (err) {
        console.warn('Unable to read cached apps', err);
        const item = doc.createElement('li');
        item.className = 'empty-state';
        item.textContent = 'Unable to access cached apps on this browser.';
        clearChildren(appsList);
        appsList.appendChild(item);
      }
    }

    if (appsList && cachedApps.length) {
      renderCachedApps(appsList, cachedApps);
    } else if (appsList && !appsList.hasChildNodes()) {
      renderCachedApps(appsList, []);
    }

    if (suggestionsContainer) {
      const categories = new Set(cachedApps.map((app) => app.category));
      renderSuggestions(suggestionsContainer, categories);
    }
  };

  const runtime = {
    categorizeSlug,
    displayNameFor,
    descriptionFor,
    collectCachedApps,
    renderCachedApps,
    renderSuggestions,
    normalizePath,
    init: bootstrap,
  };

  if (typeof scope.document !== 'undefined') {
    const readyState = scope.document.readyState;
    if (readyState === 'complete' || readyState === 'interactive') {
      Promise.resolve().then(() => bootstrap()).catch((err) => {
        console.error('Failed to bootstrap offline page', err);
      });
    } else {
      scope.document.addEventListener('DOMContentLoaded', () => {
        Promise.resolve().then(() => bootstrap()).catch((err) => {
          console.error('Failed to bootstrap offline page', err);
        });
      });
    }
  }

  if (typeof scope === 'object') {
    scope.__OFFLINE_PAGE__ = runtime;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined);

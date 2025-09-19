(function () {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category') || 'general';
  const attemptedUrlParam = params.get('from');

  const CATEGORY_COPY = {
    general: {
      label: 'Portfolio',
      title: 'You are offline',
      subtitle: 'The desktop experience is still available with limited functionality.',
      description: 'Cached applications from every category appear below when available.',
      empty: 'Visit apps while online to make them available for offline use.',
      tips: [
        'Toggle the browser\'s offline simulator off in DevTools once you finish testing.',
        'Verify that airplane mode or VPN tools on your host machine are disabled.',
        'Use the Retry button after confirming connectivity to reload the requested app.',
      ],
    },
    desktop: {
      label: 'Desktop apps',
      title: 'Desktop workspace unavailable offline',
      subtitle: 'Utilities like the terminal and notes app need a connection for live data sync.',
      description: 'Previously opened desktop apps are listed here when cached on this device.',
      empty: 'Open a desktop app while online to save a working copy for offline diagnostics.',
      tips: [
        'Check whether a corporate VPN or proxy is blocking the request.',
        'If you use a custom DNS configuration, verify that it resolves internal APIs.',
        'Refresh once you have a stable connection to restore the desktop workspace.',
      ],
    },
    simulators: {
      label: 'Security simulators',
      title: 'Simulators need connectivity',
      subtitle: 'Lab scenarios stream fixture data that is cached only after an initial sync.',
      description: 'Cached simulators show up when their data fixtures are stored locally.',
      empty: 'Launch a simulator while online so its demo data becomes available offline.',
      tips: [
        'Confirm that you are running the portfolio in demo/lab mode only.',
        'Disable browser extensions that block indexedDB or service worker storage.',
        'Retry after connectivity returns to reload the interactive simulator.',
      ],
    },
    games: {
      label: 'Retro games',
      title: 'Games paused while offline',
      subtitle: 'Game canvases rely on cached bundles. Load them once online to play offline.',
      description: 'Games that are ready offline appear below and can launch without a network.',
      empty: 'Open a game while connected to cache it for offline play.',
      tips: [
        'Close other heavy tabs so the browser keeps cached assets available.',
        'Verify the PWA install permissions are granted to store save data locally.',
        'Once you are back online, refresh to resume high score syncing.',
      ],
    },
  };

  const GAME_IDS = [
    '2048',
    'asteroids',
    'battleship',
    'blackjack',
    'breakout',
    'car-racer',
    'lane-runner',
    'checkers',
    'chess',
    'connect-four',
    'frogger',
    'hangman',
    'memory',
    'minesweeper',
    'pacman',
    'platformer',
    'pong',
    'reversi',
    'simon',
    'snake',
    'sokoban',
    'solitaire',
    'tictactoe',
    'tetris',
    'tower-defense',
    'word-search',
    'wordle',
    'flappy-bird',
    'candy-crush',
    'gomoku',
    'pinball',
    'sudoku',
    'space-invaders',
    'nonogram',
  ];

  const SIMULATOR_IDS = [
    'beef',
    'ettercap',
    'ble-sensor',
    'metasploit',
    'wireshark',
    'kismet',
    'nikto',
    'autopsy',
    'plugin-manager',
    'reaver',
    'nessus',
    'ghidra',
    'mimikatz',
    'mimikatz/offline',
    'ssh',
    'http',
    'html-rewriter',
    'hydra',
    'nmap-nse',
    'radare2',
    'volatility',
    'hashcat',
    'msf-post',
    'evidence-vault',
    'dsniff',
    'john',
    'openvas',
    'recon-ng',
    'security-tools',
  ];

  const gameSet = new Set(GAME_IDS);
  const simulatorSet = new Set(SIMULATOR_IDS);

  const copy = CATEGORY_COPY[category] || CATEGORY_COPY.general;
  document.title = `Offline — ${copy.label}`;

  const titleEl = document.getElementById('offline-title');
  const subtitleEl = document.getElementById('offline-subtitle');
  const descEl = document.getElementById('cached-description');
  const tipsEl = document.getElementById('tips');
  const statusEl = document.getElementById('status-banner');
  const contextEl = document.getElementById('offline-context');

  titleEl.textContent = copy.title;
  subtitleEl.textContent = copy.subtitle;
  descEl.textContent = copy.description;

  tipsEl.innerHTML = '';
  copy.tips.forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    tipsEl.appendChild(li);
  });

  function formatSegment(segment) {
    return segment
      .split('-')
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ''))
      .join(' ');
  }

  function labelForCategory(cat) {
    if (cat === 'games') return 'Game';
    if (cat === 'simulators') return 'Simulator';
    return 'Desktop';
  }

  function normaliseKey(path) {
    return path.replace(/^\/+/, '').replace(/\/index$/, '');
  }

  function describeAttempt() {
    try {
      const storedAttempt = localStorage.getItem('pwa:last-attempt') || '';
      const candidate = attemptedUrlParam || storedAttempt;
      if (!candidate) return '';
      const url = candidate.startsWith('http') ? new URL(candidate) : new URL(candidate, window.location.origin);
      if (!url.pathname.startsWith('/apps')) {
        return `Last route requested: ${url.pathname}`;
      }
      const key = normaliseKey(url.pathname.replace(/^\/apps\//, ''));
      if (!key) return `Last route requested: ${url.pathname}`;
      const segments = key.split('/').map(formatSegment);
      return `Last attempted app: ${segments.join(' › ')}`;
    } catch (err) {
      console.error('Unable to read last attempt', err);
      return '';
    }
  }

  const attemptText = describeAttempt();
  contextEl.textContent = attemptText || `Category: ${copy.label}`;

  function updateStatusBanner() {
    statusEl.textContent = navigator.onLine ? 'Connection detected' : 'Offline mode active';
  }

  updateStatusBanner();
  window.addEventListener('online', updateStatusBanner);
  window.addEventListener('offline', updateStatusBanner);

  const diagnosticsEl = document.getElementById('diagnostics');
  const appsEl = document.getElementById('apps');

  function addDiagnostic(label, value) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    diagnosticsEl.appendChild(dt);
    diagnosticsEl.appendChild(dd);
  }

  function readLocal(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function formatDate(value) {
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString();
    } catch {
      return value;
    }
  }

  function categorizeApp(key) {
    const primary = key.split('/')[0];
    if (gameSet.has(primary) || gameSet.has(key)) return 'games';
    if (simulatorSet.has(primary) || simulatorSet.has(key)) return 'simulators';
    return 'desktop';
  }

  function formatLabel(key) {
    const segments = key.split('/').map(formatSegment);
    return segments.join(' › ');
  }

  async function collectCachedApps() {
    if (!('caches' in window)) return [];
    const seen = new Map();
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        requests.forEach((request) => {
          try {
            const url = new URL(request.url);
            if (!url.pathname.startsWith('/apps/')) return;
            if (url.pathname.endsWith('.js') || url.pathname.includes('.worker')) return;
            const key = normaliseKey(url.pathname.replace(/^\/apps\//, ''));
            if (!key || key.includes('.')) return;
            if (!seen.has(key)) {
              const categoryForApp = categorizeApp(key);
              seen.set(key, {
                key,
                path: `/apps/${key}`,
                label: formatLabel(key),
                category: categoryForApp,
              });
            }
          } catch (err) {
            console.warn('Failed to inspect cached request', err);
          }
        });
      }),
    );
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  async function populateApps() {
    appsEl.innerHTML = '';
    try {
      const apps = await collectCachedApps();
      const relevant =
        category === 'general' ? apps : apps.filter((app) => app.category === category);

      if (relevant.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = copy.empty;
        appsEl.appendChild(empty);
        return;
      }

      relevant.forEach((app) => {
        const li = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = app.label;
        li.appendChild(name);

        const link = document.createElement('a');
        link.href = app.path;
        link.textContent = app.path;
        li.appendChild(link);

        if (category === 'general') {
          const chip = document.createElement('span');
          chip.textContent = `${labelForCategory(app.category)} app`;
          li.appendChild(chip);
        }

        appsEl.appendChild(li);
      });
    } catch (err) {
      const failure = document.createElement('li');
      failure.textContent = 'Unable to read cached applications.';
      appsEl.appendChild(failure);
      console.error('Failed to enumerate caches', err);
    }
  }

  async function runDiagnostics() {
    diagnosticsEl.innerHTML = '';

    addDiagnostic('Status', navigator.onLine ? 'Online' : 'Offline');
    addDiagnostic('Checked at', new Date().toLocaleString());

    const lastOnline = readLocal('pwa:last-online');
    if (lastOnline) addDiagnostic('Last online', formatDate(lastOnline));

    const lastRoute = readLocal('pwa:last-route');
    if (lastRoute) addDiagnostic('Last completed page', lastRoute);

    const attempt = readLocal('pwa:last-attempt');
    if (attempt) addDiagnostic('Last attempted route', attempt);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.effectiveType) {
      addDiagnostic('Connection type', connection.effectiveType);
    }

    const swActive = navigator.serviceWorker?.controller ? 'Active' : 'Unavailable';
    addDiagnostic('Service worker', swActive);

    await populateApps();
  }

  const retryBtn = document.getElementById('retry');
  retryBtn.addEventListener('click', () => {
    window.location.reload();
  });

  const diagnosticsBtn = document.getElementById('run-diagnostics');
  diagnosticsBtn.addEventListener('click', () => {
    runDiagnostics().catch((err) => {
      console.error('Diagnostics failed', err);
    });
  });

  runDiagnostics().catch((err) => {
    console.error('Initial diagnostics failed', err);
  });
})();

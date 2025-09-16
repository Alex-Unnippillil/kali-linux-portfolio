import type { Metadata } from 'next';

const SITE_URL = 'https://unnippillil.com';
const SITE_NAME = 'Kali Linux Portfolio';
const DEFAULT_DESCRIPTION =
  "Alex Unnippillil's Kali Linux–inspired portfolio desktop featuring simulated security tooling, productivity utilities, and retro games.";

const DEFAULT_SOCIAL_IMAGE = {
  url: '/images/logos/logo_1200.png',
  width: 1200,
  height: 630,
  alt: 'Alex Unnippillil Portfolio social preview',
};

const DEFAULT_TWITTER_IMAGE = '/images/logos/logo_1024.png';

const BASE_KEYWORDS = [
  'Alex Unnippillil',
  "Alex Unnippillil portfolio",
  'Kali Linux portfolio',
  'Linux desktop portfolio',
  'Cybersecurity portfolio',
  'Alex Linux',
  'Alex Unnippillil Kali',
];

const baseOpenGraph: NonNullable<Metadata['openGraph']> = {
  type: 'website',
  locale: 'en_CA',
  siteName: 'Alex Unnippillil Portfolio',
  url: SITE_URL,
  images: [DEFAULT_SOCIAL_IMAGE],
};

const baseTwitter: NonNullable<Metadata['twitter']> = {
  card: 'summary',
  creator: '@unnippillil',
  site: '@alexunnippillil',
  images: [DEFAULT_TWITTER_IMAGE],
};

const baseRobots: NonNullable<Metadata['robots']> = {
  index: true,
  follow: true,
};

type PageMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  keywords?: string[];
  robots?: Metadata['robots'];
};

const routeMetadata: Record<string, PageMetadataOptions> = {
  '/': {
    description: DEFAULT_DESCRIPTION,
  },
  '/apps': {
    title: 'App Launcher',
    description:
      'Browse every simulation, utility, and retro game available on the Kali Linux Portfolio desktop.',
  },
  '/daily-quote': {
    title: 'Daily Quote Generator',
    description:
      'Capture inspirational quotes, export shareable cards, and send them to social apps without leaving the desktop.',
  },
  '/dummy-form': {
    title: 'Offline Contact Form Demo',
    description:
      'Test the queued contact form flow with local persistence, validation, and mock API submissions.',
  },
  '/gamepad-calibration': {
    title: 'Gamepad Calibration Lab',
    description:
      'Visualize controller input, remap bindings, and test haptic feedback in the in-browser calibration suite.',
  },
  '/games/blackjack': {
    title: 'Blackjack Table',
    description:
      'Practice casino-style blackjack with hints, scoring helpers, and a virtual dealer.',
  },
  '/games/blackjack/trainer': {
    title: 'Blackjack Trainer',
    description:
      'Step through blackjack strategy drills with move suggestions and probability callouts.',
  },
  '/games/breakout/editor': {
    title: 'Breakout Level Editor',
    description:
      'Design Breakout stages with a drag-and-drop editor and instantly play-test your layout.',
  },
  '/hook-flow': {
    title: 'React Hook Flow',
    description:
      'Review the lifecycle of React hooks with consent-gated diagrams and curated documentation links.',
  },
  '/hydra-preview': {
    title: 'Hydra Command Builder',
    description:
      'Assemble legal, permission-only Hydra commands through a step-by-step guided wizard.',
  },
  '/input-hub': {
    title: 'Input Hub',
    description:
      'Queue contact requests, replay Web Share Target payloads, and send offline drafts through EmailJS.',
  },
  '/keyboard-reference': {
    title: 'Keyboard Reference',
    description:
      'Quickly look up the desktop’s keyboard shortcuts for navigation, clipboard actions, and window management.',
  },
  '/module-workspace': {
    title: 'Module Workspace',
    description:
      'Plan simulated offensive modules, stage inputs, and review persisted transcripts in a safe sandbox.',
  },
  '/nessus-dashboard': {
    title: 'Nessus Dashboard',
    description:
      'Summarize mock Nessus scans with bar charts tracking queued jobs and triaged false positives.',
  },
  '/nessus-report': {
    title: 'Sample Nessus Report',
    description:
      'Inspect a canned Nessus JSON export with severity filters, host pivots, and CSV downloads.',
  },
  '/network-topology': {
    title: 'Network Topology Demo',
    description:
      'Toggle mitigation states on an animated attacker-to-server topology to illustrate layered defenses.',
  },
  '/nikto-report': {
    title: 'Nikto Report Walkthrough',
    description:
      'Review a guided Nikto web scanner report with severity filters and export helpers.',
  },
  '/notes': {
    title: 'Supabase Notes Probe',
    description:
      'Exercise the Supabase integration that fetches demo notes when environment keys are configured.',
  },
  '/popular-modules': {
    title: 'Popular Modules',
    description:
      'Browse hand-picked Metasploit-style modules with descriptions and usage guidance for the simulator.',
  },
  '/post_exploitation': {
    title: 'Metasploit Post Exploitation',
    description:
      'Explore sanitized post-exploitation modules, filter by capability tags, and copy sample transcripts.',
  },
  '/profile': {
    title: 'Timeline Profile',
    description:
      'Scroll through Alex Unnippillil’s milestone timeline sourced from the portfolio’s desktop shell.',
  },
  '/qr': {
    title: 'QR Workbench',
    description:
      'Generate Wi-Fi, URL, and vCard QR codes or scan codes with the camera to store recent results.',
  },
  '/qr/vcard': {
    title: 'vCard QR Generator',
    description:
      'Create downloadable PNG or SVG QR codes from contact details using the vCard format.',
  },
  '/recon/graph': {
    title: 'Recon-ng Graph',
    description:
      'Visualize a sample Recon-ng workspace graph with interactive relationship explorers.',
  },
  '/security-education': {
    title: 'Security Education Hub',
    description:
      'Review curated resources on using Kali Linux responsibly, backed by official guidance and workflows.',
  },
  '/sekurlsa_logonpasswords': {
    title: 'sekurlsa::logonpasswords Demo',
    description:
      'Inspect a mock Mimikatz logonpasswords output with contextual explanations and copy helpers.',
  },
  '/share-target': {
    title: 'Share Target Bridge',
    description:
      'Receive Web Share Target payloads and forward attachments, text, and URLs into the Input Hub queue.',
  },
  '/spoofing': {
    title: 'ARP Spoofing Visualizer',
    description:
      'Step through ARP spoofing concepts with animated diagrams and mitigation toggles.',
  },
  '/video-gallery': {
    title: 'Video Gallery',
    description:
      'Stream curated security talks and walkthroughs inside the Kali Linux Portfolio media viewer.',
  },
  '/wps-attack': {
    title: 'WPS Attack Planner',
    description:
      'Simulate a Wi-Fi Protected Setup audit with attack phases, mitigation callouts, and safety reminders.',
  },
  '/admin/messages': {
    title: 'Admin Messages',
    description:
      'Debug inbound contact form payloads and EmailJS status updates inside the admin console.',
  },
  '/ui/settings/theme': {
    title: 'Theme Settings',
    description:
      'Switch between desktop themes, adjust icon scales, and persist preferences in local storage.',
  },
  '/games/breakout': {
    title: 'Breakout Arcade',
    description:
      'Play the classic Breakout arcade game directly within the Kali Linux Portfolio desktop.',
  },
};

const APP_TITLE_OVERRIDES: Record<string, string> = {
  'ascii-art': 'ASCII Art Studio',
  beef: 'BeEF Console',
  contact: 'Contact Desk',
  figlet: 'FIGlet Banner Maker',
  http: 'HTTP Request Builder',
  john: 'John the Ripper Workshop',
  'metasploit-post': 'Metasploit Post Modules',
  metasploit: 'Metasploit Console',
  'mimikatz/offline': 'Mimikatz Offline Lab',
  'nmap-nse': 'Nmap NSE Library',
  qr: 'QR Code Studio',
  settings: 'Desktop Settings',
  'timer_stopwatch': 'Timer & Stopwatch',
  vscode: 'VS Code Workspace',
  weather: 'Weather Dashboard',
  weather_widget: 'Weather Widget',
  wireshark: 'Wireshark Lab',
  x: 'X Timeline',
};

const APP_DESCRIPTION_OVERRIDES: Record<string, string> = {
  'ascii-art':
    'Design layered ASCII art with palette previews, OPFS storage, and export helpers.',
  autopsy:
    'Practice digital forensics triage with canned Autopsy evidence and guided timelines.',
  beef:
    'Explore a simulated Browser Exploitation Framework (BeEF) console with canned commands and safety guardrails.',
  contact:
    'Send EmailJS-powered messages with offline queueing, file attachments, and optional reCAPTCHA.',
  figlet:
    'Create stylized ASCII banners with popular FIGlet fonts and clipboard-friendly exports.',
  http:
    'Compose HTTP requests, tweak headers, and preview curl equivalents in a self-contained builder.',
  'input-lab':
    'Inspect keyboard, pointer, and clipboard events with share integration and OPFS persistence.',
  john:
    'Run curated John the Ripper exercises with sanitized wordlists and walkthrough prompts.',
  kismet:
    'Explore wireless monitoring concepts with a simulated Kismet dashboard and sample captures.',
  metasploit:
    'Walk through a guided Metasploit console with sandboxed commands and transcripts.',
  'metasploit-post':
    'Review post-exploitation modules with interactive options and copyable transcripts.',
  'mimikatz/offline':
    'Study offline credential extraction data with highlighted secrets and cautionary guidance.',
  'nmap-nse':
    'Browse curated Nmap NSE scripts, arguments, and sanitized run logs.',
  'password_generator':
    'Create secure passphrases with entropy indicators and clipboard protections.',
  'phaser_matter':
    'Experiment with Phaser + Matter.js physics scenes and tweak collision settings live.',
  'project-gallery':
    'Showcase shipped projects with lazy-loaded cards, blur-up images, and modal details.',
  qr: 'Generate, scan, and store QR codes directly inside the desktop window.',
  settings:
    'Toggle desktop personalization options without leaving the simulated environment.',
  spotify:
    'Pin a Spotify mini player to the desktop for background playlists and track history.',
  ssh:
    'Assemble safe SSH commands with presets, validation, and one-click copy support.',
  'sticky_notes':
    'Capture quick ideas with themed sticky notes that sync via the Origin Private File System.',
  'timer_stopwatch':
    'Track sessions with a combined countdown timer and stopwatch featuring lap history.',
  vscode:
    'Open a VS Code Web workspace for sandbox editing directly within the portfolio desktop.',
  weather: 'Check multi-day forecasts, radar snapshots, and theme-aware backgrounds.',
  weather_widget:
    'Pin a compact weather widget with quick glances and location toggles.',
  wireshark:
    'Analyze sample PCAPs in a guided Wireshark environment with callouts and filters.',
  x: 'Follow the @Alex-Unnippillil timeline via an embedded X (Twitter) feed and focus mode.',
  volatility:
    'Practice memory forensics tasks with curated Volatility profiles and sample outputs.',
};

const GAME_SLUGS = new Set([
  '2048',
  'blackjack',
  'checkers',
  'connect-four',
  'minesweeper',
  'pinball',
  'simon',
  'sokoban',
  'solitaire',
  'tower-defense',
  'word_search',
]);

const SIMULATION_SLUGS = new Set([
  'autopsy',
  'beef',
  'john',
  'kismet',
  'metasploit',
  'metasploit-post',
  'mimikatz/offline',
  'nmap-nse',
  'volatility',
  'wireshark',
  'http',
  'ssh',
]);

function getAppTitle(slug: string): string {
  const override = APP_TITLE_OVERRIDES[slug];
  if (override) return override;
  const words = slug
    .split('/')
    .flatMap((segment) => segment.split(/[-_]/))
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return words.join(' ');
}

function createGenericAppDescription(slug: string, title: string): string {
  if (SIMULATION_SLUGS.has(slug)) {
    return `Explore a simulated ${title} workflow with sanitized data, educational prompts, and no external targets.`;
  }
  if (GAME_SLUGS.has(slug)) {
    return `Play ${title} inside the Kali Linux Portfolio arcade without leaving the desktop.`;
  }
  return `Launch the ${title} utility inside the Kali Linux Portfolio desktop environment.`;
}

function getAppMetadata(slug: string): PageMetadataOptions {
  const title = getAppTitle(slug);
  const description = APP_DESCRIPTION_OVERRIDES[slug] ?? createGenericAppDescription(slug, title);
  return { title, description };
}

function normalizeRoute(route: string): string {
  if (!route) return '/';
  const trimmed = route.trim();
  if (!trimmed) return '/';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeading === '/' || withLeading === '') return '/';
  return withLeading.replace(/\/+$/, '') || '/';
}

function formatTitle(title?: string): string {
  if (!title) return SITE_NAME;
  if (title.includes(SITE_NAME)) return title;
  return `${title} • ${SITE_NAME}`;
}

function buildMetadata(options: PageMetadataOptions = {}): Metadata {
  const path = options.path ?? '/';
  const canonicalPath = path === '/' ? '/' : path;
  const url = canonicalPath === '/' ? SITE_URL : `${SITE_URL}${canonicalPath}`;
  const title = formatTitle(options.title);
  const description = options.description ?? DEFAULT_DESCRIPTION;
  const keywords = options.keywords
    ? Array.from(new Set([...BASE_KEYWORDS, ...options.keywords]))
    : [...BASE_KEYWORDS];
  const openGraphImages = options.image
    ? [{ ...DEFAULT_SOCIAL_IMAGE, ...options.image }]
    : (baseOpenGraph.images ?? []).map((image) => ({ ...image }));
  const twitterImages = options.image
    ? [options.image.url]
    : [...(baseTwitter.images ?? [DEFAULT_TWITTER_IMAGE])];

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    manifest: '/manifest.webmanifest',
    themeColor: '#0f1317',
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/images/logos/fevicon.svg' },
      ],
      apple: [{ url: '/images/logos/logo.png' }],
    },
    viewport: 'width=device-width, initial-scale=1',
    category: 'Technology',
    other: {
      image: '/images/logos/fevicon.png',
      language: 'English',
    },
    title,
    description,
    alternates: {
      canonical: url,
    },
    keywords,
    authors: [{ name: 'Alex Unnippillil', url: SITE_URL }],
    creator: 'Alex Unnippillil',
    publisher: 'Alex Unnippillil',
    robots: options.robots ?? baseRobots,
    openGraph: {
      ...baseOpenGraph,
      title,
      description,
      url,
      images: openGraphImages,
    },
    twitter: {
      ...baseTwitter,
      title,
      description,
      images: twitterImages,
    },
  };
}

export function getPageMetadata(route: string): Metadata {
  const normalized = normalizeRoute(route);
  const baseOptions = routeMetadata[normalized];
  if (baseOptions) {
    return buildMetadata({ ...baseOptions, path: normalized });
  }
  if (normalized.startsWith('/apps/')) {
    const slug = normalized.slice('/apps/'.length);
    return buildMetadata({ ...getAppMetadata(slug), path: normalized });
  }
  return buildMetadata({ path: normalized });
}

const structuredDataMap: Record<string, unknown> = {
  '/': {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Alex Unnippillil',
    url: SITE_URL,
  },
};

export function getStructuredData(route: string): unknown {
  const normalized = normalizeRoute(route);
  return structuredDataMap[normalized];
}



import projects from '../../data/projects.json';

type ProjectRecord = (typeof projects)[number];

export type SearchCategory = 'page' | 'project' | 'doc';

export type SearchDocument = {
  id: string;
  title: string;
  summary: string;
  url: string;
  category: SearchCategory;
  keywords?: string[];
  icon?: string;
  content?: string;
  boost?: number;
  openInNewTab?: boolean;
};

type PageDefinition = {
  id: string;
  title: string;
  summary: string;
  url: string;
  keywords?: string[];
  icon?: string;
  boost?: number;
};

type DocDefinition = {
  file: string;
  slug: string;
  title: string;
  summary: string;
  keywords?: string[];
  icon?: string;
};

const PAGE_DEFINITIONS: PageDefinition[] = [
  {
    id: 'desktop-overview',
    title: 'Desktop Overview',
    summary: 'Landing page for the Kali Linux portfolio desktop simulation.',
    url: '/',
    keywords: ['home', 'desktop', 'portfolio', 'landing'],
    boost: 4,
  },
  {
    id: 'profile',
    title: 'Profile & Timeline',
    summary: 'Profile page with certifications, milestones, and personal notes.',
    url: '/profile',
    keywords: ['resume', 'experience', 'timeline', 'about'],
    boost: 3,
  },
  {
    id: 'notes',
    title: 'Research Notes',
    summary: 'Pinned research notes and references maintained for security labs.',
    url: '/notes',
    keywords: ['notes', 'research', 'references', 'lab'],
  },
  {
    id: 'security-education',
    title: 'Security Education',
    summary: 'Learning paths, reading lists, and lab recommendations for security training.',
    url: '/security-education',
    keywords: ['education', 'learning', 'training', 'resources'],
  },
  {
    id: 'popular-modules',
    title: 'Popular Modules',
    summary: 'Trending modules and usage metrics pulled from bundled fixtures.',
    url: '/popular-modules',
    keywords: ['modules', 'metrics', 'analytics', 'dashboard'],
  },
  {
    id: 'module-workspace',
    title: 'Module Workspace',
    summary: 'Workspace hub for building and testing simulated security modules.',
    url: '/module-workspace',
    keywords: ['workspace', 'modules', 'builder'],
  },
  {
    id: 'network-topology',
    title: 'Network Topology',
    summary: 'Interactive topology planner for visualising lab environments.',
    url: '/network-topology',
    keywords: ['network', 'topology', 'diagram'],
  },
  {
    id: 'hydra-preview',
    title: 'Hydra Preview',
    summary: 'Preview of the Hydra credential testing simulator with canned data.',
    url: '/hydra-preview',
    keywords: ['hydra', 'credential', 'bruteforce', 'preview'],
  },
  {
    id: 'nessus-dashboard',
    title: 'Nessus Dashboard',
    summary: 'Nessus-inspired vulnerability dashboard populated from fixtures.',
    url: '/nessus-dashboard',
    keywords: ['nessus', 'vulnerability', 'dashboard', 'reports'],
  },
  {
    id: 'input-hub',
    title: 'Input Hub',
    summary: 'Form-driven command builders for automating CLI demonstrations.',
    url: '/input-hub',
    keywords: ['command', 'builder', 'automation'],
  },
  {
    id: 'keyboard-reference',
    title: 'Keyboard Reference',
    summary: 'Reference of desktop shortcuts and accessibility-friendly commands.',
    url: '/keyboard-reference',
    keywords: ['shortcuts', 'keyboard', 'accessibility'],
  },
  {
    id: 'video-gallery',
    title: 'Video Gallery',
    summary: 'Gallery of walkthrough clips captured from the simulated environment.',
    url: '/video-gallery',
    keywords: ['video', 'gallery', 'walkthrough'],
  },
];

const DOC_DEFINITIONS: DocDefinition[] = [
  {
    file: 'TASKS_UI_POLISH.md',
    slug: 'tasks-ui-polish',
    title: 'UI Polish Backlog',
    summary: 'Detailed backlog of visual polish items and UX tweaks queued for delivery.',
    keywords: ['ui', 'ux', 'polish', 'backlog'],
  },
  {
    file: 'app-ecosystem-roadmap.md',
    slug: 'app-ecosystem-roadmap',
    title: 'App Ecosystem Roadmap',
    summary: 'Roadmap for expanding the simulated application ecosystem and integrations.',
    keywords: ['roadmap', 'apps', 'ecosystem'],
  },
  {
    file: 'architecture.md',
    slug: 'architecture',
    title: 'Architecture Overview',
    summary: 'Project architecture overview covering modules, services, and build tooling.',
    keywords: ['architecture', 'overview', 'layers'],
  },
  {
    file: 'bare-fs-dependency.md',
    slug: 'bare-fs-dependency',
    title: 'Bare FS Dependency Notes',
    summary: 'Notes on bundling bare filesystem dependencies safely for the browser sandbox.',
    keywords: ['filesystem', 'dependency', 'sandbox'],
  },
  {
    file: 'candy-crush-boosters.md',
    slug: 'candy-crush-boosters',
    title: 'Candy Crush Boosters',
    summary: 'Ideation notes and balance considerations for the Candy Crush style demo.',
    keywords: ['candy', 'game', 'boosters'],
  },
  {
    file: 'captive-portal-service.md',
    slug: 'captive-portal-service',
    title: 'Captive Portal Service',
    summary: 'Simulation plan for captive portal flows and connectivity overrides.',
    keywords: ['captive', 'portal', 'service'],
  },
  {
    file: 'component-planning-template.md',
    slug: 'component-planning-template',
    title: 'Component Planning Template',
    summary: 'Template for defining requirements, states, and metrics for new UI components.',
    keywords: ['component', 'planning', 'template'],
  },
  {
    file: 'deauth-mitigation.md',
    slug: 'deauth-mitigation',
    title: 'Deauth Mitigation Strategies',
    summary: 'Wireless deauthentication mitigation strategies used within the lab simulation.',
    keywords: ['wireless', 'deauth', 'mitigation'],
  },
  {
    file: 'desktop-layout-landmarks.md',
    slug: 'desktop-layout-landmarks',
    title: 'Desktop Layout Landmarks',
    summary: 'Accessibility landmarks and navigation anchors for the desktop shell.',
    keywords: ['accessibility', 'desktop', 'landmarks'],
  },
  {
    file: 'desktop-shell-plan.md',
    slug: 'desktop-shell-plan',
    title: 'Desktop Shell Plan',
    summary: 'Roadmap for shell window management, overlays, and persistence strategies.',
    keywords: ['desktop', 'shell', 'plan'],
  },
  {
    file: 'getting-started.md',
    slug: 'getting-started',
    title: 'Getting Started Guide',
    summary: 'Setup guide for installing dependencies and running the Kali Linux portfolio locally.',
    keywords: ['setup', 'installation', 'guide'],
  },
  {
    file: 'gomoku.md',
    slug: 'gomoku',
    title: 'Gomoku Game Notes',
    summary: 'Design notes and heuristics for the Gomoku puzzle game simulation.',
    keywords: ['gomoku', 'game', 'ai'],
  },
  {
    file: 'internal-layouts.md',
    slug: 'internal-layouts',
    title: 'Internal Layout Guidelines',
    summary: 'Guidelines for orchestrating complex internal layouts and dashboards.',
    keywords: ['layout', 'guidelines', 'dashboard'],
  },
  {
    file: 'john-lab-fixtures.md',
    slug: 'john-lab-fixtures',
    title: 'John Lab Fixtures',
    summary: 'Fixture data powering the John the Ripper demonstration flows.',
    keywords: ['john', 'fixtures', 'lab'],
  },
  {
    file: 'john-placeholder-audit.md',
    slug: 'john-placeholder-audit',
    title: 'John Placeholder Audit',
    summary: 'Audit of placeholder copy and assets in the John the Ripper simulator.',
    keywords: ['john', 'audit', 'placeholder'],
  },
  {
    file: 'keyboard-only-test-plan.md',
    slug: 'keyboard-only-test-plan',
    title: 'Keyboard-Only Test Plan',
    summary: 'Accessibility test plan focusing on keyboard-only navigation and shortcuts.',
    keywords: ['keyboard', 'accessibility', 'testing'],
  },
  {
    file: 'kismet-fixtures.md',
    slug: 'kismet-fixtures',
    title: 'Kismet Fixtures',
    summary: 'Fixture data and parsing notes for the Kismet wireless analysis demo.',
    keywords: ['kismet', 'fixtures', 'wireless'],
  },
  {
    file: 'mimikatz-offline-datasets.md',
    slug: 'mimikatz-offline-datasets',
    title: 'Mimikatz Offline Datasets',
    summary: 'Offline dataset references for the Mimikatz credential walkthrough.',
    keywords: ['mimikatz', 'datasets', 'offline'],
  },
  {
    file: 'new-app-checklist.md',
    slug: 'new-app-checklist',
    title: 'New App Checklist',
    summary: 'Checklist covering icons, dynamic imports, CSP, and smoke tests for new apps.',
    keywords: ['checklist', 'apps', 'launch'],
  },
  {
    file: 'nmap-nse-walkthrough.md',
    slug: 'nmap-nse-walkthrough',
    title: 'Nmap NSE Walkthrough',
    summary: 'Step-by-step notes for the Nmap NSE simulation and reporting flows.',
    keywords: ['nmap', 'nse', 'walkthrough'],
  },
  {
    file: 'os-roadmap.md',
    slug: 'os-roadmap',
    title: 'OS Roadmap',
    summary: 'Operating-system level roadmap for background services and virtualization.',
    keywords: ['roadmap', 'os', 'services'],
  },
  {
    file: 'phaser-listeners.md',
    slug: 'phaser-listeners',
    title: 'Phaser Listeners',
    summary: 'Reference of Phaser engine listeners used across the arcade catalog.',
    keywords: ['phaser', 'listeners', 'games'],
  },
  {
    file: 'pip-portal.md',
    slug: 'pip-portal',
    title: 'Pip Portal',
    summary: 'Design outline for the package management portal and dependency insights.',
    keywords: ['pip', 'portal', 'dependencies'],
  },
  {
    file: 'reconng.md',
    slug: 'reconng',
    title: 'Recon-ng Simulator Notes',
    summary: 'Simulator notes for Recon-ng workflows, datasets, and reporting.',
    keywords: ['recon', 'recon-ng', 'simulation'],
  },
  {
    file: 'snake-control-schemes.md',
    slug: 'snake-control-schemes',
    title: 'Snake Control Schemes',
    summary: 'Control scheme experiments and balance notes for the Snake game.',
    keywords: ['snake', 'game', 'controls'],
  },
  {
    file: 'ssh-command-builder.md',
    slug: 'ssh-command-builder',
    title: 'SSH Command Builder',
    summary: 'Design notes for the SSH command builder and credential safety guardrails.',
    keywords: ['ssh', 'command', 'builder'],
  },
  {
    file: 'system-services-roadmap.md',
    slug: 'system-services-roadmap',
    title: 'System Services Roadmap',
    summary: 'Roadmap for simulated background services and monitoring tooling.',
    keywords: ['services', 'roadmap', 'monitoring'],
  },
  {
    file: 'tasks.md',
    slug: 'tasks',
    title: 'Application Task List',
    summary: 'High-level backlog of planned improvements and new portfolio features.',
    keywords: ['tasks', 'backlog', 'planning'],
  },
  {
    file: 'template-glossary.md',
    slug: 'template-glossary',
    title: 'Template Glossary',
    summary: 'Glossary of templating helpers used for scaffolding new components.',
    keywords: ['template', 'glossary', 'helpers'],
  },
  {
    file: 'touch-gestures.md',
    slug: 'touch-gestures',
    title: 'Touch Gestures',
    summary: 'Touch gesture support notes for tablets and touchscreen laptops.',
    keywords: ['touch', 'gestures', 'input'],
  },
  {
    file: 'weather-widget.md',
    slug: 'weather-widget',
    title: 'Weather Widget',
    summary: 'Requirements, offline strategy, and fixture sources for the weather widget.',
    keywords: ['weather', 'widget', 'fixtures'],
  },
  {
    file: 'search-indexing.md',
    slug: 'search-indexing',
    title: 'Search Indexing Guide',
    summary: 'Instructions for keeping the command palette search index up to date.',
    keywords: ['search', 'index', 'guide'],
  },
];

const DOC_BASE_URL = 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/';

const tokenPattern = /[\p{L}\p{N}]+/gu;

const normalizeText = (value: string): string => value.normalize('NFKD').toLowerCase();

const tokenize = (value: string | undefined | null): string[] => {
  if (!value) return [];
  return (normalizeText(value).match(tokenPattern) ?? []).map((token) => token.normalize('NFKD'));
};

export type NormalizedSearchDocument = SearchDocument & {
  normalizedTitle: string;
  normalizedSummary: string;
  normalizedContent: string;
  titleTokens: Set<string>;
  summaryTokens: Set<string>;
  keywordTokens: Set<string>;
  contentTokens: Set<string>;
  allTokens: Set<string>;
  openInNewTab: boolean;
};

export type RankedSearchResult = {
  id: string;
  title: string;
  summary: string;
  url: string;
  category: SearchCategory;
  keywords: string[];
  icon?: string;
  score: number;
  openInNewTab: boolean;
};

type SearchOptions = {
  limit?: number;
};

const CATEGORY_BOOST: Record<SearchCategory, number> = {
  page: 1.5,
  project: 1,
  doc: 0.75,
};

const createPageDocuments = (): SearchDocument[] =>
  PAGE_DEFINITIONS.map((page) => ({
    id: `page:${page.id}`,
    title: page.title,
    summary: page.summary,
    url: page.url,
    category: 'page',
    keywords: page.keywords,
    icon: page.icon,
    boost: page.boost,
    content: [page.summary, ...(page.keywords ?? [])].join(' '),
    openInNewTab: false,
  }));

const createProjectDocuments = (): SearchDocument[] =>
  (projects as ProjectRecord[]).map((project) => {
    const keywords = [
      project.type,
      project.language,
      ...(project.tags ?? []),
      ...(project.stack ?? []),
    ]
      .filter(Boolean)
      .map((value) => value.toString());

    return {
      id: `project:${project.id}`,
      title: project.title,
      summary: project.description,
      url: project.demo || project.repo || '#',
      category: 'project',
      keywords,
      icon: project.thumbnail,
      content: [project.description, project.snippet ?? ''].join(' '),
      openInNewTab: true,
    } satisfies SearchDocument;
  });

const createDocDocuments = (): SearchDocument[] =>
  DOC_DEFINITIONS.map((doc) => ({
    id: `doc:${doc.slug}`,
    title: doc.title,
    summary: doc.summary,
    url: `${DOC_BASE_URL}${doc.file}`,
    category: 'doc',
    keywords: doc.keywords,
    icon: doc.icon,
    content: doc.summary,
    openInNewTab: true,
  }));

export const buildSearchDocuments = (): SearchDocument[] => [
  ...createPageDocuments(),
  ...createProjectDocuments(),
  ...createDocDocuments(),
];

export const normalizeSearchDocuments = (
  documents: SearchDocument[],
): NormalizedSearchDocument[] =>
  documents.map((document) => {
    const titleTokens = new Set(tokenize(document.title));
    const summaryTokens = new Set(tokenize(document.summary));
    const keywordTokens = new Set(tokenize(document.keywords?.join(' ')));
    const contentTokens = new Set(tokenize(document.content));
    const allTokens = new Set<string>([
      ...titleTokens,
      ...summaryTokens,
      ...keywordTokens,
      ...contentTokens,
    ]);

    const normalizedTitle = normalizeText(document.title);
    const normalizedSummary = normalizeText(document.summary);
    const normalizedContent = normalizeText(document.content ?? '');

    const openInNewTab = document.openInNewTab ?? !document.url.startsWith('/');

    return {
      ...document,
      normalizedTitle,
      normalizedSummary,
      normalizedContent,
      titleTokens,
      summaryTokens,
      keywordTokens,
      contentTokens,
      allTokens,
      openInNewTab,
    };
  });

const computeScore = (
  document: NormalizedSearchDocument,
  tokens: string[],
  normalizedQuery: string,
): number => {
  if (!tokens.length) return 0;

  let score = (document.boost ?? 0) + CATEGORY_BOOST[document.category];

  if (document.normalizedTitle === normalizedQuery) {
    score += 30;
  }

  if (document.normalizedSummary.includes(normalizedQuery)) {
    score += 6;
  }

  if (document.normalizedContent.includes(normalizedQuery)) {
    score += 4;
  }

  const matchedTokens = new Set<string>();

  for (const token of tokens) {
    if (!token) continue;

    if (document.titleTokens.has(token)) {
      score += 10;
      matchedTokens.add(token);
      if (document.normalizedTitle.startsWith(token)) {
        score += 3;
      }
    }

    if (document.keywordTokens.has(token)) {
      score += 6;
      matchedTokens.add(token);
    }

    if (document.summaryTokens.has(token)) {
      score += 4;
      matchedTokens.add(token);
    }

    if (document.contentTokens.has(token)) {
      score += 2;
      matchedTokens.add(token);
    }
  }

  score += matchedTokens.size * 1.5;

  return score;
};

export const rankSearchResults = (
  query: string,
  documents: NormalizedSearchDocument[],
  options: SearchOptions = {},
): RankedSearchResult[] => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedQuery = normalizeText(trimmed);
  const tokens = tokenize(trimmed);

  if (!tokens.length) return [];

  const limit = options.limit ?? 12;

  return documents
    .map((doc) => ({
      doc,
      score: computeScore(doc, tokens, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.doc.title.localeCompare(b.doc.title);
    })
    .slice(0, limit)
    .map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      url: doc.url,
      category: doc.category,
      keywords: [...(doc.keywords ?? [])],
      icon: doc.icon,
      score,
      openInNewTab: doc.openInNewTab,
    }));
};

export const buildNormalizedSearchIndex = (): NormalizedSearchDocument[] =>
  normalizeSearchDocuments(buildSearchDocuments());

export default buildSearchDocuments;

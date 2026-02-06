export type LocalizedText = string | Partial<Record<string, string>>;

export type HelpContext = {
  route: string;
  appId?: string | null;
  locale?: string | null;
  state?: Record<string, unknown>;
};

export type ContextHelpAction = {
  label: LocalizedText;
  href?: string;
  external?: boolean;
};

export type ContextHelpCard = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  actions?: ContextHelpAction[];
};

export type ContextHelpRule = {
  id: string;
  match: (context: HelpContext) => boolean;
  cards: ContextHelpCard[];
};

export type ResolvedContextHelpAction = {
  label: string;
  href?: string;
  external?: boolean;
};

export type ResolvedContextHelpCard = {
  id: string;
  ruleId: string;
  title: string;
  body: string;
  actions: ResolvedContextHelpAction[];
};

const resolveLocalizedText = (text: LocalizedText, locale?: string | null): string => {
  if (typeof text === 'string') {
    return text;
  }

  if (!text) {
    return '';
  }

  if (!locale) {
    return text.en ?? Object.values(text)[0] ?? '';
  }

  const normalized = locale.toLowerCase();
  const candidates = [
    normalized,
    normalized.split('-')[0],
    'en',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = text[candidate];
    if (value) return value;
  }

  const first = Object.values(text).find(Boolean);
  return first ?? '';
};

export interface ContextHelpRegistry {
  resolve(context: HelpContext): ResolvedContextHelpCard[];
}

export const createRuleRegistry = (
  rules: ContextHelpRule[]
): ContextHelpRegistry => ({
  resolve: (context: HelpContext) =>
    rules
      .filter((rule) => {
        try {
          return rule.match(context);
        } catch {
          return false;
        }
      })
      .flatMap((rule) =>
        rule.cards.map((card) => ({
          id: card.id,
          ruleId: rule.id,
          title: resolveLocalizedText(card.title, context.locale),
          body: resolveLocalizedText(card.body, context.locale),
          actions:
            card.actions?.map((action) => ({
              label: resolveLocalizedText(action.label, context.locale),
              href: action.href,
              external: action.external,
            })) ?? [],
        }))
      ),
});

const baseRules: ContextHelpRule[] = [
  {
    id: 'desktop.overview',
    match: ({ route }) => route === '/' || route === '/desktop',
    cards: [
      {
        id: 'desktop.overview.layout',
        title: { en: 'Explore the desktop', es: 'Explora el escritorio' },
        body: {
          en: 'Use the dock to launch apps, right-click anywhere for contextual actions, and press Super to open the launcher.',
          es: 'Utiliza el dock para abrir aplicaciones, haz clic derecho para ver acciones contextuales y pulsa Super para abrir el lanzador.',
        },
        actions: [
          {
            label: { en: 'Open keyboard shortcuts', es: 'Ver atajos de teclado' },
            href: '#',
          },
        ],
      },
    ],
  },
  {
    id: 'apps.ssh.quickstart',
    match: ({ appId }) => appId === 'ssh',
    cards: [
      {
        id: 'apps.ssh.connection',
        title: { en: 'Simulated SSH sessions', es: 'Sesiones SSH simuladas' },
        body: {
          en: 'Start a demo connection with the presets on the left. Commands are emulated so you can practice safely.',
          es: 'Inicia una conexión de demostración con los preajustes de la izquierda. Los comandos están emulados para practicar de forma segura.',
        },
      },
    ],
  },
  {
    id: 'apps.project-gallery.tour',
    match: ({ appId }) => appId === 'project-gallery',
    cards: [
      {
        id: 'apps.project-gallery.navigation',
        title: { en: 'Browsing projects', es: 'Explorar proyectos' },
        body: {
          en: 'Filter the gallery with the tags above the grid. Select a project to open its case study in a window.',
          es: 'Filtra la galería con las etiquetas sobre la cuadrícula. Selecciona un proyecto para abrir su caso práctico en una ventana.',
        },
      },
    ],
  },
];

export const contextHelpRegistry = createRuleRegistry(baseRules);

export default contextHelpRegistry;

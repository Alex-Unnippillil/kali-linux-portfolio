export type ScreenshotTemplateToken =
  | 'date'
  | 'time'
  | 'app'
  | 'window'
  | 'monitor';

export interface ScreenshotTemplateVariable {
  token: ScreenshotTemplateToken;
  label: string;
  description: string;
  example: string;
}

export interface ScreenshotTemplateContext {
  /** Optional override for the current time */
  now?: Date;
  /** Application name owning the captured window */
  app?: string;
  /** Window title or label */
  windowTitle?: string;
  /** Monitor label or index */
  monitor?: string;
}

export const SCREENSHOT_TEMPLATE_STORAGE_KEY = 'screenshot-template';

export const DEFAULT_SCREENSHOT_TEMPLATE = '{app}-{date}-{time}';
const DEFAULT_BASENAME = 'screenshot';

const RESERVED_WINDOWS_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const sanitizeSegment = (value: string) =>
  collapseWhitespace(value)
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(CONTROL_CHARS, '-')
    .replace(/\.+/g, '.')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+/, '')
    .replace(/[-.]+$/, '');

const sanitizeBasename = (value: string) => {
  const cleaned = sanitizeSegment(value);
  if (!cleaned) return DEFAULT_BASENAME;
  const upper = cleaned.toUpperCase();
  if (RESERVED_WINDOWS_NAMES.has(upper)) {
    return `${cleaned}-file`;
  }
  return cleaned.slice(0, 180);
};

const formatDate = (now: Date) => {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (now: Date) => {
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');
  const seconds = `${now.getSeconds()}`.padStart(2, '0');
  return `${hours}-${minutes}-${seconds}`;
};

export const TEMPLATE_VARIABLES: ScreenshotTemplateVariable[] = [
  {
    token: 'date',
    label: 'Date',
    description: 'Current date formatted as YYYY-MM-DD.',
    example: '2024-03-08',
  },
  {
    token: 'time',
    label: 'Time',
    description: 'Current time formatted as HH-mm-ss.',
    example: '14-37-52',
  },
  {
    token: 'app',
    label: 'App name',
    description: 'Application identifier or friendly title.',
    example: 'terminal',
  },
  {
    token: 'window',
    label: 'Window title',
    description: 'Active window title or document name.',
    example: 'Session-root',
  },
  {
    token: 'monitor',
    label: 'Monitor label',
    description: 'Display label or index when capturing multiple screens.',
    example: 'Display-1',
  },
];

const resolveWindowTitle = (context: ScreenshotTemplateContext) => {
  if (context.windowTitle && context.windowTitle.trim()) {
    return context.windowTitle;
  }
  const alias = (context as Record<string, unknown>)['window'];
  if (typeof alias === 'string' && alias.trim()) {
    return alias;
  }
  return context.app || 'window';
};

const TOKEN_RESOLVERS: Record<
  ScreenshotTemplateToken,
  (context: ScreenshotTemplateContext, now: Date) => string
> = {
  date: (_, now) => formatDate(now),
  time: (_, now) => formatTime(now),
  app: (context) => context.app || 'desktop',
  ['window']: (context) => resolveWindowTitle(context),
  monitor: (context) => context.monitor || 'screen',
};

const TOKEN_PATTERN = /\{(date|time|app|window|monitor)\}/gi;

export const findInvalidTemplateCharacters = (template: string): string[] => {
  const matches = template.match(INVALID_FILENAME_CHARS) || [];
  const uniques = new Set(matches);
  return Array.from(uniques);
};

const getLocalStorage = (): Storage | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = globalThis as { localStorage?: Storage };
  return candidate.localStorage;
};

export const describeInvalidCharacter = (char: string) => {
  switch (char) {
    case '\n':
      return 'line break (\\n)';
    case '\r':
      return 'carriage return (\\r)';
    case '\t':
      return 'tab (\\t)';
    default:
      if (char.trim() === '') {
        const code = char.codePointAt(0);
        return code ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : 'whitespace';
      }
      return char;
  }
};

export const ensureTemplate = (template?: string | null) =>
  template && template.trim() ? template : DEFAULT_SCREENSHOT_TEMPLATE;

export const readStoredTemplate = () => {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SCREENSHOT_TEMPLATE;
  const stored = storage.getItem(SCREENSHOT_TEMPLATE_STORAGE_KEY);
  if (!stored) return DEFAULT_SCREENSHOT_TEMPLATE;
  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed === 'string' && parsed.trim()) {
      return parsed;
    }
  } catch {
    // ignore parse errors and use default
  }
  return DEFAULT_SCREENSHOT_TEMPLATE;
};

export const formatScreenshotName = (
  templateInput: string,
  context: ScreenshotTemplateContext = {},
  extension?: string,
) => {
  const now = context.now ?? new Date();
  const template = ensureTemplate(templateInput);

  const resolved = template.replace(TOKEN_PATTERN, (match) => {
    const key = match.slice(1, -1).toLowerCase() as ScreenshotTemplateToken;
    const raw = TOKEN_RESOLVERS[key](context, now);
    return sanitizeSegment(raw);
  });

  const basename = sanitizeBasename(resolved);
  if (!extension) return basename;
  const normalizedExt = extension.startsWith('.')
    ? extension.slice(1)
    : extension;
  return `${basename}.${sanitizeSegment(normalizedExt) || 'png'}`;
};


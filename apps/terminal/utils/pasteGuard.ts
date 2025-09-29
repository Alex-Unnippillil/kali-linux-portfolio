export interface PasteGuardConfig {
  enabled: boolean;
  stripControl: boolean;
  warnOnSanitize: boolean;
  warnOnDestructive: boolean;
  destructivePatterns: string[];
  maxPreviewLength: number;
}

export interface ResolvedPasteGuardConfig extends PasteGuardConfig {
  destructiveRegexes: RegExp[];
}

export interface PasteGuardResult {
  text: string;
  removedControlChars: number;
  destructiveMatches: string[];
  warnings: string[];
}

export interface KaliTerminalSettings {
  pasteGuard?: Partial<PasteGuardConfig>;
}

export const DEFAULT_PASTE_GUARD_CONFIG: PasteGuardConfig = {
  enabled: true,
  stripControl: true,
  warnOnSanitize: true,
  warnOnDestructive: true,
  destructivePatterns: [
    '\\brm\\b',
    '\\bmkfs\\w*',
    '\\bdd\\b',
    '\\bpoweroff\\b',
    '\\bshutdown\\b',
    '\\breboot\\b',
  ],
  maxPreviewLength: 120,
};

export const DEFAULT_TERMINAL_SETTINGS: KaliTerminalSettings = {
  pasteGuard: { ...DEFAULT_PASTE_GUARD_CONFIG },
};

function sanitizeControlCharacters(input: string): { text: string; removed: number } {
  let removed = 0;
  const text = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, () => {
    removed += 1;
    return '';
  });
  return { text, removed };
}

export function resolvePasteGuardConfig(
  config?: Partial<PasteGuardConfig> | null,
): ResolvedPasteGuardConfig {
  const merged: PasteGuardConfig = {
    ...DEFAULT_PASTE_GUARD_CONFIG,
    ...(config || {}),
  };
  const destructiveRegexes = merged.destructivePatterns.map((pattern) => {
    try {
      return new RegExp(pattern, 'i');
    } catch {
      return new RegExp(DEFAULT_PASTE_GUARD_CONFIG.destructivePatterns[0], 'i');
    }
  });
  return { ...merged, destructiveRegexes };
}

export function parseTerminalSettings(raw?: string | null): KaliTerminalSettings {
  if (!raw) return DEFAULT_TERMINAL_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_TERMINAL_SETTINGS;
    }
    return {
      pasteGuard:
        typeof parsed.pasteGuard === 'object' && parsed.pasteGuard !== null
          ? (parsed.pasteGuard as Partial<PasteGuardConfig>)
          : undefined,
    };
  } catch {
    return DEFAULT_TERMINAL_SETTINGS;
  }
}

export function formatTerminalSettings(settings: KaliTerminalSettings): string {
  return `${JSON.stringify({
    pasteGuard: {
      ...DEFAULT_PASTE_GUARD_CONFIG,
      ...(settings.pasteGuard || {}),
    },
  }, null, 2)}\n`;
}

export function sanitizePaste(
  raw: string,
  config: ResolvedPasteGuardConfig,
): PasteGuardResult {
  if (!config.enabled) {
    const normalized = raw.replace(/\r\n?/g, '\n');
    return {
      text: normalized,
      removedControlChars: 0,
      destructiveMatches: [],
      warnings: [],
    };
  }

  const normalized = raw.replace(/\r\n?/g, '\n');
  let sanitized = normalized;
  let removed = 0;
  if (config.stripControl) {
    const result = sanitizeControlCharacters(normalized);
    sanitized = result.text;
    removed = result.removed;
  }

  const lines = sanitized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const destructiveMatches: string[] = [];
  if (config.warnOnDestructive) {
    for (const line of lines) {
      if (config.destructiveRegexes.some((regex) => regex.test(line))) {
        destructiveMatches.push(line);
      }
    }
  }

  const warnings: string[] = [];
  if (removed > 0 && config.warnOnSanitize) {
    warnings.push(
      `Removed ${removed} control character${removed === 1 ? '' : 's'} from pasted text.`,
    );
  }

  if (destructiveMatches.length > 0 && config.warnOnDestructive) {
    const previews = destructiveMatches
      .map((line) => (line.length > config.maxPreviewLength
        ? `${line.slice(0, config.maxPreviewLength)}…`
        : line))
      .join('\n');
    warnings.push(
      destructiveMatches.length === 1
        ? `Paste contains a potentially destructive command: "${previews}"`
        : `Paste contains ${destructiveMatches.length} potentially destructive commands:\n${previews}`,
    );
  }

  return {
    text: sanitized,
    removedControlChars: removed,
    destructiveMatches,
    warnings,
  };
}

export default sanitizePaste;

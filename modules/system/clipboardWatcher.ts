export type ClipboardEventType = 'copy' | 'cut' | 'write';

export interface ClipboardActivity {
  text: string;
  type: ClipboardEventType;
  timestamp: number;
}

export interface ClipboardWarning extends ClipboardActivity {
  pattern: string;
  description: string;
  matches: string[];
}

export interface ClipboardMatch {
  pattern: string;
  description: string;
  matches: string[];
}

interface PatternDefinition {
  id: string;
  description: string;
  match: (text: string) => string[];
}

const SECRET_PATTERNS: PatternDefinition[] = [
  {
    id: 'aws-access-key',
    description: 'Possible AWS access key copied to clipboard',
    match: (text: string) => text.match(/\bAKIA[0-9A-Z]{16}\b/g) ?? [],
  },
  {
    id: 'aws-secret-key',
    description: 'String resembles an AWS secret access key',
    match: (text: string) =>
      text.match(/\b(?:aws|aws_|aws-)?secret(?:access)?key\s*[=:]\s*[A-Za-z0-9\/+]{30,}\b/gi) ?? [],
  },
  {
    id: 'private-key',
    description: 'Private key material detected in clipboard contents',
    match: (text: string) => {
      const markers = [
        '-----BEGIN PRIVATE KEY-----',
        '-----BEGIN RSA PRIVATE KEY-----',
        '-----BEGIN DSA PRIVATE KEY-----',
        '-----BEGIN EC PRIVATE KEY-----',
        '-----BEGIN OPENSSH PRIVATE KEY-----',
        '-----BEGIN PGP PRIVATE KEY BLOCK-----',
      ];
      return markers.filter((marker) => text.includes(marker));
    },
  },
  {
    id: 'ssh-key',
    description: 'SSH key material detected',
    match: (text: string) =>
      text.match(/\bssh-(?:rsa|dss|ed25519)\s+[A-Za-z0-9+/=]{20,}/g) ?? [],
  },
  {
    id: 'token-suspect',
    description: 'Clipboard text looks like a secret token or password',
    match: (text: string) =>
      text.match(/\b(?:token|password|secret|apikey|api_key|bearer)[\s:=]+[A-Za-z0-9_\-]{12,}\b/gi) ?? [],
  },
  {
    id: 'hex-entropy',
    description: 'High entropy hex string copied to clipboard',
    match: (text: string) =>
      (text.match(/\b[0-9a-f]{32,}\b/gi) ?? []).filter((chunk) => chunk.length >= 32),
  },
  {
    id: 'base64-entropy',
    description: 'High entropy base64 string copied to clipboard',
    match: (text: string) =>
      (text.match(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g) ?? []).filter((chunk) => chunk.length >= 40),
  },
];

const WARNING_DEBOUNCE_MS = 4000;

export const evaluateClipboardText = (text: string): ClipboardMatch[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const matches: ClipboardMatch[] = [];
  for (const pattern of SECRET_PATTERNS) {
    const result = pattern.match(trimmed);
    if (result.length > 0) {
      matches.push({
        pattern: pattern.id,
        description: pattern.description,
        matches: result,
      });
    }
  }
  return matches;
};

export interface ClipboardWatcherOptions {
  onCopy?: (activity: ClipboardActivity) => void;
  onWarn?: (warning: ClipboardWarning) => void;
  debounceMs?: number;
}

export const startClipboardWatcher = (
  options: ClipboardWatcherOptions = {},
): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const { onCopy, onWarn, debounceMs = WARNING_DEBOUNCE_MS } = options;
  const lastWarnings = new Map<string, number>();

  const emitWarnings = (text: string, type: ClipboardEventType) => {
    const activity: ClipboardActivity = { text, type, timestamp: Date.now() };
    onCopy?.(activity);

    const matches = evaluateClipboardText(text);
    if (matches.length === 0) return;

    for (const match of matches) {
      const key = `${match.pattern}:${match.matches.join('|')}`;
      const now = Date.now();
      const last = lastWarnings.get(key) ?? 0;
      if (now - last < debounceMs) continue;
      lastWarnings.set(key, now);
      const warning: ClipboardWarning = {
        ...activity,
        pattern: match.pattern,
        description: match.description,
        matches: match.matches,
      };
      if (onWarn) onWarn(warning);
      else console.warn(`[clipboard] ${match.description}`, warning);
    }
  };

  const handleCopy = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    emitWarnings(text, event.type === 'cut' ? 'cut' : 'copy');
  };

  window.addEventListener('copy', handleCopy);
  window.addEventListener('cut', handleCopy);

  let restoreWrite: (() => void) | undefined;
  if (typeof navigator !== 'undefined') {
    const { clipboard } = navigator as Navigator & {
      clipboard?: Clipboard & { writeText?: (text: string) => Promise<void> };
    };
    if (clipboard && typeof clipboard.writeText === 'function') {
      const originalWrite = clipboard.writeText.bind(clipboard);
      clipboard.writeText = async (text: string) => {
        emitWarnings(text, 'write');
        return originalWrite(text);
      };
      restoreWrite = () => {
        clipboard.writeText = originalWrite;
      };
    }
  }

  return () => {
    window.removeEventListener('copy', handleCopy);
    window.removeEventListener('cut', handleCopy);
    restoreWrite?.();
  };
};

import { safeLocalStorage } from './safeStorage';

export type RedactionType =
  | 'jwt'
  | 'aws_access_key'
  | 'aws_secret_key'
  | 'token'
  | 'email'
  | 'ip';

export interface RedactionMatch {
  type: RedactionType;
  value: string;
  index: number;
  length: number;
}

export interface RedactionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactionMask {
  id: string;
  type: RedactionType;
  value: string;
  source: 'auto' | 'manual';
  start: number;
  end: number;
  confidence: number;
  bounds?: RedactionBounds;
}

export interface RedactionMetadata {
  version: number;
  generatedAt: string;
  masks: RedactionMask[];
}

export const REDACTION_VERSION = 1;
const REDACTION_STORAGE_PREFIX = 'redaction:';

const isRedactionEnabled =
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_REDACTION_ENABLED : undefined) !== 'false';

const clamp01 = (value: number): number => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const defaultConfidence = (type: RedactionType): number => {
  switch (type) {
    case 'aws_access_key':
    case 'aws_secret_key':
      return 0.95;
    case 'jwt':
      return 0.9;
    case 'token':
      return 0.85;
    case 'email':
    case 'ip':
    default:
      return 0.7;
  }
};

const idFactory = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const dedupeMasks = (masks: RedactionMask[]): RedactionMask[] => {
  const seen = new Map<string, RedactionMask>();
  masks.forEach((mask) => {
    const key = `${mask.type}:${mask.start}:${mask.end}:${mask.value}`;
    if (!seen.has(key)) {
      seen.set(key, mask);
    }
  });
  return Array.from(seen.values());
};

const createMatch = (
  type: RedactionType,
  value: string,
  index: number,
  length: number,
): RedactionMatch => ({
  type,
  value,
  index,
  length,
});

const pushMatch = (
  matches: RedactionMatch[],
  type: RedactionType,
  value: string,
  index: number,
  length: number,
) => {
  if (index < 0 || length <= 0) return;
  matches.push(createMatch(type, value, index, length));
};

const jwtRegex = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const awsAccessKeyRegex = /\b(?:AKIA|ASIA|AGPA|AIDA|ANPA|AROA|AIPA|AIPK)[A-Z0-9]{16}\b/g;
const awsSecretKeyRegex = /\b(?=[A-Za-z0-9+/=]{40}\b)(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])[A-Za-z0-9+/=]{40}\b/g;
const genericTokenRegex = /\b(?:token|apikey|api_key|secret|bearer)\s*[:=]\s*([A-Za-z0-9\-_.]{16,})/gi;
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const ipRegex = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

export const detectSensitiveStrings = (text: string, baseOffset = 0): RedactionMatch[] => {
  if (!isRedactionEnabled || !text) return [];
  const matches: RedactionMatch[] = [];

  const runRegex = (regex: RegExp, type: RedactionType, transform?: (m: RegExpExecArray) => void) => {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) {
      if (transform) {
        transform(m);
      } else if (m[0]) {
        pushMatch(matches, type, m[0], baseOffset + (m.index ?? 0), m[0].length);
      }
      if (!regex.global) break;
    }
  };

  runRegex(jwtRegex, 'jwt');
  runRegex(awsAccessKeyRegex, 'aws_access_key');
  runRegex(awsSecretKeyRegex, 'aws_secret_key');

  runRegex(genericTokenRegex, 'token', (m) => {
    const value = m[1] || m[0];
    pushMatch(matches, 'token', value, baseOffset + (m.index ?? 0) + (m[0].indexOf(value)), value.length);
  });

  runRegex(emailRegex, 'email');
  runRegex(ipRegex, 'ip');

  return matches;
};

export const createMaskFromMatch = (
  match: RedactionMatch,
  overrides: Partial<RedactionMask> = {},
): RedactionMask => ({
  id: overrides.id ?? idFactory(),
  type: match.type,
  value: match.value,
  source: overrides.source ?? 'auto',
  start: overrides.start ?? match.index,
  end: overrides.end ?? match.index + match.length,
  confidence: overrides.confidence ?? defaultConfidence(match.type),
  bounds: overrides.bounds,
});

export const createMasksFromMatches = (matches: RedactionMatch[]): RedactionMask[] =>
  dedupeMasks(matches.map((match) => createMaskFromMatch(match)));

export const createManualMask = (bounds: RedactionBounds, type: RedactionType = 'token'): RedactionMask => ({
  id: idFactory(),
  type,
  value: 'manual-mask',
  source: 'manual',
  start: 0,
  end: 0,
  confidence: 0.5,
  bounds,
});

export const collectNodeRedactions = (root: HTMLElement): RedactionMask[] => {
  if (!isRedactionEnabled || typeof window === 'undefined' || !root) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const rootRect = root.getBoundingClientRect();
  const width = rootRect.width || root.clientWidth;
  const height = rootRect.height || root.clientHeight;
  const masks: RedactionMask[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = node.textContent;
    if (!text) continue;
    const nodeMatches = detectSensitiveStrings(text);
    nodeMatches.forEach((match) => {
      let bounds: RedactionBounds | undefined;
      if (width > 0 && height > 0) {
        const range = document.createRange();
        const start = Math.min(match.index, node.length);
        const end = Math.min(match.index + match.length, node.length);
        if (end <= start) {
          masks.push(createMaskFromMatch(match));
          return;
        }
        range.setStart(node, start);
        range.setEnd(node, end);
        const rect = range.getBoundingClientRect();
        range.detach?.();
        if (rect.width > 0 && rect.height > 0) {
          bounds = {
            x: clamp01((rect.left - rootRect.left) / width),
            y: clamp01((rect.top - rootRect.top) / height),
            width: clamp01(rect.width / width),
            height: clamp01(rect.height / height),
          };
        }
      }
      masks.push(createMaskFromMatch(match, { bounds }));
    });
  }

  return dedupeMasks(masks);
};

export const buildRedactionMetadata = (masks: RedactionMask[]): RedactionMetadata => ({
  version: REDACTION_VERSION,
  generatedAt: new Date().toISOString(),
  masks: masks.map((mask) => ({ ...mask })),
});

export const serializeRedactionMetadata = (metadata: RedactionMetadata): string =>
  JSON.stringify(metadata);

export const deserializeRedactionMetadata = (json: string): RedactionMetadata | null => {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return null;
    if (!Array.isArray(data.masks)) return null;
    return {
      version: typeof data.version === 'number' ? data.version : REDACTION_VERSION,
      generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
      masks: data.masks as RedactionMask[],
    };
  } catch {
    return null;
  }
};

export const persistRedactionMetadataForFile = (
  filename: string,
  metadata: RedactionMetadata,
): void => {
  if (!filename) return;
  try {
    safeLocalStorage?.setItem(
      `${REDACTION_STORAGE_PREFIX}${filename}`,
      serializeRedactionMetadata(metadata),
    );
  } catch {
    // ignore storage errors
  }
};

export const loadRedactionMetadataForFile = (filename: string): RedactionMetadata | null => {
  if (!filename) return null;
  try {
    const raw = safeLocalStorage?.getItem(`${REDACTION_STORAGE_PREFIX}${filename}`);
    if (!raw) return null;
    return deserializeRedactionMetadata(raw);
  } catch {
    return null;
  }
};

export const downloadRedactionMetadata = (
  filename: string,
  metadata: RedactionMetadata,
  options: { includeEmpty?: boolean } = {},
): void => {
  const { includeEmpty = false } = options;
  if (!filename) return;
  if (!includeEmpty && metadata.masks.length === 0) {
    persistRedactionMetadataForFile(filename, metadata);
    return;
  }
  if (typeof window === 'undefined') return;
  const json = serializeRedactionMetadata(metadata);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.redaction.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  persistRedactionMetadataForFile(filename, metadata);
};

export const detectRedactionsFromBlob = async (blob: Blob): Promise<RedactionMask[]> => {
  if (!isRedactionEnabled || !blob) return [];
  try {
    const buffer = await blob.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    const matches = detectSensitiveStrings(text);
    return createMasksFromMatches(matches);
  } catch {
    return [];
  }
};

export const applyMasksToContext = (
  ctx: CanvasRenderingContext2D,
  masks: RedactionMask[],
  color = 'rgba(0,0,0,0.7)',
): void => {
  if (!ctx || masks.length === 0) return;
  const { canvas } = ctx;
  const width = canvas.width;
  const height = canvas.height;
  ctx.save();
  ctx.fillStyle = color;
  masks.forEach((mask) => {
    if (!mask.bounds) return;
    ctx.fillRect(
      mask.bounds.x * width,
      mask.bounds.y * height,
      mask.bounds.width * width,
      mask.bounds.height * height,
    );
  });
  ctx.restore();
};

export default detectSensitiveStrings;

export type ReproStep = {
  id: string;
  timestamp: number;
  label: string;
  meta?: Record<string, unknown>;
};

export type ReproLogLevel = 'info' | 'warn' | 'error';

export type ReproLog = {
  id: string;
  timestamp: number;
  level: ReproLogLevel;
  message: string;
  context?: Record<string, unknown>;
};

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const DIGIT_SEQUENCE_REGEX = /\b\d{6,}\b/g;
const TOKEN_REGEX = /(api|session|auth|secret|token|key)=([^\s&]+)/gi;

const MAX_STEPS = 300;
const MAX_LOGS = 300;

let steps: ReproStep[] = [];
let logs: ReproLog[] = [];

const clampHistory = <T>(list: T[], limit: number) =>
  list.length > limit ? list.slice(list.length - limit) : list;

export const anonymizeText = (value: string): string =>
  value
    .replace(EMAIL_REGEX, '<redacted-email>')
    .replace(UUID_REGEX, '<redacted-id>')
    .replace(DIGIT_SEQUENCE_REGEX, '<redacted-number>')
    .replace(TOKEN_REGEX, (_, prefix) => `${prefix}=<redacted>`);

const sanitizePrimitive = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const normalized = anonymizeText(trimmed);
    return normalized.length > 500 ? `${normalized.slice(0, 497)}...` : normalized;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return 0;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    try {
      return sanitizePrimitive((value as { toString(): string }).toString());
    } catch {
      return '[object]';
    }
  }
  return value;
};

export const anonymizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(item => anonymizeValue(item));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const result: Record<string, unknown> = {};
    entries.forEach(([key, val]) => {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        result[key] = '<redacted>';
      } else {
        result[key] = anonymizeValue(val);
      }
    });
    return result;
  }
  return sanitizePrimitive(value);
};

const createEntryId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const recordStep = (label: string, meta?: Record<string, unknown>): void => {
  const step: ReproStep = {
    id: createEntryId('step'),
    timestamp: Date.now(),
    label: anonymizeText(label),
    meta: meta ? (anonymizeValue(meta) as Record<string, unknown>) : undefined,
  };
  steps = clampHistory([...steps, step], MAX_STEPS);
};

export const recordLog = (
  level: ReproLogLevel,
  message: string,
  context?: Record<string, unknown>,
): void => {
  const log: ReproLog = {
    id: createEntryId('log'),
    timestamp: Date.now(),
    level,
    message: anonymizeText(message),
    context: context ? (anonymizeValue(context) as Record<string, unknown>) : undefined,
  };
  logs = clampHistory([...logs, log], MAX_LOGS);
};

export const getRecorderSnapshot = () => ({
  steps: [...steps],
  logs: [...logs],
});

export const clearRecorder = () => {
  steps = [];
  logs = [];
};

export const replaceRecorderSnapshot = (nextSteps: ReproStep[] = [], nextLogs: ReproLog[] = []): void => {
  steps = clampHistory(
    nextSteps.map(step => ({
      ...step,
      label: anonymizeText(step.label),
      meta: step.meta ? (anonymizeValue(step.meta) as Record<string, unknown>) : undefined,
    })),
    MAX_STEPS,
  );
  logs = clampHistory(
    nextLogs.map(log => ({
      ...log,
      message: anonymizeText(log.message),
      context: log.context ? (anonymizeValue(log.context) as Record<string, unknown>) : undefined,
    })),
    MAX_LOGS,
  );
};

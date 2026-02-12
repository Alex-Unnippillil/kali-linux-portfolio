import { scrubSensitiveData, scrubSensitiveText } from '../../utils/logs/privacy';

export type CrashSeverity = 'fatal' | 'error' | 'warning';

export interface CrashPayload {
  error?: unknown;
  message?: string;
  name?: string;
  stack?: string;
  severity?: CrashSeverity;
  app?: string;
  component?: string;
  route?: string;
  action?: string;
  userSteps?: Array<string | number>;
  metadata?: Record<string, unknown>;
  logs?: unknown[];
  timestamp?: number;
  environment?: string;
}

export interface CrashDetails {
  crashId: string;
  timestamp: number;
  severity: CrashSeverity;
  name?: string;
  message: string;
  stack?: string;
  app?: string;
  component?: string;
  route?: string;
  action?: string;
  userSteps: string[];
  metadata: Record<string, unknown>;
  logs: string[];
  environment?: string;
}

export interface CrashReport {
  summary: string;
  details: CrashDetails;
}

const DEFAULT_APP_NAME = 'the Kali Linux portfolio desktop';
const CRASH_ID_PREFIX = 'CRASH';

const getTimestamp = (value?: number) => (
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : Date.now()
);

const normaliseError = (error: unknown): { message: string; name?: string; stack?: string } => {
  if (!error) {
    return { message: 'Unknown crash' };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown crash',
      name: error.name,
      stack: error.stack || undefined,
    };
  }

  if (typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const message = typeof value.message === 'string'
      ? value.message
      : JSON.stringify(value);
    const name = typeof value.name === 'string' ? value.name : undefined;
    const stack = typeof value.stack === 'string' ? value.stack : undefined;
    return {
      message: message || 'Unknown crash',
      name,
      stack,
    };
  }

  return { message: String(error) };
};

const ensureStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return '';
        const text = String(item).trim();
        return text;
      })
      .filter((item) => item.length > 0);
  }
  const text = String(value).trim();
  return text ? [text] : [];
};

const coerceLogs = (logs: unknown): string[] => {
  if (!logs) return [];
  if (Array.isArray(logs)) {
    return logs
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry instanceof Error) {
          return entry.stack || entry.message;
        }
        if (entry && typeof entry === 'object') {
          try {
            return JSON.stringify(entry);
          } catch {
            return String(entry);
          }
        }
        return String(entry);
      })
      .map((entry) => scrubSensitiveText(entry))
      .filter((entry) => entry.trim().length > 0);
  }
  if (typeof logs === 'string') {
    const cleaned = scrubSensitiveText(logs);
    return cleaned ? [cleaned] : [];
  }
  return [];
};

const truncateStack = (stack?: string): string | undefined => {
  if (!stack) return undefined;
  const lines = stack.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  const maxLines = 8;
  const truncated = lines.slice(0, maxLines).join('\n');
  return truncated;
};

export const generateCrashId = (timestamp: number = Date.now()): string => {
  const base = timestamp.toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${CRASH_ID_PREFIX}-${base}-${random}`;
};

const buildLocationSentence = (details: CrashDetails): string => {
  const segments: string[] = [];
  if (details.app) segments.push(`app "${details.app}"`);
  if (details.component) segments.push(`component "${details.component}"`);
  if (details.route) segments.push(`route ${details.route}`);
  const location = segments.length > 0
    ? segments.join(' · ')
    : DEFAULT_APP_NAME;
  const severityLabel = details.severity === 'fatal'
    ? 'Fatal error'
    : details.severity === 'warning'
      ? 'Warning'
      : 'Error';
  return `${severityLabel} crash detected in ${location}.`;
};

const formatMetadata = (metadata: Record<string, unknown>): string[] => {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null)
    .slice(0, 10)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: ${scrubSensitiveText(value)}`;
      }
      try {
        return `${key}: ${scrubSensitiveText(JSON.stringify(value))}`;
      } catch {
        return `${key}: [unserializable]`;
      }
    });
};

export const buildCrashSummary = (details: CrashDetails): string => {
  const lines: string[] = [];
  lines.push(buildLocationSentence(details));
  lines.push(`Crash ID: ${details.crashId}`);
  lines.push(`Captured at ${new Date(details.timestamp).toISOString()}.`);
  if (details.environment) {
    lines.push(`Environment: ${details.environment}`);
  }
  lines.push('');
  lines.push(`Message: ${details.message || 'No error message provided.'}`);
  if (details.action) {
    lines.push(`Last action before crash: ${details.action}`);
  }
  if (details.stack) {
    const stackSnippet = truncateStack(details.stack);
    if (stackSnippet) {
      lines.push('Stack trace (sanitized):');
      lines.push(stackSnippet);
    }
  }
  if (details.userSteps.length > 0) {
    lines.push('');
    lines.push('Steps leading up to the crash:');
    details.userSteps.slice(0, 6).forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }
  const metadataLines = formatMetadata(details.metadata);
  if (metadataLines.length > 0) {
    lines.push('');
    lines.push('Context:');
    metadataLines.forEach((entry) => lines.push(`- ${entry}`));
  }
  if (details.logs.length > 0) {
    lines.push('');
    lines.push('Recent logs:');
    details.logs.slice(-6).forEach((log) => {
      lines.push(`• ${log}`);
    });
  }
  return lines.join('\n').trim();
};

export const createCrashReport = (payload: CrashPayload): CrashReport => {
  const timestamp = getTimestamp(payload.timestamp);
  const errorDetails = normaliseError(payload.error ?? payload.message);
  const baseDetails: CrashDetails = {
    crashId: generateCrashId(timestamp),
    timestamp,
    severity: payload.severity || 'error',
    name: payload.name || errorDetails.name,
    message: payload.message || errorDetails.message,
    stack: payload.stack || errorDetails.stack,
    app: payload.app,
    component: payload.component,
    route: payload.route,
    action: payload.action,
    userSteps: ensureStringArray(payload.userSteps),
    metadata: payload.metadata || {},
    logs: coerceLogs(payload.logs),
    environment: payload.environment,
  };

  const sanitisedDetails = scrubSensitiveData({
    ...baseDetails,
    message: scrubSensitiveText(baseDetails.message),
    stack: baseDetails.stack ? scrubSensitiveText(baseDetails.stack) : undefined,
  });

  const summary = buildCrashSummary(sanitisedDetails);

  return {
    summary,
    details: sanitisedDetails,
  };
};

export default createCrashReport;

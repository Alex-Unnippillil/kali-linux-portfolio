export type StatusTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ToneMetadata {
  icon: string;
  label: string;
  colorVar: `--${string}`;
  accentVar: `--${string}`;
  contrastVar: `--${string}`;
}

export const STATUS_TONE_METADATA: Record<StatusTone, ToneMetadata> = {
  info: {
    icon: 'ℹ️',
    label: 'Information',
    colorVar: '--status-info',
    accentVar: '--status-info-strong',
    contrastVar: '--status-info-contrast',
  },
  success: {
    icon: '✔️',
    label: 'Success',
    colorVar: '--status-success',
    accentVar: '--status-success-strong',
    contrastVar: '--status-success-contrast',
  },
  warning: {
    icon: '⚠️',
    label: 'Warning',
    colorVar: '--status-warning',
    accentVar: '--status-warning-strong',
    contrastVar: '--status-warning-contrast',
  },
  danger: {
    icon: '✖️',
    label: 'Critical',
    colorVar: '--status-danger',
    accentVar: '--status-danger-strong',
    contrastVar: '--status-danger-contrast',
  },
  neutral: {
    icon: '•',
    label: 'Neutral',
    colorVar: '--status-neutral',
    accentVar: '--status-neutral-strong',
    contrastVar: '--status-neutral-contrast',
  },
};

const KEYWORD_TONES: Array<{ tone: StatusTone; keywords: string[] }> = [
  { tone: 'success', keywords: ['success', 'successful', 'passed', 'complete', 'completed', 'ok', 'ready', 'resolved', 'healthy'] },
  { tone: 'danger', keywords: ['error', 'failed', 'failure', 'critical', 'crash', 'blocked', 'offline', 'stopped', 'lost', 'breach'] },
  { tone: 'warning', keywords: ['running', 'processing', 'active', 'in progress', 'progress', 'executing', 'warming', 'updating'] },
  { tone: 'info', keywords: ['queued', 'queue', 'pending', 'waiting', 'scheduled', 'info', 'informational', 'notice'] },
  { tone: 'neutral', keywords: ['paused', 'idle', 'draft', 'unknown', 'standby'] },
];

export function resolveTone(input: string | null | undefined, fallback: StatusTone = 'info'): StatusTone {
  if (!input) return fallback;
  const normalized = input.toLowerCase().trim();
  for (const { tone, keywords } of KEYWORD_TONES) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return tone;
    }
  }
  return fallback;
}

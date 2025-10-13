import * as Sentry from '@sentry/nextjs';
import { getCurrentHub } from '@sentry/core';
import { Replay } from '@sentry/replay';

interface TelemetryEnvConfig {
  dsn?: string;
  environment?: string;
  tracesSampleRate?: string;
  replaysSessionSampleRate?: string;
  replaysOnErrorSampleRate?: string;
  tracePropagationTargets?: string;
}

const parseSampleRate = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  if (parsed > 1) {
    return 1;
  }
  return parsed;
};

const parseTraceTargets = (raw: string | undefined): (string | RegExp)[] | undefined => {
  if (!raw) return undefined;
  const entries = raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => {
      if (token.startsWith('/') && token.endsWith('/') && token.length > 2) {
        try {
          return new RegExp(token.slice(1, -1));
        } catch {
          return token;
        }
      }
      return token;
    });
  return entries.length > 0 ? entries : undefined;
};

let hasInitialized = false;
let replayIntegration: Replay | undefined;

const ensureReplayIntegration = (): Replay => {
  if (!replayIntegration) {
    replayIntegration = new Replay({
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: true,
    });
  }
  return replayIntegration;
};

const initializeTelemetry = (env: TelemetryEnvConfig) => {
  if (!env.dsn) return;

  const traceTargets = parseTraceTargets(env.tracePropagationTargets);
  const integrations = [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: traceTargets,
    }),
    ensureReplayIntegration(),
  ];

  Sentry.init({
    dsn: env.dsn,
    environment: env.environment,
    integrations,
    tracesSampleRate: parseSampleRate(env.tracesSampleRate, 0),
    replaysSessionSampleRate: parseSampleRate(env.replaysSessionSampleRate, 0),
    replaysOnErrorSampleRate: parseSampleRate(env.replaysOnErrorSampleRate, 1),
    beforeSend(event) {
      if (event.request?.headers?.authorization) {
        delete event.request.headers.authorization;
      }
      return event;
    },
  });

  hasInitialized = true;
};

const shutdownTelemetry = async () => {
  if (!hasInitialized) return;
  const hub = getCurrentHub();
  const client = hub.getClient();
  if (client?.close) {
    await client.close(0);
  }
  if (replayIntegration) {
    replayIntegration.stop();
    replayIntegration = undefined;
  }
  hasInitialized = false;
};

export const applyTelemetryPreference = async (
  enabled: boolean,
  env: TelemetryEnvConfig,
): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (!env.dsn) return;

  if (enabled) {
    if (hasInitialized) return;
    initializeTelemetry(env);
    return;
  }

  await shutdownTelemetry();
};

export const __resetTelemetryForTests = () => {
  hasInitialized = false;
  replayIntegration = undefined;
};

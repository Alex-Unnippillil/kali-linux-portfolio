import { createConsoleLogger, fallbackCorrelationId, type Logger } from '../logger/base';
import { serverOnly } from './server-only';

type NodeRandomUUID = () => string;

serverOnly('lib/server/logger');

let cachedRandomUUID: NodeRandomUUID | null | undefined;

function loadNodeRandomUUID(): NodeRandomUUID | null {
  if (cachedRandomUUID !== undefined) {
    return cachedRandomUUID;
  }

  try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { randomUUID } = require('crypto') as typeof import('crypto');
    cachedRandomUUID = randomUUID;
  } catch {
    cachedRandomUUID = null;
  }

  return cachedRandomUUID;
}

function generateCorrelationId(): string {
  const nodeRandomUUID = loadNodeRandomUUID();
  if (nodeRandomUUID) {
    try {
      return nodeRandomUUID();
    } catch {
      // continue to fallback
    }
  }

  return fallbackCorrelationId();
}

export function createLogger(correlationId: string = generateCorrelationId()): Logger {
  return createConsoleLogger(correlationId);
}

export type { Logger } from '../logger/base';

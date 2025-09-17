export type DevLogger = Pick<
  Console,
  'log' | 'info' | 'warn' | 'error' | 'debug'
>;

export interface DevRuntimeOptions {
  nonce?: string;
  logger?: DevLogger;
}

export type CleanupResult = void | (() => void | Promise<void>);

export interface DevHelpers {
  toggleGridOverlay(): void;
  logActiveElement(): void;
  clearPersistedState(): void;
}

declare global {
  interface Window {
    __DEV_HELPERS__?: DevHelpers;
  }
}

export {};

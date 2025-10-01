export type SandboxStatus = 'resolved' | 'rejected' | 'cancelled' | 'timeout';

export interface SerializedError {
  message: string;
  stack?: string;
  name?: string;
}

export interface SandboxConsoleEntry {
  level: 'log' | 'warn' | 'error';
  args: unknown[];
}

export interface SandboxExecutionResult {
  status: SandboxStatus;
  value?: unknown;
  error: SerializedError | null;
  logs: string[];
  console: SandboxConsoleEntry[];
  isolated: boolean;
}

export interface SandboxInvocation {
  cancelToken: string;
  cancel(reason?: string): void;
  result: Promise<SandboxExecutionResult>;
}

interface SandboxCompleteMessage {
  type: 'sandbox:complete';
  id: string;
  status: Exclude<SandboxStatus, 'timeout'>;
  value?: unknown;
  error?: SerializedError;
}

interface SandboxEmitMessage {
  type: 'sandbox:emit';
  id: string;
  value: unknown;
}

interface SandboxConsoleMessage {
  type: 'sandbox:console';
  id: string;
  level: SandboxConsoleEntry['level'];
  args: unknown[];
}

interface SandboxTimeoutMessage {
  type: 'sandbox:timeout';
  id: string;
}

interface SandboxReadyMessage {
  type: 'sandbox:ready';
  version: number;
}

export type SandboxOutboundMessage =
  | SandboxCompleteMessage
  | SandboxEmitMessage
  | SandboxConsoleMessage
  | SandboxTimeoutMessage
  | SandboxReadyMessage;

export interface SandboxExecuteMessage {
  type: 'host:execute';
  id: string;
  code: string;
  cancelToken: string;
  timeoutMs?: number;
}

export interface SandboxCancelMessage {
  type: 'host:cancel';
  cancelToken: string;
  reason?: string;
  id?: string;
}

export type SandboxInboundMessage = SandboxExecuteMessage | SandboxCancelMessage;

interface PendingInvocation {
  cancelToken: string;
  logs: string[];
  console: SandboxConsoleEntry[];
  resolve: (result: SandboxExecutionResult) => void;
  timeoutId?: number;
}

const DEFAULT_TIMEOUT = 2000;

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(16).slice(2, 10);

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const serializeError = (error: unknown): SerializedError => {
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message?: unknown; stack?: unknown; name?: unknown };
    return {
      message: typeof err.message === 'string' ? err.message : String(err.message),
      stack: typeof err.stack === 'string' ? err.stack : undefined,
      name: typeof err.name === 'string' ? err.name : undefined,
    };
  }
  return {
    message: typeof error === 'string' ? error : String(error),
  };
};

export interface ExtensionSandboxBridgeOptions {
  frameUrl?: string;
  handshakeTimeoutMs?: number;
  defaultTimeoutMs?: number;
}

export class ExtensionSandboxBridge {
  private iframe: HTMLIFrameElement;
  private readyPromise: Promise<void>;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((error: Error) => void) | null = null;
  private handshakeTimer: number | null = null;
  private readonly pending = new Map<string, PendingInvocation>();
  private readonly cancelIndex = new Map<string, string>();
  private disposed = false;
  private isolated = false;
  private readonly frameUrl: string;
  private readonly handshakeTimeout: number;
  private readonly defaultTimeout: number;

  private readonly onMessage = (event: MessageEvent) => {
    if (this.disposed) return;
    if (event.source !== this.iframe.contentWindow) return;
    const data = event.data as SandboxOutboundMessage;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'sandbox:ready':
        this.handleReady();
        break;
      case 'sandbox:emit': {
        const entry = this.pending.get(data.id);
        if (entry) {
          entry.logs.push(formatValue(data.value));
        }
        break;
      }
      case 'sandbox:console': {
        const entry = this.pending.get(data.id);
        if (entry) {
          entry.console.push({ level: data.level, args: data.args });
        }
        break;
      }
      case 'sandbox:timeout':
        this.finalize(data.id, 'timeout', undefined, {
          message: 'Sandbox execution timed out',
        });
        break;
      case 'sandbox:complete':
        this.handleComplete(data);
        break;
      default:
        break;
    }
  };

  constructor(options: ExtensionSandboxBridgeOptions = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('ExtensionSandboxBridge requires a browser environment.');
    }

    this.frameUrl = options.frameUrl ?? '/extensions/sandbox-frame.html';
    this.handshakeTimeout = options.handshakeTimeoutMs ?? DEFAULT_TIMEOUT;
    this.defaultTimeout = options.defaultTimeoutMs ?? 1000;

    this.iframe = document.createElement('iframe');
    this.iframe.src = this.frameUrl;
    this.iframe.setAttribute('aria-hidden', 'true');
    this.iframe.setAttribute('title', 'Extension sandbox');
    this.iframe.style.display = 'none';
    this.iframe.sandbox.add('allow-scripts');

    document.body.appendChild(this.iframe);

    window.addEventListener('message', this.onMessage);
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.handshakeTimer = window.setTimeout(() => {
      if (this.rejectReady) {
        this.rejectReady(new Error('Sandbox handshake timed out'));
        this.rejectReady = null;
      }
      this.resolveReady = null;
      this.handshakeTimer = null;
    }, this.handshakeTimeout);
  }

  private verifyIsolation(): boolean {
    if (this.iframe.sandbox.contains('allow-same-origin')) {
      return false;
    }
    const frameWindow = this.iframe.contentWindow;
    if (!frameWindow) {
      return false;
    }
    try {
      void (frameWindow as Window).document;
      return false;
    } catch {
      return true;
    }
  }

  private handleReady() {
    if (this.handshakeTimer !== null) {
      window.clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }

    try {
      this.isolated = this.verifyIsolation();
    } catch (error) {
      if (this.rejectReady) {
        this.rejectReady(error as Error);
        this.rejectReady = null;
      }
      this.resolveReady = null;
      return;
    }

    if (!this.isolated) {
      if (this.rejectReady) {
        this.rejectReady(new Error('Sandbox isolation check failed'));
        this.rejectReady = null;
      }
      this.resolveReady = null;
      return;
    }

    if (this.resolveReady) {
      this.resolveReady();
      this.resolveReady = null;
      this.rejectReady = null;
    }
  }

  private handleComplete(message: SandboxCompleteMessage) {
    const { id, status, value, error } = message;
    const serializedError = error ?? null;
    this.finalize(id, status, value, serializedError ?? undefined);
  }

  private send(message: SandboxInboundMessage) {
    this.iframe.contentWindow?.postMessage(message, '*');
  }

  private finalize(
    id: string,
    status: SandboxStatus,
    value?: unknown,
    error?: SerializedError,
  ) {
    const entry = this.pending.get(id);
    if (!entry) return;
    if (entry.timeoutId) {
      window.clearTimeout(entry.timeoutId);
    }
    this.pending.delete(id);
    this.cancelIndex.delete(entry.cancelToken);
    entry.resolve({
      status,
      value,
      error: error ?? null,
      logs: [...entry.logs],
      console: [...entry.console],
      isolated: this.isolated,
    });
  }

  private ensureReady() {
    return this.readyPromise.catch((error) => {
      if (this.disposed) {
        throw new Error('Sandbox bridge disposed');
      }
      throw error;
    });
  }

  execute(code: string, options: { timeoutMs?: number } = {}): SandboxInvocation {
    if (this.disposed) {
      throw new Error('Sandbox bridge has been disposed');
    }
    const id = createId();
    const cancelToken = createId();

    let resolveInvocation: (result: SandboxExecutionResult) => void = () => {};
    const result = new Promise<SandboxExecutionResult>((resolve) => {
      resolveInvocation = resolve;
    });

    const entry: PendingInvocation = {
      cancelToken,
      logs: [],
      console: [],
      resolve: resolveInvocation,
    };
    this.pending.set(id, entry);
    this.cancelIndex.set(cancelToken, id);

    const timeoutMs = options.timeoutMs ?? this.defaultTimeout;

    this.ensureReady()
      .then(() => {
        if (this.disposed) {
          this.finalize(id, 'cancelled', undefined, {
            message: 'Sandbox bridge disposed',
          });
          return;
        }
        if (!this.iframe.contentWindow) {
          this.finalize(id, 'rejected', undefined, {
            message: 'Sandbox window unavailable',
          });
          return;
        }
        if (timeoutMs > 0) {
          entry.timeoutId = window.setTimeout(() => {
            this.send({
              type: 'host:cancel',
              cancelToken,
              reason: 'timeout',
              id,
            });
          }, timeoutMs + 10);
        }
        this.send({
          type: 'host:execute',
          id,
          code,
          cancelToken,
          timeoutMs,
        });
      })
      .catch((error) => {
        this.finalize(id, 'rejected', undefined, serializeError(error));
      });

    return {
      cancelToken,
      cancel: (reason?: string) => {
        if (!this.cancelIndex.has(cancelToken)) return;
        this.send({ type: 'host:cancel', cancelToken, reason, id });
      },
      result,
    };
  }

  cancel(cancelToken: string, reason?: string) {
    const id = this.cancelIndex.get(cancelToken);
    if (!id) return;
    this.send({ type: 'host:cancel', cancelToken, reason, id });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('message', this.onMessage);
    if (this.handshakeTimer !== null) {
      window.clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
    if (this.rejectReady) {
      this.rejectReady(new Error('Sandbox bridge disposed'));
    }
    for (const id of Array.from(this.pending.keys())) {
      this.finalize(id, 'cancelled', undefined, {
        message: 'Sandbox bridge disposed',
      });
    }
    this.pending.clear();
    this.cancelIndex.clear();
    this.resolveReady = null;
    this.rejectReady = null;
    if (this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
  }
}

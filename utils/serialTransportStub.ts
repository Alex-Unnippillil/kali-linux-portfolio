export interface SerialPortLike {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

export type SerialDisconnectListener = (event: Event & { readonly target: SerialPortLike }) => void;

export interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  addEventListener(type: 'disconnect', listener: SerialDisconnectListener): void;
  removeEventListener(type: 'disconnect', listener: SerialDisconnectListener): void;
}

interface SerialPortStubOptions {
  script: string[];
  intervalMs: number;
}

const DEFAULT_SCRIPT = [
  '[demo] Web Serial API not available. Using simulated device.',
  '[demo] Listening on COM3 @ 9600 baud.',
  '[demo] Type commands to explore serial workflows.',
];

const DEFAULT_INTERVAL_MS = 120;

class SerialPortStub implements SerialPortLike {
  public readable: ReadableStream<Uint8Array> | null;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private openState = false;
  private readonly encoder = new TextEncoder();
  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private readonly options: SerialPortStubOptions, private readonly onClose: () => void) {
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        this.controller = null;
      },
    });
  }

  async open({ baudRate }: { baudRate: number }): Promise<void> {
    // Preserve API parity but ignore the value for the stub.
    void baudRate;
    if (this.openState) return;
    this.openState = true;
    this.runScript();
  }

  async close(): Promise<void> {
    if (!this.openState) return;
    this.openState = false;
    while (this.timers.length) {
      const timer = this.timers.pop();
      if (timer) clearTimeout(timer);
    }
    if (this.controller) {
      this.controller.close();
      this.controller = null;
    }
    this.readable = null;
    this.onClose();
  }

  emit(chunk: string): void {
    if (!this.openState || !this.controller) return;
    this.controller.enqueue(this.encoder.encode(chunk));
  }

  isOpen(): boolean {
    return this.openState;
  }

  private runScript() {
    const { script, intervalMs } = this.options;
    if (!script.length || !this.controller) {
      return;
    }
    script.forEach((line, index) => {
      const timer = setTimeout(() => {
        if (!this.openState || !this.controller) return;
        this.controller.enqueue(this.encoder.encode(`${line}\n`));
      }, intervalMs * index);
      this.timers.push(timer);
    });
  }
}

export interface SerialTransportStubOptions {
  script?: string[];
  intervalMs?: number;
}

export class SerialTransportStub {
  public readonly serial: SerialLike;
  private readonly listeners = new Set<SerialDisconnectListener>();
  private currentPort: SerialPortStub | null = null;
  private readonly script: string[];
  private readonly intervalMs: number;

  constructor(options: SerialTransportStubOptions = {}) {
    this.script = options.script?.slice() ?? DEFAULT_SCRIPT.slice();
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.serial = {
      requestPort: this.requestPort,
      addEventListener: this.addEventListener,
      removeEventListener: this.removeEventListener,
    };
  }

  emit(chunk: string): void {
    this.currentPort?.emit(chunk);
  }

  async disconnect(): Promise<void> {
    if (!this.currentPort) return;
    const port = this.currentPort;
    await port.close();
    this.currentPort = null;
    this.dispatchDisconnect(port);
  }

  isOpen(): boolean {
    return this.currentPort?.isOpen() ?? false;
  }

  private requestPort = async (): Promise<SerialPortLike> => {
    const port = new SerialPortStub(
      {
        script: this.script.slice(),
        intervalMs: this.intervalMs,
      },
      () => {
        if (this.currentPort === port) {
          this.currentPort = null;
        }
      }
    );
    this.currentPort = port;
    return port;
  };

  private addEventListener = (type: 'disconnect', listener: SerialDisconnectListener): void => {
    if (type !== 'disconnect') return;
    this.listeners.add(listener);
  };

  private removeEventListener = (type: 'disconnect', listener: SerialDisconnectListener): void => {
    if (type !== 'disconnect') return;
    this.listeners.delete(listener);
  };

  private dispatchDisconnect(port: SerialPortLike) {
    const event = { type: 'disconnect', target: port } as Event & { readonly target: SerialPortLike };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const createSerialTransportStub = (options?: SerialTransportStubOptions) =>
  new SerialTransportStub(options);

export const defaultSerialScript = DEFAULT_SCRIPT.slice();

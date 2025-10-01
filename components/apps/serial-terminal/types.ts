export interface SerialPortLike {
  readonly readable: ReadableStream<Uint8Array> | null;
  close(): Promise<void>;
  open(options: { baudRate: number }): Promise<void>;
}

export interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  addEventListener(
    type: 'disconnect',
    listener: (ev: Event & { readonly target: SerialPortLike }) => void,
  ): void;
  removeEventListener(
    type: 'disconnect',
    listener: (ev: Event & { readonly target: SerialPortLike }) => void,
  ): void;
}

export type NavigatorSerial = Navigator & { serial: SerialLike };

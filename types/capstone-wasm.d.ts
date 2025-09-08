declare module 'capstone-wasm' {
  /** Constructor for creating a Capstone disassembler instance. */
  export class Capstone {
    constructor(arch: number, mode: number);
    disasm(code: Uint8Array, options: { address: number }): any[];
    close(): void;
  }

  /** Collection of numeric constants used to configure Capstone. */
  export const Const: Record<string, number>;

  /** Loads the underlying WebAssembly module. */
  export function loadCapstone(): Promise<void>;
}

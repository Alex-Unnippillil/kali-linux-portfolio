// Minimal server-side stub that mirrors the capstone-wasm API.
// It allows SSR to import the module without attempting to
// initialize WebAssembly in the Node runtime.

export type DisasmOptions = {
  address?: number;
};

export type Instruction = {
  address?: number;
  mnemonic?: string;
  op_str?: string;
};

export class Capstone {
  constructor(_arch?: number, _mode?: number) {}

  disasm(_bytes: Uint8Array, _options?: DisasmOptions): Instruction[] {
    return [];
  }

  close() {}
}

export const Const = {
  ARCH_ARM: 0,
  ARCH_X86: 1,
  MODE_ARM: 0,
  MODE_32: 0,
};

export async function loadCapstone(): Promise<void> {
  return Promise.resolve();
}

export default { Capstone, Const, loadCapstone };

export type CapstoneArch = 'x86' | 'arm';

export interface CapstoneInstruction {
  address: number;
  bytes: Uint8Array;
  mnemonic: string;
  opStr: string;
}

export interface CapstoneWorkerApi {
  initialize(): Promise<void>;
  disassemble(
    buffer: ArrayBuffer,
    arch: CapstoneArch,
    address?: number,
  ): Promise<CapstoneInstruction[]>;
}

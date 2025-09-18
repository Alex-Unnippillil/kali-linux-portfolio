import { Capstone, Const, loadCapstone } from 'capstone-wasm';
import type { CapstoneArch, CapstoneInstruction } from '../types/capstone';

let loadPromise: Promise<void> | null = null;

const ensureCapstoneLoaded = async () => {
  if (!loadPromise) {
    loadPromise = loadCapstone();
  }
  await loadPromise;
};

const toInstruction = (insn: any): CapstoneInstruction => ({
  address: insn.address,
  bytes: new Uint8Array(insn.bytes),
  mnemonic: insn.mnemonic,
  opStr: insn.opStr,
});

const getMode = (arch: CapstoneArch): [number, number] => {
  if (arch === 'arm') {
    return [Const.ARCH_ARM, Const.MODE_ARM];
  }
  return [Const.ARCH_X86, Const.MODE_32];
};

export const warmCapstoneModule = async () => {
  await ensureCapstoneLoaded();
};

export const disassembleBuffer = async (
  buffer: ArrayBuffer,
  arch: CapstoneArch,
  address = 0x1000,
): Promise<CapstoneInstruction[]> => {
  await ensureCapstoneLoaded();
  const [archConst, modeConst] = getMode(arch);
  const engine = new Capstone(archConst, modeConst);
  try {
    const bytes = new Uint8Array(buffer);
    const instructions = engine.disasm(bytes, { address });
    return instructions.map(toInstruction);
  } finally {
    engine.close();
  }
};

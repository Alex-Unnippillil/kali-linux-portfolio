import { disassembleBuffer, warmCapstoneModule } from '../workers/capstoneRunner';
import type { CapstoneArch, CapstoneInstruction } from '../types/capstone';

export const warmCapstoneFallback = async () => {
  await warmCapstoneModule();
};

export const disassembleOnMainThread = async (
  buffer: ArrayBuffer,
  arch: CapstoneArch,
  address = 0x1000,
): Promise<CapstoneInstruction[]> => disassembleBuffer(buffer, arch, address);

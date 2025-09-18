import { transfer } from 'comlink';
import type {
  CapstoneArch,
  CapstoneInstruction,
  CapstoneWorkerApi,
} from '../types/capstone';
import { createWorker } from './createWorker';
import { disassembleOnMainThread, warmCapstoneFallback } from './capstoneFallback';

const workerHandle = createWorker<CapstoneWorkerApi>(
  () =>
    new Worker(new URL('../workers/capstone.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

export const warmCapstone = async () => {
  const remote = workerHandle.worker();
  if (!remote) {
    await warmCapstoneFallback();
    return;
  }
  await remote.initialize();
};

export const disassembleWithCapstone = async (
  buffer: ArrayBuffer,
  arch: CapstoneArch,
  address = 0x1000,
): Promise<CapstoneInstruction[]> => {
  const remote = workerHandle.worker();
  if (!remote) {
    return disassembleOnMainThread(buffer, arch, address);
  }
  return remote.disassemble(transfer(buffer, [buffer]), arch, address);
};

export const disposeCapstoneWorker = () => {
  workerHandle.terminate();
};

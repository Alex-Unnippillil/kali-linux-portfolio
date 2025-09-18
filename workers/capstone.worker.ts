import { expose } from 'comlink';
import type { CapstoneWorkerApi } from '../types/capstone';
import { disassembleBuffer, warmCapstoneModule } from './capstoneRunner';

const api: CapstoneWorkerApi = {
  async initialize() {
    await warmCapstoneModule();
  },
  async disassemble(buffer, arch, address = 0x1000) {
    return disassembleBuffer(buffer, arch, address);
  },
};

expose(api);

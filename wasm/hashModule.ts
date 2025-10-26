import { loadWasmModule, WasmModuleHandle } from './runtime';

const WASM_HASH_BYTES = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 7, 1, 96, 2, 127, 127, 1, 127, 3, 2, 1, 0,
  5, 3, 1, 0, 1, 7, 17, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 4, 104, 97,
  115, 104, 0, 0, 10, 48, 1, 46, 1, 2, 127, 32, 0, 32, 1, 106, 33, 2, 3, 64,
  32, 0, 32, 2, 79, 4, 64, 32, 3, 15, 11, 32, 3, 32, 0, 45, 0, 0, 106, 33, 3,
  32, 0, 65, 1, 106, 33, 0, 12, 0, 11, 32, 3, 11, 0, 31, 4, 110, 97, 109, 101,
  2, 24, 1, 0, 4, 0, 3, 112, 116, 114, 1, 3, 108, 101, 110, 2, 3, 101, 110,
  100, 3, 4, 104, 97, 115, 104,
]);

export interface HashAccelerator {
  hash(input: Uint8Array | string): number;
  release(): void;
  wasWasmUsed: boolean;
}

interface NativeHashExports {
  memory: WebAssembly.Memory;
  hash(ptr: number, len: number): number;
}

interface HashModuleExports {
  hashBytes(buffer: Uint8Array): number;
}

function ensureCapacity(memory: WebAssembly.Memory, length: number): Uint8Array {
  const pageSize = 65_536;
  if (memory.buffer.byteLength < length) {
    const additional = Math.ceil(
      (length - memory.buffer.byteLength) / pageSize,
    );
    memory.grow(additional);
  }
  return new Uint8Array(memory.buffer, 0, length);
}

function toBytes(input: Uint8Array | string): Uint8Array {
  if (typeof input === 'string') {
    return new TextEncoder().encode(input);
  }
  return input;
}

function createJsFallback(): HashModuleExports {
  return {
    hashBytes(buffer: Uint8Array) {
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        sum = (sum + buffer[i]) >>> 0;
      }
      return sum;
    },
  };
}

async function createNativeHasher(): Promise<WasmModuleHandle<HashModuleExports>> {
  return loadWasmModule<HashModuleExports>({
    name: 'hash-accelerator',
    moduleBytes: WASM_HASH_BYTES,
    memory: {
      initial: 1,
      pool: 'hash-accelerator',
    },
    fallback: createJsFallback,
    setup(instance) {
      const exports = instance.exports as unknown as NativeHashExports;
      const memory = exports.memory;
      return {
        hashBytes(buffer: Uint8Array) {
          const view = ensureCapacity(memory, buffer.length);
          view.set(buffer);
          const result = exports.hash(0, buffer.length);
          return result >>> 0;
        },
      };
    },
  });
}

export async function createHashAccelerator(): Promise<HashAccelerator> {
  const handle = await createNativeHasher();
  return {
    hash(input: Uint8Array | string) {
      const bytes = toBytes(input);
      return handle.exports.hashBytes(bytes);
    },
    release() {
      handle.release();
    },
    wasWasmUsed: handle.wasWasmUsed,
  };
}

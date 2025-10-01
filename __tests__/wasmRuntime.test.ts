import { createHashAccelerator } from '../wasm/hashModule';
import { loadWasmModule, resetWasmRuntimeState } from '../wasm/runtime';

describe('WASM runtime', () => {
  beforeEach(() => {
    resetWasmRuntimeState();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_WASM_RUNTIME;
    delete process.env.ENABLE_WASM_RUNTIME;
    const globalObject = globalThis as {
      __KALI_FEATURES__?: unknown;
    };
    delete globalObject.__KALI_FEATURES__;
    resetWasmRuntimeState();
  });

  it('falls back to the JS implementation when the feature flag disables WASM', async () => {
    process.env.NEXT_PUBLIC_ENABLE_WASM_RUNTIME = 'disabled';
    const accelerator = await createHashAccelerator();
    expect(accelerator.wasWasmUsed).toBe(false);
    expect(accelerator.hash('abc')).toBe(294);
    accelerator.release();
  });

  it('loads the WASM module and produces deterministic hashes when enabled', async () => {
    const accelerator = await createHashAccelerator();
    expect(accelerator.wasWasmUsed).toBe(true);
    expect(accelerator.hash('abc')).toBe(294);
    expect(accelerator.hash(new Uint8Array([1, 2, 3]))).toBe(6);
    accelerator.release();
  });

  it('gracefully falls back if instantiation fails', async () => {
    const handle = await loadWasmModule<{ ok: boolean }>({
      name: 'broken-module',
      moduleBytes: new Uint8Array([0, 1, 2, 3]),
      fallback: () => ({ ok: true }),
      setup() {
        throw new Error('Should not run');
      },
    });

    expect(handle.wasWasmUsed).toBe(false);
    expect(handle.exports).toEqual({ ok: true });
    handle.release();
  });
});

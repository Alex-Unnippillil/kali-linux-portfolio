import { createLogger } from '../lib/logger';

const logger = createLogger('wasm-runtime');

export interface WasmCapabilityReport {
  supported: boolean;
  sharedMemory: boolean;
  threads: boolean;
  bulkMemory: boolean;
}

export interface MemoryPoolConfig {
  initial: number;
  maximum?: number;
  shared?: boolean;
  /**
   * Optional pool identifier used to reuse a memory instance across modules
   * that can safely share the same backing store.
   */
  pool?: string;
}

export interface WasmRuntimeContext {
  memory?: WebAssembly.Memory;
  capabilities: WasmCapabilityReport;
}

export interface WorkerProxy {
  invoke<T = unknown>(exportName: string, ...args: unknown[]): Promise<T>;
  terminate(): void;
  worker: Worker;
}

export interface WasmModuleHandle<TExports> {
  name: string;
  exports: TExports;
  memory?: WebAssembly.Memory;
  release(): void;
  /**
   * Indicates whether the WebAssembly path was used instead of the fallback.
   */
  wasWasmUsed: boolean;
  /**
   * Provides the detected capabilities that were used to decide between WASM
   * and the fallback implementation.
   */
  capabilities: WasmCapabilityReport;
  workerProxy?: WorkerProxy;
}

export type ImportObjectFactory = (
  context: WasmRuntimeContext,
) => WebAssembly.Imports;

export type WorkerFactory = () => Worker;

export interface WasmModuleConfig<TExports> {
  name: string;
  moduleUrl?: string;
  moduleBytes?: ArrayBuffer | ArrayBufferView;
  cacheKey?: string;
  importObject?: WebAssembly.Imports | ImportObjectFactory;
  memory?: MemoryPoolConfig;
  fallback: () => Promise<TExports> | TExports;
  setup?: (
    instance: WebAssembly.Instance,
    context: WasmRuntimeContext,
  ) => Promise<TExports> | TExports;
  timeoutMs?: number;
  useWorker?: boolean | WorkerFactory;
}

const DEFAULT_TIMEOUT_MS = 5_000;
const moduleCache = new Map<string, WebAssembly.Module>();

type MemoryPool = {
  memory: WebAssembly.Memory;
  refCount: number;
  descriptor: WebAssembly.MemoryDescriptor;
};

const memoryPools = new Map<string, MemoryPool>();
let cachedCapabilities: WasmCapabilityReport | null = null;

function parseBooleanFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'enabled', 'on', 'yes'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'disabled', 'off', 'no'].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function resolveFeatureFlag(defaultValue: boolean): boolean {
  const envFlag =
    parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_WASM_RUNTIME) ??
    parseBooleanFlag(process.env.ENABLE_WASM_RUNTIME);
  if (envFlag !== null) {
    return envFlag;
  }

  if (typeof globalThis === 'object') {
    const globalFlag = parseBooleanFlag(
      (globalThis as any).__KALI_FEATURES__?.wasmRuntime,
    );
    if (globalFlag !== null) {
      return globalFlag;
    }
  }

  return defaultValue;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    }),
  ]);
}

function detectSharedMemorySupport(): boolean {
  try {
    if (typeof SharedArrayBuffer === 'undefined') {
      return false;
    }
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 1,
      shared: true,
    });
    // Trigger usage of the memory so engines allocate it eagerly.
    const view = new Uint8Array(memory.buffer);
    view[0] = view[0];
    return true;
  } catch {
    return false;
  }
}

function detectBulkMemorySupport(): boolean {
  return typeof WebAssembly === 'object' && 'Memory' in WebAssembly;
}

export function detectWasmCapabilities(): WasmCapabilityReport {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const supported = typeof WebAssembly !== 'undefined';

  const sharedMemory = supported && detectSharedMemorySupport();
  const threads = sharedMemory && typeof Atomics !== 'undefined';
  const bulkMemory = supported && detectBulkMemorySupport();

  cachedCapabilities = { supported, sharedMemory, threads, bulkMemory };
  return cachedCapabilities;
}

async function fetchModuleBytes(
  config: WasmModuleConfig<unknown>,
): Promise<ArrayBuffer> {
  if (config.moduleBytes) {
    if (config.moduleBytes instanceof ArrayBuffer) {
      return config.moduleBytes;
    }
    const view = config.moduleBytes as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }

  if (!config.moduleUrl) {
    throw new Error(`Module "${config.name}" did not provide bytes or a URL.`);
  }

  const response = await fetch(config.moduleUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch WASM module at ${config.moduleUrl}: ${response.status}`,
    );
  }
  return response.arrayBuffer();
}

function getMemoryPoolKey(
  config: MemoryPoolConfig,
  shared: boolean,
): string {
  const maximumPart =
    typeof config.maximum === 'number' ? `:${config.maximum}` : ':none';
  const poolId = config.pool ?? `${config.initial}${maximumPart}`;
  return `${poolId}:${shared ? 'shared' : 'private'}`;
}

function acquireMemory(
  config: MemoryPoolConfig | undefined,
  capabilities: WasmCapabilityReport,
): { memory?: WebAssembly.Memory; poolKey?: string } {
  if (!config) {
    return {};
  }

  const sharedRequested = Boolean(config.shared);
  const sharedAvailable = sharedRequested && capabilities.sharedMemory;
  const poolKey = getMemoryPoolKey(config, sharedAvailable);
  let pool = memoryPools.get(poolKey);
  if (!pool) {
    const descriptor: WebAssembly.MemoryDescriptor = {
      initial: config.initial,
    };
    if (typeof config.maximum === 'number') {
      descriptor.maximum = config.maximum;
    }
    if (sharedAvailable) {
      descriptor.shared = true;
    } else if (sharedRequested && !capabilities.sharedMemory) {
      logger.warn('Shared memory requested but not supported; falling back.', {
        pool: config.pool ?? config.initial,
      });
    }

    pool = {
      memory: new WebAssembly.Memory(descriptor),
      refCount: 0,
      descriptor,
    };
    memoryPools.set(poolKey, pool);
  }
  pool.refCount += 1;
  return { memory: pool.memory, poolKey };
}

function releaseMemory(poolKey?: string): void {
  if (!poolKey) {
    return;
  }
  const pool = memoryPools.get(poolKey);
  if (!pool) {
    return;
  }
  pool.refCount -= 1;
  if (pool.refCount <= 0) {
    memoryPools.delete(poolKey);
  }
}

async function compileModule(
  config: WasmModuleConfig<unknown>,
  bytes: ArrayBuffer,
): Promise<WebAssembly.Module> {
  const cacheKey = config.cacheKey ?? config.moduleUrl ?? config.name;
  const cached = moduleCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const compiledModule = await WebAssembly.compile(bytes);
  moduleCache.set(cacheKey, compiledModule);
  return compiledModule;
}

function ensureEnvImport(importObject: WebAssembly.Imports, memory?: WebAssembly.Memory) {
  if (!memory) {
    return importObject;
  }
  const normalized = { ...importObject } as Record<string, Record<string, any>>;
  normalized.env = {
    ...(normalized.env ?? {}),
    memory,
  };
  return normalized;
}

function getWorkerFactory(useWorker: boolean | WorkerFactory | undefined):
  | WorkerFactory
  | null {
  if (!useWorker) {
    return null;
  }
  if (typeof Worker === 'undefined') {
    return null;
  }
  if (typeof useWorker === 'function') {
    return useWorker;
  }
  return createInlineWorker;
}

function createInlineWorker(): Worker {
  const source = `
    let instance = null;
    let memory = null;

    async function init(config) {
      try {
        if (config.memoryDescriptor) {
          memory = new WebAssembly.Memory(config.memoryDescriptor);
        }
        const imports = {};
        if (memory) {
          imports.env = { memory };
        }
        const module = await WebAssembly.instantiate(config.moduleBytes, imports);
        instance = module.instance;
        self.postMessage({ type: 'ready' });
      } catch (error) {
        self.postMessage({ type: 'error', message: error?.message || String(error) });
      }
    }

    function handleCall(message) {
      if (!instance) {
        self.postMessage({ type: 'error', callId: message.callId, message: 'Instance not ready' });
        return;
      }
      try {
        const result = instance.exports[message.exportName](...(message.args || []));
        self.postMessage({ type: 'result', callId: message.callId, result });
      } catch (error) {
        self.postMessage({ type: 'error', callId: message.callId, message: error?.message || String(error) });
      }
    }

    self.onmessage = (event) => {
      const message = event.data || {};
      switch (message.type) {
        case 'init':
          init(message.config);
          break;
        case 'call':
          handleCall(message);
          break;
        case 'terminate':
          self.close();
          break;
        default:
          break;
      }
    };
  `;
  const blob = new Blob([source], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);
  return worker;
}

function buildWorkerProxy(
  factory: WorkerFactory,
  moduleBytes: ArrayBuffer,
  memoryDescriptor?: WebAssembly.MemoryDescriptor,
  timeoutMs: number,
): Promise<WorkerProxy> {
  return new Promise((resolve, reject) => {
    const worker = factory();
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Timed out initialising WASM worker.'));
    }, timeoutMs);

    const pending = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
    let nextCallId = 0;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data || {};
      switch (data.type) {
        case 'ready':
          clearTimeout(timer);
          resolve({
            worker,
            invoke(exportName: string, ...args: unknown[]) {
              const callId = nextCallId += 1;
              return new Promise((callResolve, callReject) => {
                pending.set(callId, { resolve: callResolve, reject: callReject });
                worker.postMessage({ type: 'call', exportName, args, callId });
              });
            },
            terminate() {
              worker.postMessage({ type: 'terminate' });
              worker.terminate();
              pending.forEach(({ reject: callReject }) =>
                callReject(new Error('Worker terminated.')),
              );
              pending.clear();
            },
          });
          break;
        case 'result': {
          const entry = pending.get(data.callId);
          if (entry) {
            entry.resolve(data.result);
            pending.delete(data.callId);
          }
          break;
        }
        case 'error': {
          const entry = pending.get(data.callId);
          if (entry) {
            entry.reject(new Error(data.message));
            pending.delete(data.callId);
          } else {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(data.message));
          }
          break;
        }
        default:
          break;
      }
    };

    worker.postMessage(
      {
        type: 'init',
        config: {
          moduleBytes,
          memoryDescriptor,
        },
      },
      [moduleBytes],
    );
  });
}

function shouldUseWasm(capabilities: WasmCapabilityReport): boolean {
  return resolveFeatureFlag(capabilities.supported);
}

async function instantiateModule<TExports>(
  config: WasmModuleConfig<TExports>,
  capabilities: WasmCapabilityReport,
  bytes: ArrayBuffer,
  memory: WebAssembly.Memory | undefined,
  timeoutMs: number,
): Promise<WasmModuleHandle<TExports>> {
  const workerFactory = getWorkerFactory(config.useWorker);
  if (workerFactory && config.importObject) {
    logger.warn(
      'Worker integration does not support custom imports; falling back to main thread.',
      { name: config.name },
    );
  }

  if (workerFactory && !config.importObject) {
    const memoryDescriptor = memory
      ? {
          initial: memory.buffer.byteLength / 65_536,
          maximum: undefined,
          shared: false,
        }
      : undefined;

    try {
      const proxy = await buildWorkerProxy(
        workerFactory,
        bytes.slice(0),
        memoryDescriptor,
        timeoutMs,
      );
      return {
        name: config.name,
        exports: ({} as unknown) as TExports,
        release() {
          proxy.terminate();
        },
        wasWasmUsed: true,
        capabilities,
        workerProxy: proxy,
      };
    } catch (error) {
      logger.warn('Worker initialisation failed; falling back to main thread.', {
        name: config.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const compiledModule = await compileModule(config, bytes);
  const imports =
    typeof config.importObject === 'function'
      ? config.importObject({ memory, capabilities })
      : config.importObject ?? {};
  const normalizedImports = ensureEnvImport(imports, memory);

  const instance = await WebAssembly.instantiate(
    compiledModule,
    normalizedImports,
  );
  const exports = config.setup
    ? await config.setup(instance, { memory, capabilities })
    : ((instance.exports as unknown) as TExports);

  return {
    name: config.name,
    exports,
    memory,
    release() {
      // Nothing to dispose besides releasing pooled memory in the caller.
    },
    wasWasmUsed: true,
    capabilities,
  };
}

async function loadFallback<TExports>(
  config: WasmModuleConfig<TExports>,
  capabilities: WasmCapabilityReport,
): Promise<WasmModuleHandle<TExports>> {
  const exports = await config.fallback();
  return {
    name: config.name,
    exports,
    release() {},
    wasWasmUsed: false,
    capabilities,
  };
}

export async function loadWasmModule<TExports>(
  config: WasmModuleConfig<TExports>,
): Promise<WasmModuleHandle<TExports>> {
  const capabilities = detectWasmCapabilities();
  if (!capabilities.supported || !shouldUseWasm(capabilities)) {
    return loadFallback(config, capabilities);
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { memory, poolKey } = acquireMemory(config.memory, capabilities);

  try {
    const bytes = await withTimeout(
      fetchModuleBytes(config),
      timeoutMs,
      `Timed out fetching WASM module ${config.name}.`,
    );

    const handle = await withTimeout(
      instantiateModule(config, capabilities, bytes, memory, timeoutMs),
      timeoutMs,
      `Timed out instantiating WASM module ${config.name}.`,
    );

    const originalRelease = handle.release.bind(handle);
    handle.release = () => {
      try {
        originalRelease();
      } finally {
        releaseMemory(poolKey);
      }
    };

    return handle;
  } catch (error) {
    logger.warn('WASM module failed; using fallback.', {
      name: config.name,
      error: error instanceof Error ? error.message : String(error),
    });
    releaseMemory(poolKey);
    return loadFallback(config, capabilities);
  }
}

export function resetWasmRuntimeState(): void {
  moduleCache.clear();
  memoryPools.clear();
  cachedCapabilities = null;
}

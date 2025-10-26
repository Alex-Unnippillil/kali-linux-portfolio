// Supported typed array constructors used in the app. Extend as needed.
type SupportedTypedArray =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

interface TypedArrayConstructor<T extends SupportedTypedArray> {
  new (buffer: ArrayBufferLike, byteOffset: number, length: number): T;
  readonly BYTES_PER_ELEMENT: number;
  readonly name: string;
}

type PoolKey = keyof typeof constructors;

interface PoolConfig {
  /** Maximum number of buffers to retain. */
  maxBuffers: number;
  /**
   * Hard cap on total bytes retained for this pool. Once exceeded the oldest
   * buffers are dropped instead of being recycled.
   */
  maxTotalBytes: number;
  /**
   * When true the buffer is zeroed before being returned to the pool. Helpful
   * for deterministic tests at the cost of extra work.
   */
  zeroFill: boolean;
}

interface PoolStats {
  hits: number;
  misses: number;
  available: number;
  totalBytes: number;
  config: PoolConfig;
}

interface PoolState {
  buffers: Array<ArrayBufferLike>;
  config: PoolConfig;
  totalBytes: number;
  hits: number;
  misses: number;
}

const DEFAULT_CONFIG: PoolConfig = {
  maxBuffers: 64,
  maxTotalBytes: 8 * 1024 * 1024,
  zeroFill: false,
};

const constructors = {
  Uint8Array,
  Uint8ClampedArray,
  Uint16Array,
  Uint32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
};

const supportedConstructors = new Set(
  Object.values(constructors) as TypedArrayConstructor<SupportedTypedArray>[],
);

const pools = new Map<TypedArrayConstructor<SupportedTypedArray>, PoolState>();

const hasPerformance =
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.measure === 'function';

const canClearMarks =
  typeof performance !== 'undefined' && typeof performance.clearMarks === 'function';

const tryMark = (name: string) => {
  if (!hasPerformance) return;
  try {
    performance.mark(name);
  } catch {
    // ignore unsupported marks
  }
};

const tryMeasure = (name: string, start: string, end: string) => {
  if (!hasPerformance) return;
  try {
    performance.measure(name, start, end);
  } catch {
    // Ignore measure failures (e.g. duplicate marks)
  }
};

const tryClearMarks = (...names: string[]) => {
  if (!canClearMarks) return;
  for (const name of names) {
    try {
      performance.clearMarks(name);
    } catch {
      // swallow
    }
  }
};

const ensurePool = (
  ctor: TypedArrayConstructor<SupportedTypedArray>,
): PoolState => {
  let state = pools.get(ctor);
  if (!state) {
    state = {
      buffers: [],
      config: { ...DEFAULT_CONFIG },
      totalBytes: 0,
      hits: 0,
      misses: 0,
    };
    pools.set(ctor, state);
  }
  return state;
};

const trimPool = (state: PoolState) => {
  const { buffers, config } = state;
  while (buffers.length > config.maxBuffers) {
    const removed = buffers.shift();
    if (removed) {
      state.totalBytes -= removed.byteLength;
    }
  }
  while (
    state.totalBytes > config.maxTotalBytes &&
    buffers.length > 0
  ) {
    const removed = buffers.shift();
    if (removed) {
      state.totalBytes -= removed.byteLength;
    }
  }
};

const isSupportedView = (view: ArrayBufferView): view is SupportedTypedArray => {
  return supportedConstructors.has(
    view.constructor as TypedArrayConstructor<SupportedTypedArray>,
  );
};

const acquire = <T extends SupportedTypedArray>(
  ctor: TypedArrayConstructor<T>,
  length: number,
): T => {
  supportedConstructors.add(ctor as TypedArrayConstructor<SupportedTypedArray>);
  const state = ensurePool(ctor);
  const requiredBytes = length * ctor.BYTES_PER_ELEMENT;
  const startMark = `pool:${ctor.name}:acquire:start`;
  const endMark = `pool:${ctor.name}:acquire:end`;
  tryMark(startMark);
  let buffer: ArrayBufferLike | undefined;
  for (let i = 0; i < state.buffers.length; i += 1) {
    const candidate = state.buffers[i];
    if (candidate.byteLength >= requiredBytes) {
      buffer = candidate;
      state.buffers.splice(i, 1);
      state.totalBytes -= candidate.byteLength;
      state.hits += 1;
      tryMark(`pool:${ctor.name}:hit`);
      break;
    }
  }
  if (!buffer) {
    buffer = new ArrayBuffer(requiredBytes);
    state.misses += 1;
    tryMark(`pool:${ctor.name}:miss`);
  }
  const view = new ctor(buffer, 0, length);
  tryMark(endMark);
  tryMeasure(`pool:${ctor.name}:acquire`, startMark, endMark);
  tryClearMarks(startMark, endMark);
  return view;
};

const releaseBuffer = (
  ctor: TypedArrayConstructor<SupportedTypedArray>,
  state: PoolState,
  buffer: ArrayBufferLike,
) => {
  if (state.buffers.length >= state.config.maxBuffers) {
    return;
  }
  if (state.totalBytes + buffer.byteLength > state.config.maxTotalBytes) {
    return;
  }
  if (state.config.zeroFill) {
    const wipe = new ctor(buffer, 0, buffer.byteLength / ctor.BYTES_PER_ELEMENT);
    wipe.fill(0);
  }
  state.buffers.push(buffer);
  state.totalBytes += buffer.byteLength;
  tryMark(`pool:${ctor.name}:release`);
};

export const configureTypedArrayPools = (
  overrides: Partial<Record<PoolKey, Partial<PoolConfig>>>,
) => {
  (Object.keys(overrides) as PoolKey[]).forEach((key) => {
    const ctor = constructors[key];
    const state = ensurePool(ctor);
    state.config = {
      ...state.config,
      ...overrides[key],
    };
    trimPool(state);
  });
};

export const rentTypedArray = <T extends SupportedTypedArray>(
  ctor: TypedArrayConstructor<T>,
  length: number,
): T => acquire(ctor, length);

export const rentUint8Array = (length: number) => acquire(Uint8Array, length);
export const rentUint8ClampedArray = (length: number) => acquire(Uint8ClampedArray, length);
export const rentUint16Array = (length: number) => acquire(Uint16Array, length);
export const rentUint32Array = (length: number) => acquire(Uint32Array, length);
export const rentInt8Array = (length: number) => acquire(Int8Array, length);
export const rentInt16Array = (length: number) => acquire(Int16Array, length);
export const rentInt32Array = (length: number) => acquire(Int32Array, length);
export const rentFloat32Array = (length: number) => acquire(Float32Array, length);
export const rentFloat64Array = (length: number) => acquire(Float64Array, length);

export const releaseTypedArray = (view: ArrayBufferView) => {
  const ctor = view.constructor as TypedArrayConstructor<SupportedTypedArray>;
  if (!ctor || typeof ctor.BYTES_PER_ELEMENT !== 'number') return;
  if (!supportedConstructors.has(ctor)) return;
  const state = ensurePool(ctor);
  if (!isSupportedView(view)) return;
  if (view.byteOffset !== 0) return;
  const { buffer } = view;
  if (
    !(buffer instanceof ArrayBuffer) &&
    !(typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer)
  ) {
    return;
  }
  releaseBuffer(ctor, state, buffer);
};

export const getPoolStats = (): Record<PoolKey, PoolStats> => {
  const result = {} as Record<PoolKey, PoolStats>;
  (Object.keys(constructors) as PoolKey[]).forEach((key) => {
    const ctor = constructors[key];
    const state = ensurePool(ctor);
    result[key] = {
      hits: state.hits,
      misses: state.misses,
      available: state.buffers.length,
      totalBytes: state.totalBytes,
      config: { ...state.config },
    };
  });
  return result;
};

export const resetTypedArrayPools = () => {
  pools.clear();
};

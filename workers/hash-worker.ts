import {
  createMD5,
  createSHA1,
  createSHA256,
  createSHA384,
  createSHA512,
  createSHA3,
  createBLAKE3,
  createCRC32,
} from 'hash-wasm';

export type Algorithm =
  | 'MD5'
  | 'SHA-1'
  | 'SHA-256'
  | 'SHA-384'
  | 'SHA-512'
  | 'SHA3-256'
  | 'SHA3-512'
  | 'BLAKE3'
  | 'CRC32'
  | 'BASE64'
  | 'BASE64URL'
  | 'URL';

export interface HashWorkerRequest {
  file?: File;
  text?: string;
  algorithms: Algorithm[];
}

export interface ProgressMessage {
  type: 'progress';
  loaded: number;
  total: number;
}

export interface ResultMessage {
  type: 'result';
  results: Record<string, string>;
}

const hashFactories: Partial<Record<Algorithm, () => Promise<any>>> = {
  MD5: createMD5,
  'SHA-1': createSHA1,
  'SHA-256': createSHA256,
  'SHA-384': createSHA384,
  'SHA-512': createSHA512,
  'SHA3-256': () => createSHA3(256),
  'SHA3-512': () => createSHA3(512),
  BLAKE3: createBLAKE3,
  CRC32: createCRC32,
};

const isHashAlgorithm = (alg: Algorithm) => alg in hashFactories;

const instantiateHashers = async (algorithms: Algorithm[]) => {
  const pairs = await Promise.all(
    algorithms
      .filter(isHashAlgorithm)
      .map(async (alg) => {
        const factory = hashFactories[alg];
        if (!factory) return null;
        return [alg, await factory()] as const;
      }),
  );
  return Object.fromEntries(pairs.filter(Boolean) as Array<[Algorithm, any]>);
};

const digestHasher = (alg: string, hasher: any) => {
  if (alg === 'CRC32') {
    const num = hasher.digest();
    return num.toString(16).padStart(8, '0');
  }
  return hasher.digest('hex');
};

const postProgress = (loaded: number, total: number) => {
  (self as any).postMessage({
    type: 'progress',
    loaded,
    total,
  } as ProgressMessage);
};

const updateHashers = (hashers: Record<string, any>, chunk: Uint8Array) => {
  for (const hasher of Object.values(hashers)) {
    hasher.update(chunk);
  }
};

const finalizeHashers = (hashers: Record<string, any>) => {
  const results: Record<string, string> = {};
  for (const [alg, hasher] of Object.entries(hashers)) {
    results[alg] = digestHasher(alg, hasher);
  }
  return results;
};

const handleFile = async (file: File, algorithms: Algorithm[]) => {
  const hashers = await instantiateHashers(algorithms);
  const reader = file.stream().getReader();
  let loaded = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    loaded += value.length;
    updateHashers(hashers, value);
    postProgress(loaded, file.size);
  }

  return finalizeHashers(hashers);
};

const applyTextEncodings = (text: string, algorithms: Algorithm[], results: Record<string, string>) => {
  if (algorithms.includes('BASE64')) {
    results.BASE64 = btoa(text);
  }
  if (algorithms.includes('BASE64URL')) {
    results.BASE64URL = btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  if (algorithms.includes('URL')) {
    results.URL = encodeURIComponent(text);
  }
};

const handleText = async (text: string, algorithms: Algorithm[]) => {
  const data = new TextEncoder().encode(text);
  const hashers = await instantiateHashers(algorithms);
  if (Object.keys(hashers).length) {
    updateHashers(hashers, data);
  }
  const results = finalizeHashers(hashers);
  applyTextEncodings(text, algorithms, results);
  postProgress(data.length, data.length);
  return results;
};

self.onmessage = async ({ data }: MessageEvent<HashWorkerRequest>) => {
  const { file, text, algorithms } = data;
  const results: Record<string, string> = {};

  if (file) {
    Object.assign(results, await handleFile(file, algorithms));
  } else if (typeof text === 'string') {
    Object.assign(results, await handleText(text, algorithms));
  }

  (self as any).postMessage({ type: 'result', results } as ResultMessage);
};

export {};

import {
  createMD5,
  createSHA1,
  createSHA256,
  createSHA384,
  createSHA512,
  createSHA3,
  createBLAKE3,
  createCRC32,
  type IHasher,
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

self.onmessage = async ({ data }: MessageEvent<HashWorkerRequest>) => {
  const { file, text, algorithms } = data;
  const results: Record<string, string> = {};

  if (file) {
    const hashers: Partial<Record<Algorithm, IHasher>> = {};

    for (const alg of algorithms) {
      switch (alg) {
        case 'MD5':
          hashers[alg] = await createMD5();
          break;
        case 'SHA-1':
          hashers[alg] = await createSHA1();
          break;
        case 'SHA-256':
          hashers[alg] = await createSHA256();
          break;
        case 'SHA-384':
          hashers[alg] = await createSHA384();
          break;
        case 'SHA-512':
          hashers[alg] = await createSHA512();
          break;
        case 'SHA3-256':
          hashers[alg] = await createSHA3(256);
          break;
        case 'SHA3-512':
          hashers[alg] = await createSHA3(512);
          break;
        case 'BLAKE3':
          hashers[alg] = await createBLAKE3();
          break;
        case 'CRC32':
          hashers[alg] = await createCRC32();
          break;
        default:
          break;
      }
    }

    const reader = file.stream().getReader();
    let loaded = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      loaded += value.length;
      for (const hasher of Object.values(hashers)) {
        hasher?.update(value);
      }
      self.postMessage({
        type: 'progress',
        loaded,
        total: file.size,
      } as ProgressMessage);
    }
    for (const alg of Object.keys(hashers) as Algorithm[]) {
      const hasher = hashers[alg];
      if (!hasher) continue;
        if (alg === 'CRC32') {
          const result = hasher.digest() as unknown;
          results[alg] =
            typeof result === 'number' ? result.toString(16) : String(result);
        } else {
          results[alg] = hasher.digest();
        }
    }
  } else if (typeof text === 'string') {
    const data = new TextEncoder().encode(text);

    // Hashing for text
    const hashAlgs = algorithms.filter(
      (a) => !['BASE64', 'BASE64URL', 'URL'].includes(a),
    );
    const hashers: Partial<Record<Algorithm, IHasher>> = {};
    for (const alg of hashAlgs) {
      switch (alg) {
        case 'MD5':
          hashers[alg] = await createMD5();
          break;
        case 'SHA-1':
          hashers[alg] = await createSHA1();
          break;
        case 'SHA-256':
          hashers[alg] = await createSHA256();
          break;
        case 'SHA-384':
          hashers[alg] = await createSHA384();
          break;
        case 'SHA-512':
          hashers[alg] = await createSHA512();
          break;
        case 'SHA3-256':
          hashers[alg] = await createSHA3(256);
          break;
        case 'SHA3-512':
          hashers[alg] = await createSHA3(512);
          break;
        case 'BLAKE3':
          hashers[alg] = await createBLAKE3();
          break;
        case 'CRC32':
          hashers[alg] = await createCRC32();
          break;
        default:
          break;
      }
    }

    for (const hasher of Object.values(hashers)) {
      hasher?.update(data);
    }

    for (const alg of Object.keys(hashers) as Algorithm[]) {
      const hasher = hashers[alg];
      if (!hasher) continue;
        if (alg === 'CRC32') {
          const result = hasher.digest() as unknown;
          results[alg] =
            typeof result === 'number' ? result.toString(16) : String(result);
        } else {
          results[alg] = hasher.digest();
        }
    }

    if (algorithms.includes('BASE64')) {
      results.BASE64 = btoa(text);
    }
    if (algorithms.includes('BASE64URL')) {
      results.BASE64URL = btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    if (algorithms.includes('URL')) {
      results.URL = encodeURIComponent(text);
    }

    self.postMessage({
      type: 'progress',
      loaded: data.length,
      total: data.length,
    } as ProgressMessage);
  }

  self.postMessage({ type: 'result', results } as ResultMessage);
};

export {};

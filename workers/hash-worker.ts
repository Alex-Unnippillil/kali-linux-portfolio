import {
  createBLAKE3,
  createCRC32,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA3,
  createSHA384,
  createSHA512,
} from 'hash-wasm';
import { registerWorkerHandler } from './pool/messages';

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

export interface HashWorkerProgress {
  loaded: number;
  total: number;
}

export interface HashWorkerResult {
  results: Record<string, string>;
}

const hashersByAlgorithm = async (algorithms: Algorithm[]) => {
  const hashers: Record<string, any> = {};
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
  return hashers;
};

registerWorkerHandler<HashWorkerRequest, HashWorkerResult, HashWorkerProgress>(
  async ({ file, text, algorithms }, context) => {
    const results: Record<string, string> = {};

    if (file) {
      const hashers = await hashersByAlgorithm(algorithms);
      const reader = file.stream().getReader();
      let loaded = 0;

      while (true) {
        if (context.isCancelled()) {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation errors
          }
          throw new DOMException('cancelled', 'AbortError');
        }
        const { value, done } = await reader.read();
        if (done) break;
        loaded += value.length;
        for (const hasher of Object.values(hashers)) {
          hasher.update(value);
        }
        context.reportProgress({ loaded, total: file.size });
      }

      for (const [alg, hasher] of Object.entries(hashers)) {
        if (alg === 'CRC32') {
          const num = hasher.digest();
          results[alg] = num.toString(16).padStart(8, '0');
        } else {
          results[alg] = hasher.digest('hex');
        }
      }
    } else if (typeof text === 'string') {
      const data = new TextEncoder().encode(text);
      const hashAlgs = algorithms.filter(
        (a) => !['BASE64', 'BASE64URL', 'URL'].includes(a),
      );
      const hashers = await hashersByAlgorithm(hashAlgs);

      for (const hasher of Object.values(hashers)) {
        hasher.update(data);
      }

      for (const [alg, hasher] of Object.entries(hashers)) {
        if (alg === 'CRC32') {
          const num = hasher.digest();
          results[alg] = num.toString(16).padStart(8, '0');
        } else {
          results[alg] = hasher.digest('hex');
        }
      }

      if (algorithms.includes('BASE64')) {
        results.BASE64 = btoa(text);
      }
      if (algorithms.includes('BASE64URL')) {
        results.BASE64URL = btoa(text)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      }
      if (algorithms.includes('URL')) {
        results.URL = encodeURIComponent(text);
      }

      context.reportProgress({ loaded: data.length, total: data.length });
    }

    return { results };
  },
);

export type SupportedAlgorithm = 'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512';

export interface EvidenceFileMetadata {
  id: string;
  name: string;
  expectedChecksum: string;
  algorithm?: SupportedAlgorithm;
  size?: number;
  /** Optional in-memory buffer for the evidence item. */
  buffer?: ArrayBuffer;
  /** Optional blob or file reference provided by the user. */
  file?: File | Blob;
  /** Optional URL to fetch the evidence content from. */
  source?: string;
}

export type VerificationStatus = 'match' | 'mismatch' | 'error' | 'skipped';

export interface FileVerificationResult {
  id: string;
  status: VerificationStatus;
  expectedChecksum: string;
  actualChecksum?: string;
  durationMs: number;
  message?: string;
}

export interface VerificationSummary {
  match: number;
  mismatch: number;
  error: number;
  skipped: number;
}

export interface VerificationProgress {
  processed: number;
  total: number;
  result: FileVerificationResult;
}

export interface VerifyEvidenceOptions {
  batchSize?: number;
  batchDelayMs?: number;
  signal?: AbortSignal;
  onFileStart?: (file: EvidenceFileMetadata, index: number) => void;
  onProgress?: (progress: VerificationProgress) => void;
}

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_BATCH_DELAY = 12;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve();
    } else {
      setTimeout(resolve, ms);
    }
  });

let cachedSubtle: SubtleCrypto | null = null;

const subtleFromEnvironment = (): SubtleCrypto | null => {
  if (cachedSubtle) {
    return cachedSubtle;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    cachedSubtle = globalThis.crypto.subtle;
    return cachedSubtle;
  }
  return null;
};

const toNodeAlgorithm = (algorithm: SupportedAlgorithm) => {
  switch (algorithm) {
    case 'SHA-1':
      return 'sha1';
    case 'SHA-384':
      return 'sha384';
    case 'SHA-512':
      return 'sha512';
    case 'SHA-256':
    default:
      return 'sha256';
  }
};

export const normalizeChecksum = (value: string) => value.replace(/\s+/g, '').toLowerCase();

export const computeChecksum = async (
  buffer: ArrayBuffer,
  algorithm: SupportedAlgorithm = 'SHA-256',
): Promise<string> => {
  const subtle = subtleFromEnvironment();
  if (subtle) {
    const digestBuffer = await subtle.digest(algorithm, buffer);
    const view = new Uint8Array(digestBuffer);
    let result = '';
    for (let i = 0; i < view.length; i += 1) {
      const hex = view[i].toString(16).padStart(2, '0');
      result += hex;
    }
    return result;
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    const cryptoModule: any = await import('node:crypto').catch(() => import('crypto'));
    if (cryptoModule?.webcrypto?.subtle && !cachedSubtle) {
      cachedSubtle = cryptoModule.webcrypto.subtle;
      return computeChecksum(buffer, algorithm);
    }
    if (typeof cryptoModule?.createHash === 'function') {
      const nodeAlgorithm = toNodeAlgorithm(algorithm);
      const hash = cryptoModule.createHash(nodeAlgorithm);
      hash.update(new Uint8Array(buffer));
      return hash.digest('hex');
    }
  }

  throw new Error('WebCrypto subtle API is unavailable in this environment');
};

const loadBuffer = async (
  file: EvidenceFileMetadata,
  signal?: AbortSignal,
): Promise<ArrayBuffer | null> => {
  if (file.buffer) {
    return file.buffer;
  }
  if (file.file) {
    return file.file.arrayBuffer();
  }
  if (file.source) {
    try {
      const response = await fetch(file.source, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch source (status ${response.status})`);
      }
      return await response.arrayBuffer();
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to fetch remote evidence source',
      );
    }
  }
  return null;
};

const initialSummary = (): VerificationSummary => ({ match: 0, mismatch: 0, error: 0, skipped: 0 });

export const verifyEvidenceFiles = async (
  files: EvidenceFileMetadata[],
  options: VerifyEvidenceOptions = {},
) => {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const batchDelayMs = options.batchDelayMs ?? DEFAULT_BATCH_DELAY;
  const summary = initialSummary();
  const results: FileVerificationResult[] = [];
  const total = files.length;
  let processed = 0;

  for (let offset = 0; offset < files.length; offset += batchSize) {
    if (options.signal?.aborted) {
      throw new DOMException('Verification aborted', 'AbortError');
    }
    const batch = files.slice(offset, offset + batchSize);
    for (let index = 0; index < batch.length; index += 1) {
      const file = batch[index];
      const absoluteIndex = offset + index;
      options.onFileStart?.(file, absoluteIndex);

      const startedAt = (typeof performance !== 'undefined' && performance.now()) || Date.now();
      let status: VerificationStatus = 'skipped';
      let actualChecksum: string | undefined;
      let message: string | undefined;

      try {
        const buffer = await loadBuffer(file, options.signal);
        if (!buffer) {
          status = 'skipped';
          message = 'No data available for checksum validation';
        } else {
          actualChecksum = await computeChecksum(buffer, file.algorithm);
          const expected = normalizeChecksum(file.expectedChecksum);
          const actual = normalizeChecksum(actualChecksum);
          status = actual === expected ? 'match' : 'mismatch';
          if (status === 'mismatch') {
            message = 'Checksum mismatch';
          }
        }
      } catch (err) {
        status = 'error';
        message = err instanceof Error ? err.message : 'Unknown verification error';
      }

      const finishedAt = (typeof performance !== 'undefined' && performance.now()) || Date.now();
      const durationMs = finishedAt - startedAt;
      processed += 1;

      const result: FileVerificationResult = {
        id: file.id,
        status,
        expectedChecksum: file.expectedChecksum,
        actualChecksum,
        durationMs,
        message,
      };
      results.push(result);
      summary[status] += 1;

      options.onProgress?.({ processed, total, result });

      if (options.signal?.aborted) {
        throw new DOMException('Verification aborted', 'AbortError');
      }
    }

    if (offset + batchSize < files.length) {
      await sleep(batchDelayMs);
    }
  }

  return { results, summary };
};

export type VerificationRun = Awaited<ReturnType<typeof verifyEvidenceFiles>>;


import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';

import {
  EvidenceFileMetadata,
  computeChecksum,
  normalizeChecksum,
  verifyEvidenceFiles,
} from '../apps/evidence-vault/utils/checksums';

declare global {
  // eslint-disable-next-line no-var
  var crypto: Crypto;
}

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

const encoder = new TextEncoder();

const cloneBuffer = (input: Uint8Array) =>
  input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);

describe('verifyEvidenceFiles', () => {
  it('processes 1k evidence records accurately without blocking', async () => {
    const files: EvidenceFileMetadata[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const payload = encoder.encode(`file-${i}`);
      const buffer = cloneBuffer(payload);
      const expectedChecksum = await computeChecksum(buffer, 'SHA-256');
      files.push({
        id: `file-${i}`,
        name: `file-${i}.txt`,
        expectedChecksum,
        buffer,
        algorithm: 'SHA-256',
      });
    }

    const onProgress = jest.fn();
    const { summary, results } = await verifyEvidenceFiles(files, {
      batchSize: 64,
      batchDelayMs: 0,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledTimes(1000);
    expect(summary.match).toBe(1000);
    expect(summary.mismatch).toBe(0);
    expect(summary.error).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('flags mismatched checksums and preserves formatting', async () => {
    const payload = encoder.encode('evidence-blob');
    const buffer = cloneBuffer(payload);
    const expectedChecksum = await computeChecksum(buffer, 'SHA-256');

    const sanitized = normalizeChecksum(expectedChecksum);
    const mismatched = (sanitized[0] === '0' ? '1' : '0') + sanitized.slice(1);
    const formattedMismatch = `${mismatched.slice(0, 10)} ${mismatched.slice(10)}`;

    const files: EvidenceFileMetadata[] = [
      {
        id: 'expected-match',
        name: 'match.bin',
        expectedChecksum,
        buffer,
        algorithm: 'SHA-256',
      },
      {
        id: 'expected-mismatch',
        name: 'mismatch.bin',
        expectedChecksum: formattedMismatch,
        buffer,
        algorithm: 'SHA-256',
      },
    ];

    const { summary, results } = await verifyEvidenceFiles(files, {
      batchSize: 2,
      batchDelayMs: 0,
    });

    expect(summary.match).toBe(1);
    expect(summary.mismatch).toBe(1);
    const mismatchResult = results.find((r) => r.id === 'expected-mismatch');
    expect(mismatchResult?.status).toBe('mismatch');
    expect(mismatchResult?.expectedChecksum).toBe(formattedMismatch);
    expect(normalizeChecksum(mismatchResult?.expectedChecksum || '')).toBe(mismatched);
  });
});


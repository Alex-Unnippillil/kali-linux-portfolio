import { Buffer } from 'buffer';
import { performance } from 'perf_hooks';
import {
  PREVIEW_CHUNK_BYTES,
  buildPreviewFromBase64,
  bytesToHex,
  bytesToText,
  decodeBase64Chunk,
} from '../components/apps/autopsy/preview-utils';

const toBase64 = (input: string | Uint8Array) => {
  if (typeof input === 'string') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  return Buffer.from(input).toString('base64');
};

describe('autopsy preview utilities', () => {
  it('creates truncated previews for long text', async () => {
    const text = 'forensics'.repeat(1024);
    const base64 = toBase64(text);
    const preview = await buildPreviewFromBase64(base64, 4 * 1024);
    expect(preview.previewByteLength).toBeLessThanOrEqual(4 * 1024 + 32);
    expect(preview.truncated).toBe(true);
    expect(preview.text.startsWith('forensics')).toBe(true);
    expect(preview.hex.length).toBeGreaterThan(0);
  });

  it('flags binary payloads', async () => {
    const bytes = new Uint8Array([0, 1, 255, 128, 64, 0, 0, 2]);
    const preview = await buildPreviewFromBase64(toBase64(bytes));
    expect(preview.isBinary).toBe(true);
  });

  it('generates previews under 150ms for 100KB inputs', async () => {
    const bytes = Buffer.alloc(100 * 1024, 0xab);
    const base64 = bytes.toString('base64');
    const start = performance.now();
    await buildPreviewFromBase64(base64, PREVIEW_CHUNK_BYTES);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(150);
  });

  it('decodes base64 chunks consistently', () => {
    const chunk = toBase64('chunk-data');
    const decoded = decodeBase64Chunk(chunk);
    const { text } = bytesToText(decoded);
    expect(text).toContain('chunk-data');
    expect(bytesToHex(decoded)).toContain('63 68 75');
  });
});

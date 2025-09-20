import {
  detectSensitiveStrings,
  collectNodeRedactions,
  buildRedactionMetadata,
  serializeRedactionMetadata,
  deserializeRedactionMetadata,
  applyMasksToContext,
  createManualMask,
  detectRedactionsFromBlob,
} from '../../utils/redaction';
import { TextDecoder as NodeTextDecoder } from 'util';

describe('redaction utilities', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_REDACTION_ENABLED = 'true';
    if (typeof TextDecoder === 'undefined') {
      (global as any).TextDecoder = NodeTextDecoder as unknown as typeof TextDecoder;
    }
  });

  it('detects common sensitive tokens', () => {
    const sample = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'AKIA1234567890ABCDEF',
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      'token = superSecretTokenValue12345',
      'user@example.com',
      '10.10.10.10',
    ].join('\n');
    const matches = detectSensitiveStrings(sample);
    const types = matches.map((m) => m.type);
    expect(types).toEqual(expect.arrayContaining(['jwt', 'aws_access_key', 'aws_secret_key', 'token', 'email', 'ip']));
  });

  it('collects node redactions', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>Email: user@example.com</p>';
    document.body.appendChild(container);
    const masks = collectNodeRedactions(container as HTMLElement);
    document.body.removeChild(container);
    const emailMask = masks.find((mask) => mask.type === 'email');
    expect(emailMask).toBeDefined();
  });

  it('serializes and deserializes metadata', () => {
    const mask = createManualMask({ x: 0.1, y: 0.2, width: 0.3, height: 0.2 }, 'email');
    const metadata = buildRedactionMetadata([mask]);
    const json = serializeRedactionMetadata(metadata);
    const parsed = deserializeRedactionMetadata(json);
    expect(parsed).not.toBeNull();
    expect(parsed?.version).toBe(metadata.version);
    expect(parsed?.masks[0].type).toBe('email');
  });

  it('applies masks to a canvas context', () => {
    const mask = createManualMask({ x: 0, y: 0, width: 0.5, height: 0.5 });
    const fillRect = jest.fn();
    const ctx = {
      canvas: { width: 200, height: 100 },
      save: jest.fn(),
      restore: jest.fn(),
      fillRect,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    applyMasksToContext(ctx, [mask]);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
  });

  it('detects redactions from blobs', async () => {
    const encoder = new TextEncoder();
    const payload = encoder.encode('api_key=abcdefghijklmnop1234567890');
    const blob = {
      arrayBuffer: async () => payload.buffer,
    } as unknown as Blob;
    const masks = await detectRedactionsFromBlob(blob);
    expect(masks.some((mask) => mask.type === 'token')).toBe(true);
  });
});

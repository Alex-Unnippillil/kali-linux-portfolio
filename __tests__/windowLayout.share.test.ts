import {
  buildWindowSnapshotUrl,
  decodeWindowSnapshot,
  encodeWindowSnapshot,
  parseWindowSnapshotFromUrl,
} from '../utils/windowLayout';

import type { SerializedWindowState } from '../types/windowState';

describe('window layout serialization', () => {
  const snapshot: SerializedWindowState = {
    id: 'terminal',
    position: { x: 128.4, y: 256.7 },
    size: { width: 62, height: 74 },
    context: {
      path: '/home/kali',
      flags: ['a', 'b', 'c'],
      options: { hidden: false, depth: 2 },
    },
  };

  it('encodes and decodes a snapshot', () => {
    const encoded = encodeWindowSnapshot(snapshot);
    expect(encoded).toBeTruthy();
    const decoded = decodeWindowSnapshot(encoded as string);
    expect(decoded).toEqual({
      id: 'terminal',
      position: { x: 128.4, y: 256.7 },
      size: { width: 62, height: 74 },
      context: {
        path: '/home/kali',
        flags: ['a', 'b', 'c'],
        options: { hidden: false, depth: 2 },
      },
    });
  });

  it('guards against invalid data', () => {
    const encoded = encodeWindowSnapshot({ id: '', position: { x: Number.NaN, y: -5 } });
    expect(encoded).toBeNull();
    expect(decodeWindowSnapshot('not-base64')).toBeNull();
  });

  it('builds and parses URLs with shared state', () => {
    const baseUrl = 'https://example.test/desktop';
    const url = buildWindowSnapshotUrl(snapshot, baseUrl);
    expect(url).toBeTruthy();
    const parsed = parseWindowSnapshotFromUrl(url as string);
    expect(parsed?.id).toBe('terminal');
    expect(parsed?.position).toEqual({ x: 128.4, y: 256.7 });
  });

  it('ignores oversized values by clamping them into safe ranges', () => {
    const extreme: SerializedWindowState = {
      id: 'files',
      position: { x: -200, y: 100000 },
      size: { width: 250, height: 1 },
    };

    const encoded = encodeWindowSnapshot(extreme);
    expect(encoded).toBeTruthy();
    const decoded = decodeWindowSnapshot(encoded as string);
    expect(decoded).toEqual({
      id: 'files',
      position: { x: 0, y: 32000 },
      size: { width: 100, height: 10 },
    });
  });
});

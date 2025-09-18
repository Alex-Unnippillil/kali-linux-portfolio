import { EvidenceStore, formatTimestamp, hashEvidence } from '../utils/evidenceStore';
import { trackEvent } from '@/lib/analytics-client';

jest.mock('@/lib/analytics-client', () => ({
  trackEvent: jest.fn(),
}));

const mockedTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>;

describe('hashEvidence', () => {
  beforeEach(() => {
    mockedTrackEvent.mockClear();
  });

  it('produces stable SHA-256 hashes for string payloads', async () => {
    await expect(hashEvidence('Observation')).resolves.toBe(
      'd239e9cf6a51335bf996fc5db77623d8be287e8b4d8e1cd1be3a0e00c8bbfe57',
    );
  });

  it('produces stable SHA-256 hashes for binary payloads', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await expect(hashEvidence(bytes)).resolves.toBe(
      '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a',
    );
  });
});

describe('formatTimestamp', () => {
  it('formats dates in UTC without milliseconds', () => {
    const date = new Date('2025-02-20T10:00:00Z');
    expect(formatTimestamp(date)).toBe('2025-02-20 10:00:00 UTC');
  });

  it('throws for invalid dates', () => {
    const invalid = new Date('not-a-real-date');
    expect(() => formatTimestamp(invalid)).toThrow('Invalid date');
  });
});

describe('EvidenceStore manifest generation', () => {
  beforeEach(() => {
    mockedTrackEvent.mockClear();
  });

  it('builds a manifest with sorted items, counts, and metadata', async () => {
    const fixedNow = new Date('2025-02-20T10:15:00Z');
    const store = new EvidenceStore(() => new Date(fixedNow));

    const noteCaptured = new Date('2025-02-20T10:00:00Z');
    const fileCaptured = new Date('2025-02-20T10:05:00Z');

    await store.recordCapture({
      id: 'note-1',
      label: 'Recon summary',
      type: 'note',
      payload: 'Observation',
      tags: ['case:alpha'],
      capturedAt: noteCaptured,
    });

    await store.recordCapture({
      id: 'file-1',
      label: 'packet.png',
      type: 'file',
      payload: new Uint8Array([1, 2, 3, 4]),
      metadata: { mime: 'image/png' },
      capturedAt: fileCaptured,
    });

    const manifest = store.buildManifest({ caseId: 'CASE-42', investigator: 'Analyst' });

    expect(manifest.version).toBe('1.0');
    expect(manifest.generatedAt).toBe(fixedNow.toISOString());
    expect(manifest.totals).toEqual({
      captures: 2,
      byType: { note: 1, file: 1 },
    });

    expect(manifest.items).toHaveLength(2);
    expect(manifest.items.map((item) => item.id)).toEqual(['note-1', 'file-1']);

    expect(manifest.items[0]).toMatchObject({
      id: 'note-1',
      label: 'Recon summary',
      type: 'note',
      hash: 'd239e9cf6a51335bf996fc5db77623d8be287e8b4d8e1cd1be3a0e00c8bbfe57',
      capturedAt: noteCaptured.toISOString(),
      timestamp: '2025-02-20 10:00:00 UTC',
      size: 11,
      tags: ['case:alpha'],
    });

    expect(manifest.items[1]).toMatchObject({
      id: 'file-1',
      label: 'packet.png',
      type: 'file',
      hash: '9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a',
      capturedAt: fileCaptured.toISOString(),
      timestamp: '2025-02-20 10:05:00 UTC',
      size: 4,
      metadata: { mime: 'image/png' },
    });

    expect(manifest.metadata).toEqual({ caseId: 'CASE-42', investigator: 'Analyst' });
    expect(store.getCaptureCount()).toBe(2);
    expect(store.getExportCount()).toBe(1);

    const eventNames = mockedTrackEvent.mock.calls.map((call) => call[0]);
    expect(eventNames).toEqual(['evidence_capture', 'evidence_capture', 'evidence_export']);
  });
});

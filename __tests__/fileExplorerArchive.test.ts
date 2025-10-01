import { File } from 'node:buffer';
import {
  ArchiveEntry,
  createTarArchive,
  createZipArchive,
  extractTarArchive,
  extractZipArchive,
} from '../components/apps/file-explorer/archiveWorkerCore';

describe('archive worker core', () => {
  it('creates and extracts zip archives with metadata', async () => {
    const first = new File([new TextEncoder().encode('hello world')], 'greeting.txt', {
      lastModified: 1_700_000_000_000,
      type: 'text/plain',
    });
    const second = new File([new TextEncoder().encode('')], 'empty.txt', {
      lastModified: 1_700_000_500_000,
      type: 'text/plain',
    });
    const entries: ArchiveEntry[] = [
      { path: 'docs/greeting.txt', file: first, permissions: 0o640, lastModified: first.lastModified },
      { path: 'docs/empty.txt', file: second, permissions: 0o600, lastModified: second.lastModified },
    ];
    const progressUpdates: Array<{ processed: number; total: number }> = [];
    const buffer = await createZipArchive(entries, {
      onProgress(processed, total) {
        progressUpdates.push({ processed, total });
      },
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(progressUpdates.at(-1)).toMatchObject({ processed: first.size + second.size, total: first.size + second.size });

    const archiveFile = new File([buffer], 'test.zip', { type: 'application/zip' });
    const extracted: Record<string, { chunks: Uint8Array[]; directory: boolean; permissions?: number; lastModified?: number }> = {};
    await extractZipArchive(archiveFile, {
      onProgress() {
        // intentionally empty
      },
      onEntry(entry) {
        const existing = extracted[entry.path] ?? { chunks: [], directory: entry.directory };
        existing.chunks.push(new Uint8Array(entry.chunk));
        existing.directory = entry.directory;
        existing.permissions = entry.permissions;
        existing.lastModified = entry.lastModified;
        extracted[entry.path] = existing;
      },
    });
    expect(Object.keys(extracted)).toEqual(['docs/greeting.txt', 'docs/empty.txt']);
    expect(new TextDecoder().decode(extracted['docs/greeting.txt'].chunks[0])).toBe('hello world');
    if (extracted['docs/greeting.txt'].permissions != null) {
      expect(extracted['docs/greeting.txt'].permissions).toBe(0o640);
    }
    if (extracted['docs/greeting.txt'].lastModified != null) {
      expect(extracted['docs/greeting.txt'].lastModified).toBe(first.lastModified);
    }
    expect(new TextDecoder().decode(extracted['docs/empty.txt'].chunks[0])).toBe('');
  });

  it('aborts zip creation when signalled', async () => {
    const big = new File([new Uint8Array(1024 * 1024 * 2)], 'big.bin');
    const controller = new AbortController();
    await expect(
      createZipArchive(
        [{ path: 'big.bin', file: big, permissions: 0o600, lastModified: big.lastModified }],
        {
          signal: controller.signal,
          onProgress(processed) {
            if (processed > 0) controller.abort();
          },
        },
      ),
    ).rejects.toThrow(/aborted/i);
  });

  it('creates and extracts tar archives with nested directories', async () => {
    const nestedFile = new File([new TextEncoder().encode('nested data')], 'nested.txt', {
      lastModified: 1_700_100_000_000,
    });
    const entries: ArchiveEntry[] = [
      { path: 'root', directory: true, permissions: 0o755, lastModified: 1_700_100_000_000 },
      { path: 'root/sub', directory: true, permissions: 0o700, lastModified: 1_700_100_000_000 },
      { path: 'root/sub/nested.txt', file: nestedFile, permissions: 0o600, lastModified: nestedFile.lastModified },
    ];
    const tarBuffer = await createTarArchive(entries, {
      onProgress() {
        // no-op
      },
    });
    expect(tarBuffer.length % 512).toBe(0);
    const tarFile = new File([tarBuffer], 'test.tar', { type: 'application/x-tar' });
    const seen: Record<string, { data: string; permissions?: number }> = {};
    await extractTarArchive(tarFile, {
      onProgress() {
        // no-op
      },
      onEntry(entry) {
        const text = new TextDecoder().decode(entry.chunk);
        seen[entry.path] = { data: text, permissions: entry.permissions };
      },
    });
    expect(Object.keys(seen)).toEqual(['root/', 'root/sub/', 'root/sub/nested.txt']);
    expect(seen['root/'].permissions).toBe(0o755);
    expect(seen['root/sub/'].permissions).toBe(0o700);
    expect(seen['root/sub/nested.txt'].data).toBe('nested data');
  });
});

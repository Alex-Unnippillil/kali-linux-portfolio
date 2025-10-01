import {
  recordVersion,
  listVersions,
  enforceRetentionForFile,
  loadVersionContent,
  resetVersionStoreForTests,
} from '../components/apps/file-explorer/versionStore';

describe('file explorer version store', () => {
  beforeEach(async () => {
    await resetVersionStoreForTests();
  });

  test('applies max version retention', async () => {
    const key = 'docs/readme.md';
    const now = Date.now();
    await recordVersion(key, 'v1', { timestamp: now - 3 * 24 * 60 * 60 * 1000 });
    await recordVersion(key, 'v2', { timestamp: now - 2 * 24 * 60 * 60 * 1000 });
    await recordVersion(key, 'v3', { timestamp: now - 1 * 24 * 60 * 60 * 1000 });

    let history = await listVersions(key);
    expect(history).toHaveLength(3);

    await enforceRetentionForFile(key, { maxVersions: 2, maxDays: 0 });
    history = await listVersions(key);
    expect(history).toHaveLength(2);
    expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
  });

  test('preserves stored content for restore', async () => {
    const key = 'docs/guide.md';
    const content = `line 1\nline 2\n`;
    const version = await recordVersion(key, content, { timestamp: Date.now() });
    const stored = await loadVersionContent(version);
    expect(stored).toBe(content);
  });

  test('removes versions older than retention window', async () => {
    const key = 'docs/history.md';
    const oldContent = 'old';
    const recentContent = 'recent';
    await recordVersion(key, oldContent, { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 });
    await recordVersion(key, recentContent, { timestamp: Date.now() });

    await enforceRetentionForFile(key, { maxVersions: 5, maxDays: 1 });
    const remaining = await listVersions(key);
    expect(remaining).toHaveLength(1);
    const restored = await loadVersionContent(remaining[0]);
    expect(restored).toBe(recentContent);
  });
});

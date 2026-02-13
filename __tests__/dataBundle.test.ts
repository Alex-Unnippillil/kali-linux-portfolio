import {
  applyDataBundle,
  createDataBundle,
  estimateBundleSize,
  formatBundleSize,
  parseDataBundle,
  serializeDataBundle,
} from '../utils/dataBundle';
import { RECENT_STORAGE_KEY } from '../utils/recentStorage';
import { exportSettings, importSettings } from '../utils/settingsStore';

jest.mock('../utils/settingsStore', () => ({
  exportSettings: jest.fn(),
  importSettings: jest.fn(),
}));

describe('dataBundle utilities', () => {
  const mockedExportSettings = exportSettings as unknown as jest.MockedFunction<() => Promise<string>>;
  const mockedImportSettings = importSettings as unknown as jest.MockedFunction<(input: unknown) => Promise<void>>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-02T03:04:05Z'));
    localStorage.clear();
    mockedExportSettings.mockReset();
    mockedImportSettings.mockReset();
    mockedExportSettings.mockResolvedValue(JSON.stringify({ accent: '#123456', theme: 'dark' }));
    mockedImportSettings.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('collects configured storage keys and estimates bundle size', async () => {
    localStorage.setItem('launcherFavorites', JSON.stringify(['nessus']));
    localStorage.setItem('recentApps', JSON.stringify(['hydra']));
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(['wireshark']));
    localStorage.setItem('snap-enabled', JSON.stringify(true));
    localStorage.setItem('app:theme', 'matrix');
    localStorage.setItem('reconng-report-template', 'audit');
    localStorage.setItem('portfolio-tasks', JSON.stringify([{ id: 't1' }]));
    localStorage.setItem('qrLastGeneration', 'payload');

    const bundle = await createDataBundle();

    expect(bundle.version).toBe(1);
    expect(bundle.createdAt).toBe('2024-01-02T03:04:05.000Z');
    expect(bundle.settings).toEqual({ accent: '#123456', theme: 'dark' });
    expect(bundle.storage.launcher).toMatchObject({
      launcherFavorites: ['nessus'],
      [RECENT_STORAGE_KEY]: ['wireshark'],
      recentApps: ['hydra'],
    });
    expect(bundle.storage.preferences).toMatchObject({
      'snap-enabled': true,
      'app:theme': 'matrix',
    });
    expect(bundle.storage.templates).toMatchObject({
      'reconng-report-template': 'audit',
    });
    expect(bundle.storage.workspace).toMatchObject({
      'portfolio-tasks': [{ id: 't1' }],
    });
    expect(bundle.storage.qr).toMatchObject({
      qrLastGeneration: 'payload',
    });

    const serialized = serializeDataBundle(bundle);
    expect(serialized).toContain('"version": 1');

    const size = estimateBundleSize(serialized);
    expect(size).toBeGreaterThan(serialized.length - 10);
    expect(formatBundleSize(size)).toMatch(/\b(?:B|KB|MB)\b/);
  });

  it('performs a round-trip export and import', async () => {
    localStorage.setItem('launcherFavorites', JSON.stringify(['nessus']));
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(['wireshark']));
    localStorage.setItem('snap-enabled', JSON.stringify(false));
    localStorage.setItem('app:theme', 'neon');

    const bundle = await createDataBundle();
    const serialized = serializeDataBundle(bundle);
    const parsed = parseDataBundle(serialized);

    localStorage.clear();

    await applyDataBundle(parsed);

    expect(mockedImportSettings).toHaveBeenCalledWith(parsed.settings);
    expect(JSON.parse(localStorage.getItem('launcherFavorites') || '[]')).toEqual(['nessus']);
    expect(JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || '[]')).toEqual(['wireshark']);
    expect(localStorage.getItem('snap-enabled')).toBe('false');
    expect(localStorage.getItem('app:theme')).toBe('neon');
  });

  it('rejects unsupported bundle versions', () => {
    const invalid = JSON.stringify({
      version: 2,
      createdAt: '2024-01-02T03:04:05.000Z',
      settings: {},
      storage: {},
    });
    expect(() => parseDataBundle(invalid)).toThrow('Unsupported bundle version');
  });

  it('sanitises unknown storage categories and keys', () => {
    const json = JSON.stringify({
      version: 1,
      createdAt: '2024-01-02T03:04:05.000Z',
      settings: {},
      storage: {
        launcher: {
          launcherFavorites: ['hydra'],
          extraneous: 'value',
        },
        rogue: {
          foo: 'bar',
        },
      },
    });

    const parsed = parseDataBundle(json);

    expect(parsed.storage.launcher).toEqual({ launcherFavorites: ['hydra'] });
    expect(parsed.storage).not.toHaveProperty('rogue');
  });
});

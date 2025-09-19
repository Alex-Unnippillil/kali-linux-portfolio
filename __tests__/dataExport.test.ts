import { gatherDataExport } from '../lib/dataExport';
import { runDataExport } from '../workers/data-export.worker';

describe('data export aggregation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const profiles = [
    {
      deviceId: 'device-1',
      name: 'Adapter',
      services: [],
    },
    {
      deviceId: 'device-2',
      name: 'Sensor',
      services: [
        {
          uuid: '1234',
          characteristics: [{ uuid: 'abcd', value: 'ready' }],
        },
      ],
    },
  ];

  const seedStorage = () => {
    window.localStorage.setItem(
      'desktop-session',
      JSON.stringify({ windows: [], wallpaper: 'wall-2', dock: [] }),
    );
    window.localStorage.setItem('hydra/session', JSON.stringify({ tasks: [1, 2, 3] }));
    window.localStorage.setItem('openvas/session', JSON.stringify({ target: '1.2.3.4' }));
    window.localStorage.setItem('app:theme', 'dark');
    window.localStorage.setItem('reduced-motion', 'true');
    window.localStorage.setItem('density', 'compact');
    window.localStorage.setItem('snap-enabled', 'false');
  };

  it('collects sections with size metadata and invokes progress callbacks', async () => {
    seedStorage();
    const stages: string[] = [];
    const archive = await gatherDataExport({
      storage: window.localStorage,
      profileLoader: async () => profiles,
      now: () => new Date('2024-01-01T00:00:00.000Z'),
      onStageComplete: (stage, summary) => {
        stages.push(stage);
        expect(summary.items).toBeGreaterThanOrEqual(0);
        expect(summary.bytes).toBeGreaterThanOrEqual(0);
      },
    });

    expect(stages).toEqual(['profiles', 'sessions', 'flags']);
    expect(archive.generatedAt).toBe('2024-01-01T00:00:00.000Z');
    expect(archive.sections.profiles.items).toHaveLength(2);
    expect(archive.sections.sessions.items.map((item) => item.key)).toEqual([
      'desktop-session',
      'hydra/session',
      'openvas/session',
    ]);
    expect(archive.sections.flags.items.find((item) => item.key === 'app:theme')?.data).toBe(
      'dark',
    );

    const encoder = new TextEncoder();
    const hydraRaw = window.localStorage.getItem('hydra/session') as string;
    expect(
      archive.sections.sessions.items.find((item) => item.key === 'hydra/session')?.size,
    ).toBe(encoder.encode(hydraRaw).byteLength);

    const totalSizes =
      archive.sections.profiles.totalSize +
      archive.sections.sessions.totalSize +
      archive.sections.flags.totalSize;
    expect(archive.totals.bytes).toBe(totalSizes);
  });

  it('serializes via the worker helper and returns a matching archive', async () => {
    seedStorage();
    const result = await runDataExport({
      storage: window.localStorage,
      profileLoader: async () => profiles,
      now: () => new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(result.bytes).toBe(result.buffer.byteLength);
    const text = new TextDecoder().decode(new Uint8Array(result.buffer));
    const parsed = JSON.parse(text);
    expect(parsed).toEqual(result.archive);

    expect(result.archive.sections.flags.totalSize).toBe(
      result.archive.sections.flags.items.reduce((sum, item) => sum + item.size, 0),
    );
  });
});

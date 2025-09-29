import { buildBatches, MAX_ARCHIVE_SIZE } from '../utils/collectorWorkerCore';

describe('collector worker core', () => {
  it('compresses 500 stub artifacts without exceeding the 10 MB limit', () => {
    const artifacts = Array.from({ length: 500 }, (_, idx) => ({
      name: `stub-${idx}.log`,
      content: [
        `Stub artifact ${idx}`,
        'Process snapshot: '
          .concat('sshd ', 'postgres ', 'nginx ', 'redis ', 'systemd ')
          .repeat(2),
        'Network routes:\n' + '10.0.0.0/24 via 10.0.0.1\n'.repeat(4),
        'Event timeline:\n' + 'login success '.repeat(64),
        '----- End -----',
      ].join('\n'),
    }));

    const batches = buildBatches(artifacts, MAX_ARCHIVE_SIZE);

    const totalEntries = batches.reduce((sum, batch) => sum + batch.entries, 0);
    const maxBatchSize = batches.reduce((max, batch) => Math.max(max, batch.size), 0);

    expect(totalEntries).toBe(500);
    expect(maxBatchSize).toBeLessThanOrEqual(MAX_ARCHIVE_SIZE);
    expect(batches.length).toBeGreaterThan(0);
  });
});

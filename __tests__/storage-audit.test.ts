import { getStorageUsage } from '../scripts/storage-audit';
import expected from '../scripts/storage-audit.json';

describe('storage usage audit', () => {
  it('matches current snapshot', () => {
    const usage = getStorageUsage();
    expect(usage).toEqual(expected);
  });
});

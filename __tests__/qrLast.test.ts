import {
  loadLastGeneration,
  loadLastScan,
  saveLastGeneration,
  saveLastScan,
} from '@/utils';

describe('qr last storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads last scan', () => {
    saveLastScan('foo');
    expect(loadLastScan()).toBe('foo');
  });

  it('saves and loads last generation', () => {
    saveLastGeneration('bar');
    expect(loadLastGeneration()).toBe('bar');
  });
});

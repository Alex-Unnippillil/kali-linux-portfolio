import { formatBytes, formatDuration } from '@/components/apps/converter/format';

describe('formatBytes', () => {
  it('handles bytes to KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('handles large numbers', () => {
    expect(formatBytes(123456789)).toBe('117.74 MB');
  });

  it('handles negatives', () => {
    expect(formatBytes(-1024)).toBe('-1 KB');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(65)).toBe('1m 5s');
  });

  it('formats hours', () => {
    expect(formatDuration(3661)).toBe('1h 1m 1s');
  });

  it('handles negatives', () => {
    expect(formatDuration(-3661)).toBe('-1h 1m 1s');
  });
});

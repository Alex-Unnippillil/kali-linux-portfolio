import { FALLBACK_ICON_KEY, FILE_ICON_COMPONENTS, getFileIconComponent, resolveFileIconKey } from '../utils/fileIcons';

describe('file icon mapping', () => {
  it('maps image mime types to image icons', () => {
    expect(resolveFileIconKey('holiday.png', 'image/png')).toBe('image');
  });

  it('uses extension mapping when mime is unavailable', () => {
    expect(resolveFileIconKey('report.pdf', null)).toBe('pdf');
    expect(resolveFileIconKey('archive.tar.gz', undefined)).toBe('archive');
  });

  it('falls back to terminal icon for shell scripts', () => {
    expect(resolveFileIconKey('deploy.sh', 'application/x-sh')).toBe('terminal');
  });

  it('returns the fallback icon when no mapping exists', () => {
    expect(resolveFileIconKey('custom.xyz', '')).toBe(FALLBACK_ICON_KEY);
  });

  it('returns a component even for unknown keys', () => {
    const Fallback = FILE_ICON_COMPONENTS[FALLBACK_ICON_KEY];
    expect(getFileIconComponent('non-existent')).toBe(Fallback);
  });
});

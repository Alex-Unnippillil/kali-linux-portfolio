import { getSuggestedImage } from '../pages/download';

describe('getSuggestedImage', () => {
  it('suggests WSL for Windows user agents', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    expect(getSuggestedImage(ua)).toBe('wsl');
  });

  it('suggests VM for macOS user agents', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
    expect(getSuggestedImage(ua)).toBe('vm');
  });

  it('defaults to ISO for other user agents', () => {
    const ua = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64)';
    expect(getSuggestedImage(ua)).toBe('iso');
  });
});

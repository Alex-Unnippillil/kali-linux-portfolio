import fs from 'fs';
import path from 'path';

describe('kali-ui theme and accent bootstrap', () => {
  const scriptPath = path.join(__dirname, '..', 'public', 'kali-ui.js');
  const script = fs.readFileSync(scriptPath, 'utf8');

  const runScript = () => {
    // @ts-ignore evaluating external script
    eval(script);
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  test.each([
    ['default', false],
    ['dark', true],
  ])('applies %s theme from storage', (theme, isDark) => {
    localStorage.setItem('app:theme', theme);
    runScript();
    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(document.documentElement.classList.contains('dark')).toBe(isDark);
  });

  test.each([
    '#e53e3e',
    '#38a169',
  ])('applies %s accent from storage', (accent) => {
    localStorage.setItem('accent', accent);
    runScript();
    expect(
      document.documentElement.style.getPropertyValue('--color-primary')
    ).toBe(accent);
  });
});

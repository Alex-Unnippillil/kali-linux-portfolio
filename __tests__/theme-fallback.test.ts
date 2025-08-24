import fs from 'fs';
import path from 'path';

import { afterEach, describe, expect, it, jest } from '@jest/globals';

describe('theme fallback helpers', () => {
  const originalTheme = process.env.NEXT_PUBLIC_THEME;

  afterEach(() => {
    process.env.NEXT_PUBLIC_THEME = originalTheme;
    jest.resetModules();
  });

  it('falls back to Yaru when theme assets are missing', async () => {
    const appsDir = path.join(__dirname, '../components/apps');
    fs.readdirSync(appsDir).forEach((file) => {
      const modPath = `@components/apps/${file}`;
      jest.mock(modPath, () => ({}));
    });
    process.env.NEXT_PUBLIC_THEME = 'UnknownTheme';
    const mod = await import('@/apps.config.js');
    expect(mod.icon('calc.png')).toBe('./themes/Yaru/apps/calc.png');
    expect(mod.sys('folder.png')).toBe('./themes/Yaru/system/folder.png');
  });
});

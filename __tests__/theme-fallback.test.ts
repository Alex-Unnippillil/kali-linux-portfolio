import fs from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('theme fallback helpers', () => {
  const originalTheme = process.env.NEXT_PUBLIC_THEME;

  beforeEach(() => {
    (global as any).displayImportGraph = jest.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_THEME = originalTheme;
    delete (global as any).displayImportGraph;
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

  it('falls back to Yaru when individual assets are missing from a custom theme', async () => {
    const appsDir = path.join(__dirname, '../components/apps');
    fs.readdirSync(appsDir).forEach((file) => {
      const modPath = `@components/apps/${file}`;
      jest.mock(modPath, () => ({}));
    });

    const customThemeDir = path.join(__dirname, '../public/themes/Custom');
    const customAppsDir = path.join(customThemeDir, 'apps');
    const customSystemDir = path.join(customThemeDir, 'system');
    fs.mkdirSync(customAppsDir, { recursive: true });
    fs.mkdirSync(customSystemDir, { recursive: true });

    process.env.NEXT_PUBLIC_THEME = 'Custom';
    const mod = await import('@/apps.config.js');
    expect(mod.icon('calc.png')).toBe('./themes/Yaru/apps/calc.png');
    expect(mod.sys('folder.png')).toBe('./themes/Yaru/system/folder.png');

    fs.rmSync(customThemeDir, { recursive: true, force: true });
  });
});

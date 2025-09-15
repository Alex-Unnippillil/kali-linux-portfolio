import fs from 'fs';
import path from 'path';

describe('web manifest', () => {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  test('contains icons', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(icon.src).toBeDefined();
      expect(icon.sizes).toBeDefined();
      expect(icon.type).toBeDefined();
    }
  });

  test('has standalone display mode', () => {
    expect(manifest.display).toBe('standalone');
  });

  test('defines start_url', () => {
    expect(manifest.start_url).toBe('/');
  });

  test('includes shortcuts', () => {
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThan(0);
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.name).toBeDefined();
      expect(shortcut.short_name).toBeDefined();
      expect(shortcut.url).toBeDefined();
    }
  });

  test('uses accent for theme and background color', () => {
    const cssPath = path.join(process.cwd(), 'styles', 'globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    const match = css.match(/:root\s*{[^}]*--color-accent:\s*(#[0-9a-fA-F]{6})/);
    const accent = match ? match[1] : undefined;
    expect(manifest.theme_color).toBe(accent);
    expect(manifest.background_color).toBe(accent);
  });
});

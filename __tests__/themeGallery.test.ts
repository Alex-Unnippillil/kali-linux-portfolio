import JSZip from 'jszip';
import { createThemeArchive, parseThemeArchive } from '../components/apps/theme-gallery/themeIO';
import { defaultTheme } from '../styles/themes';
import type { ThemeDefinition } from '../styles/themes';

const createLowContrastTheme = (): ThemeDefinition => ({
  metadata: {
    id: 'custom-low-contrast',
    name: 'Failing Contrast',
    description: 'Intentionally fails WCAG requirements.',
    version: '1.0.0',
    mode: 'dark',
    attribution: {
      author: 'Test Suite',
    },
  },
  colors: {
    ...defaultTheme.colors,
    background: '#000000',
    surface: '#010101',
    surfaceAlt: '#020202',
    text: '#050505',
    textMuted: '#080808',
  },
  typography: { ...defaultTheme.typography },
});

const createCustomTheme = (): ThemeDefinition => ({
  ...defaultTheme,
  metadata: {
    ...defaultTheme.metadata,
    id: 'default-export-copy',
    name: 'Kali Nightfall Copy',
  },
});

describe('theme gallery import/export', () => {
  it('rejects archives missing required structure', async () => {
    const zip = new JSZip();
    zip.file('theme.json', JSON.stringify({ foo: 'bar' }));
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    await expect(parseThemeArchive(buffer)).rejects.toThrow('Theme metadata is missing.');
  });

  it('preserves theme metadata when exporting and importing', async () => {
    const theme = createCustomTheme();
    const blob = await createThemeArchive(theme);
    const parsed = await parseThemeArchive(blob);
    expect(parsed.metadata).toEqual(theme.metadata);
    expect(parsed.colors.accent).toBe(theme.colors.accent);
  });

  it('rejects themes that fail contrast guardrails', async () => {
    const badTheme = createLowContrastTheme();
    const zip = new JSZip();
    zip.file('theme.json', JSON.stringify(badTheme));
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    await expect(parseThemeArchive(buffer)).rejects.toThrow('Theme contrast requirements failed');
  });
});

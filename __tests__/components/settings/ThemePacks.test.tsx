import { render, screen, waitFor } from '@testing-library/react';
import ThemePacks, {
  PreviewSandbox,
  ThemePack,
  validateThemePack,
} from '@/components/settings/ThemePacks';

describe('validateThemePack', () => {
  it('returns errors for invalid packs', () => {
    const result = validateThemePack({
      name: '',
      variables: { color: '#fff' },
      css: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Theme pack requires a non-empty "name" field.',
        'Invalid variable name: color.',
        'Theme pack must include a "css" string.',
      ]),
    );
  });
});

describe('PreviewSandbox', () => {
  it('renders preview using pack variables', () => {
    const pack: ThemePack = {
      name: 'Test Pack',
      version: 1,
      createdAt: new Date().toISOString(),
      variables: {
        '--color-bg': '#111111',
        '--color-text': '#eeeeee',
        '--color-primary': '#00ffcc',
        '--color-accent': '#00ffcc',
        '--color-inverse': '#000000',
        '--color-border': '#123456',
        '--color-surface': '#1a1f26',
      },
      css: ':root { --color-bg: #111111; }',
    };

    render(<PreviewSandbox pack={pack} />);

    const preview = screen.getByTestId('theme-preview');
    expect(preview.getAttribute('style')).toContain('--color-bg: #111111');
    expect(preview.textContent).toContain('Test Pack Preview');
  });
});

describe('ThemePacks persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    const style = document.getElementById('theme-pack-style');
    if (style) {
      style.remove();
    }
    document.documentElement.removeAttribute('data-theme-pack');
    const keys = [
      '--color-bg',
      '--color-text',
      '--color-primary',
      '--color-secondary',
      '--color-accent',
    ];
    keys.forEach((key) => document.documentElement.style.removeProperty(key));
  });

  it('applies stored packs on mount', async () => {
    const pack: ThemePack = {
      name: 'Stored Pack',
      version: 1,
      createdAt: new Date().toISOString(),
      variables: {
        '--color-bg': '#010203',
        '--color-text': '#fafafa',
        '--color-primary': '#ff0000',
        '--color-secondary': '#00ff00',
        '--color-accent': '#0000ff',
      },
      css: ':root { --color-bg: #010203; }',
    };

    window.localStorage.setItem(
      'app:theme-packs',
      JSON.stringify({
        [pack.name]: pack,
      }),
    );
    window.localStorage.setItem('app:active-theme-pack', pack.name);

    render(<ThemePacks />);

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--color-bg')).toBe('#010203'),
    );
    expect(document.documentElement.getAttribute('data-theme-pack')).toBe(pack.name);
    expect(document.getElementById('theme-pack-style')).toBeTruthy();
  });
});


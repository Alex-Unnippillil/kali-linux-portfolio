import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WallpaperPicker from '../components/settings/WallpaperPicker';
import { getWallpaper } from '../lib/wallpaper';
import wallpapers from '../content/wallpapers.json';

jest.mock('next/image', () => (props: any) => <img {...props} alt={props.alt || ''} />);

describe('WallpaperPicker', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty('--background-image');
  });

  test('renders options with lazy-loaded thumbnails', () => {
    render(<WallpaperPicker />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(wallpapers.length);
    const img = screen.getAllByRole('img')[0] as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  test('persists selected wallpaper', async () => {
    render(<WallpaperPicker />);
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[1]);
    expect(getWallpaper()).toBe(wallpapers[1]);
    expect(window.localStorage.getItem('wallpaper')).toBe(wallpapers[1]);
    expect(
      document.documentElement.style.getPropertyValue('--background-image')
    ).toBe(`url(${wallpapers[1]})`);
  });
});

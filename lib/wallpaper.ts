import { extractAccentColors } from './wallpaper-accent';

// Lighten or darken a hex color by a percentage
function shadeColor(color: string, percent: number): string {
  const f = parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)}`;
}

// Load a wallpaper and update CSS custom properties for the background and
// accent colors. Returns the accent color that was applied.
export async function loadWallpaper(
  wallpaper: string,
  accentOverride?: string,
): Promise<string | null> {
  if (typeof document === 'undefined') return accentOverride || null;

  return new Promise((resolve) => {
    const img = new Image();
    img.src = `/wallpapers/${wallpaper}.webp`;
    img.onload = () => {
      document.documentElement.style.setProperty(
        '--background-image',
        `url(${img.src})`,
      );
      let accent = accentOverride;
      if (!accent) {
        const [first] = extractAccentColors(img, 5);
        accent = first || '#1793d1';
      }
      const border = shadeColor(accent!, -0.2);
      const vars: Record<string, string> = {
        '--color-ub-orange': accent!,
        '--color-ub-border-orange': border,
        '--color-primary': accent!,
        '--color-accent': accent!,
        '--color-focus-ring': accent!,
        '--color-selection': accent!,
        '--color-control-accent': accent!,
      };
      Object.entries(vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
      resolve(accent!);
    };
    img.onerror = () => resolve(accentOverride || null);
  });
}

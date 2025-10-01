import fs from 'fs';
import path from 'path';

import { render, screen } from '@testing-library/react';

import Icon from '@/components/ui/Icon';
import iconManifest from '@/data/icons/manifest.json';
import { resolveIconPath, resolveIconSize } from '@/lib/iconManifest';

describe('Icon component', () => {
  test('uses manifest label as default alt text', () => {
    render(<Icon name="audit" size={48} />);
    const image = screen.getByRole('img', { name: 'Audit Checklist' });
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain(resolveIconPath('audit', resolveIconSize(48)));
  });

  test('rounds up to the nearest supported size', () => {
    render(<Icon name="network" size={50} alt="Network graph" />);
    const image = screen.getByRole('img', { name: 'Network graph' });
    const resolvedSize = resolveIconSize(50);
    expect(image).toHaveAttribute('width', resolvedSize.toString());
    expect(image.getAttribute('src')).toContain(resolveIconPath('network', resolvedSize));
  });

  test('hides decorative icons from assistive technology', () => {
    render(<Icon name="radar" decorative />);
    const element = screen.getByRole('presentation', { hidden: true });
    expect(element).toHaveAttribute('aria-hidden', 'true');
    expect(element).toHaveAttribute('alt', '');
  });

  test('all manifest icons exist on disk for each size', () => {
    const baseDir = path.join(process.cwd(), 'public', 'icons');
    for (const icon of iconManifest.icons) {
      for (const size of iconManifest.sizes) {
        const iconPath = path.join(baseDir, String(size), `${icon.name}.svg`);
        expect(fs.existsSync(iconPath)).toBe(true);
      }
    }
  });
});

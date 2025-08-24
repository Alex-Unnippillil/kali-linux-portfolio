import fs from 'fs';
import path from 'path';

describe('apps.config.js icons', () => {
  it('referenced icons exist in public/themes', () => {
    const configPath = path.join(process.cwd(), 'apps.config.js');
    const content = fs.readFileSync(configPath, 'utf8');

    const icons: { type: 'apps' | 'system' | 'direct'; name: string }[] = [];

    const iconFn = /icon\('([^']+)'\)/g;
    let match: RegExpExecArray | null;
    while ((match = iconFn.exec(content)) !== null) {
      icons.push({ type: 'apps', name: match[1] });
    }

    const sysFn = /sys\('([^']+)'\)/g;
    while ((match = sysFn.exec(content)) !== null) {
      icons.push({ type: 'system', name: match[1] });
    }

    const direct = /icon:\s*'\.\/themes\/Yaru\/([^']+)'/g;
    while ((match = direct.exec(content)) !== null) {
      icons.push({ type: 'direct', name: match[1] });
    }

    const missing = icons
      .map((icon) => {
        let filePath: string;
        if (icon.type === 'apps') {
          filePath = path.join('public', 'themes', 'Yaru', 'apps', icon.name);
        } else if (icon.type === 'system') {
          filePath = path.join('public', 'themes', 'Yaru', 'system', icon.name);
        } else {
          filePath = path.join('public', 'themes', 'Yaru', icon.name);
        }
        return fs.existsSync(filePath) ? null : filePath;
      })
      .filter(Boolean);

    expect(missing).toEqual([]);
  });
});

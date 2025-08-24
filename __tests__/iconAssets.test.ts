import fs from 'fs';
import path from 'path';

describe('apps.config.js icons', () => {
  it('referenced icons exist in public/themes', () => {
    const configPath = path.join(process.cwd(), 'apps.config.js');
    const content = fs.readFileSync(configPath, 'utf8');

    function extractIcons(content: string, regex: RegExp, type: 'apps' | 'system' | 'direct') {
      const icons: { type: 'apps' | 'system' | 'direct'; name: string }[] = [];
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        icons.push({ type, name: match[1] });
      }
      return icons;
    }

    const icons = [
      ...extractIcons(content, /icon\('([^']+)'\)/g, 'apps'),
      ...extractIcons(content, /sys\('([^']+)'\)/g, 'system'),
      ...extractIcons(content, /icon:\s*'\.\/themes\/Yaru\/([^']+)'/g, 'direct'),
    ];
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

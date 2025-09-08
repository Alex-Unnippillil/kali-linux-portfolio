import fs from 'fs';
import path from 'path';

describe('adwaita icon pack', () => {
  it('matches expected file list', () => {
    const dir = path.join(process.cwd(), 'public', 'icons', 'adwaita');
    const files = fs.readdirSync(dir).sort();
    expect(files).toMatchSnapshot();
  });
});

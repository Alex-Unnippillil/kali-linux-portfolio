import fs from 'fs';
import path from 'path';
import os from 'os';
import { addApp } from '../scripts/add-app';

describe('add-app script', () => {
  it('scaffolds files and updates config', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'app-test-'));
    // create minimal apps.config.js
    fs.writeFileSync(
      path.join(tmp, 'apps.config.js'),
      `const dynamicAppEntries = [\n];\n\nconst apps = [\n];\n`
    );

    const spawn = jest.fn();

    addApp('demo-app', 'Demo App', tmp, spawn);

    const cfg = fs.readFileSync(path.join(tmp, 'apps.config.js'), 'utf8');
    expect(cfg).toContain("['demo-app', 'Demo App']");
    expect(cfg).toContain("id: 'demo-app'");
    expect(
      fs.existsSync(path.join(tmp, 'components', 'apps', 'demo-app.tsx'))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmp, 'public', 'themes', 'Yaru', 'apps', 'demo-app.svg')
      )
    ).toBe(true);
    expect(spawn).toHaveBeenCalledWith('yarn', ['validate:icons'], {
      stdio: 'inherit',
    });
  });
});

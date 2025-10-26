import { spawnSync } from 'child_process';
import plugin from 'eslint-plugin-no-top-level-window';

describe('eslint-plugin-no-top-level-window package boundaries', () => {
  it('exposes the plugin through the root entry point', () => {
    expect(plugin).toBeDefined();
    expect(plugin).toHaveProperty('rules.no-top-level-window-or-document');
  });

  it('blocks deep imports that bypass the public API surface', () => {
    expect.hasAssertions();

    const result = spawnSync(process.execPath, [
      '-e',
      "require('eslint-plugin-no-top-level-window/no-top-level-window-or-document')",
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr.toString()).toContain('ERR_PACKAGE_PATH_NOT_EXPORTED');
  });
});

import fs from 'fs';
import path from 'path';
import os from 'os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-open-test-'));
const originalHome = process.env.HOME;
process.env.HOME = tmpDir;
jest.spyOn(os, 'homedir').mockReturnValue(tmpDir);

afterAll(() => {
  process.env.HOME = originalHome;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('exo-open helpers.rc handling', () => {
  it('reads defaults and persists selections', async () => {
    const exo = await import('../src/lib/exo-open');
    const { getPreferredApp, setPreferredApp } = exo;
    const rcPath = path.join(tmpDir, '.config', 'xfce4', 'helpers.rc');

    expect(fs.existsSync(rcPath)).toBe(false);
    const def = await getPreferredApp('TerminalEmulator');
    expect(def).toBe('terminal');
    expect(fs.existsSync(rcPath)).toBe(false);

    await setPreferredApp('TerminalEmulator', 'serial-terminal');
    const updated = await getPreferredApp('TerminalEmulator');
    expect(updated).toBe('serial-terminal');

    expect(fs.existsSync(rcPath)).toBe(true);
    const content = fs.readFileSync(rcPath, 'utf-8');
    expect(content).toContain('TerminalEmulator=serial-terminal');
  });
});

import { test, expect } from '@playwright/test';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

function getPreferredApp(key: string): string | undefined {
  const cfgPath = `${os.homedir()}/.config/xfce4/helpers.rc`;
  try {
    const contents = fs.readFileSync(cfgPath, 'utf8');
      const line = contents.split('\n').find((l) => l.startsWith(`${key}=`));
      return line?.split('=')[1]?.trim();
  } catch {
    return undefined;
  }
}

function isProcessRunning(name: string): boolean {
  try {
    const result = execSync(`pgrep -f ${name}`);
    return result.toString().trim().length > 0;
  } catch {
    return false;
  }
}

test.describe('exo-open preferred apps', () => {
  test.beforeEach(() => {
    test.skip(!commandExists('exo-open'), 'exo-open not installed');
  });

  test('launches preferred WebBrowser for URL', async () => {
    const app = getPreferredApp('WebBrowser');
    expect(app, 'WebBrowser not configured').toBeTruthy();

    const proc = spawn('exo-open', ['--launch', 'WebBrowser', 'https://example.com'], {
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();

    await expect.poll(() => isProcessRunning(app!)).toBe(true);
    execSync(`pkill -f ${app}`);
  });

  test('launches preferred TerminalEmulator', async () => {
    const app = getPreferredApp('TerminalEmulator');
    expect(app, 'TerminalEmulator not configured').toBeTruthy();

    const proc = spawn('exo-open', ['--launch', 'TerminalEmulator'], {
      detached: true,
      stdio: 'ignore',
    });
    proc.unref();

    await expect.poll(() => isProcessRunning(app!)).toBe(true);
    execSync(`pkill -f ${app}`);
  });
});


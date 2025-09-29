import {
  sanitizePaste,
  resolvePasteGuardConfig,
  DEFAULT_PASTE_GUARD_CONFIG,
  parseTerminalSettings,
  formatTerminalSettings,
} from '../apps/terminal/utils/pasteGuard';

describe('sanitizePaste', () => {
  it('strips control characters and reports removal', () => {
    const config = resolvePasteGuardConfig(DEFAULT_PASTE_GUARD_CONFIG);
    const input = 'echo \u0007dangerous\u0008 test';
    const result = sanitizePaste(input, config);

    expect(result.text).toBe('echo dangerous test');
    expect(result.removedControlChars).toBe(2);
    expect(result.warnings.some((w) => w.includes('Removed 2 control characters'))).toBe(true);
  });

  it('flags destructive commands', () => {
    const config = resolvePasteGuardConfig(DEFAULT_PASTE_GUARD_CONFIG);
    const input = 'ls -la\nrm -rf /';
    const result = sanitizePaste(input, config);

    expect(result.destructiveMatches).toContain('rm -rf /');
    expect(result.warnings.some((w) => w.includes('potentially destructive command'))).toBe(true);
  });

  it('normalizes newlines when disabled', () => {
    const config = resolvePasteGuardConfig({ enabled: false });
    const result = sanitizePaste('line1\r\nline2', config);

    expect(result.text).toBe('line1\nline2');
    expect(result.warnings).toHaveLength(0);
    expect(result.removedControlChars).toBe(0);
  });
});

describe('terminal settings helpers', () => {
  it('round-trips configuration through parse and format', () => {
    const formatted = formatTerminalSettings({
      pasteGuard: {
        enabled: true,
        warnOnDestructive: false,
      },
    });

    const parsed = parseTerminalSettings(formatted);
    expect(parsed.pasteGuard?.warnOnDestructive).toBe(false);
    const canonical = formatTerminalSettings(parsed);
    expect(canonical).toBe(formatted);
  });
});

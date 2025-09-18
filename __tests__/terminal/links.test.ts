import { classifyTerminalLink, findSuspiciousLinks } from '../../apps/terminal/utils/linkSecurity';
import {
  isTrustedPath,
  normalizePath,
} from '../../utils/settings/terminalLinks';

describe('terminal link classification', () => {
  it('classifies shell protocol links as requiring a prompt', () => {
    const result = classifyTerminalLink('ssh://kali@127.0.0.1');
    expect(result.kind).toBe('shell');
    expect(result.requiresPrompt).toBe(true);
  });

  it('normalizes file protocol links', () => {
    const result = classifyTerminalLink('file:///etc/passwd');
    expect(result.kind).toBe('file');
    expect(result.requiresPrompt).toBe(true);
    expect(result.normalizedPath).toBe('/etc/passwd');
  });

  it('detects unix and windows style local paths', () => {
    const unix = classifyTerminalLink('/usr/local/bin/tool');
    const windows = classifyTerminalLink('C:\\Users\\Admin\\scripts\\run.ps1');
    expect(unix.kind).toBe('file');
    expect(unix.normalizedPath).toBe('/usr/local/bin/tool');
    expect(windows.kind).toBe('file');
    expect(windows.normalizedPath).toBe('c:/Users/Admin/scripts/run.ps1');
  });

  it('ignores regular web links', () => {
    const result = classifyTerminalLink('https://example.com');
    expect(result.kind).toBe('url');
    expect(result.requiresPrompt).toBe(false);
  });
});

describe('terminal link detection helpers', () => {
  it('finds shell and file links in terminal output', () => {
    const line = 'Connect via ssh://kali@host and inspect /tmp/report.txt';
    const matches = findSuspiciousLinks(line);
    expect(matches).toHaveLength(2);
    expect(matches[0].classification.kind).toBe('shell');
    expect(matches[1].classification.kind).toBe('file');
  });

  it('handles UNC paths and trims punctuation', () => {
    const line = 'Log file located at \\\\SERVER\\Share\\audit.log.';
    const matches = findSuspiciousLinks(line);
    expect(matches).toHaveLength(1);
    expect(matches[0].text).toBe('\\\\SERVER\\Share\\audit.log');
  });
});

describe('trusted path helpers', () => {
  it('normalizes and compares trusted paths', () => {
    const stored = [' /tmp ', 'C:/tools '];
    const normalized = stored.map((p) => normalizePath(p));
    expect(normalized).toEqual(['/tmp', 'c:/tools']);
    expect(isTrustedPath('/tmp/scripts/run.sh', stored)).toBe(true);
    expect(isTrustedPath('c:/tools/run.bat', stored)).toBe(true);
    expect(isTrustedPath('/etc/passwd', stored)).toBe(false);
  });
});

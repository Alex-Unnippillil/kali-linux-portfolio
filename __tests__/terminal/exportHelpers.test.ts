import {
  buildMarkdownExport,
  buildPlainTextExport,
  stripAnsiCodes,
} from '@/apps/terminal/utils/exportHelpers';

describe('terminal export helpers', () => {
  it('strips ANSI escape codes from input', () => {
    const raw = '\u001b[31merror\u001b[0m message';
    expect(stripAnsiCodes(raw)).toBe('error message');
  });

  it('normalizes newline characters and retains command text', () => {
    const raw = '└─$ ls\r\nDesktop\rDocuments';
    expect(buildPlainTextExport(raw)).toBe('└─$ ls\nDesktop\nDocuments');
  });

  it('creates a markdown fence export without trailing whitespace', () => {
    const raw = '┌──(kali㉿kali)-[~]\n└─$ help\nAvailable commands:\n';
    expect(buildMarkdownExport(raw)).toBe(
      '```bash\n┌──(kali㉿kali)-[~]\n└─$ help\nAvailable commands:\n```',
    );
  });
});

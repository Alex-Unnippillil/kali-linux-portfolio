import { createCrashReport, generateCrashId } from '../modules/crash/reporting';
import { REDACTION_TEXT, scrubSensitiveData, scrubSensitiveText } from '../utils/logs/privacy';

describe('crash reporting', () => {
  it('creates a crash report with a crash id and summary', () => {
    const report = createCrashReport({
      error: new Error('Disk failure at /Users/alex/secrets'),
      app: 'Crash Reporter',
      route: '/apps/crash-reporter',
      action: 'Opening crash summary',
      logs: ['POST https://api.example.com/upload?apiKey=abcdef1234567890'],
      metadata: {
        path: '/Users/alex/.ssh/id_rsa',
        token: 'Bearer token-value',
      },
      userSteps: ['Opened the crash reporter', 'Clicked export'],
    });

    expect(report.details.crashId).toMatch(/^CRASH-/);
    expect(report.summary).toContain('Crash ID:');
    expect(report.summary).toContain(REDACTION_TEXT);
    expect(report.summary).not.toContain('/Users/alex');
    expect(report.summary).toContain('Crash Reporter');
  });

  it('generates reasonably unique crash ids', () => {
    const first = generateCrashId(1711939200000);
    const second = generateCrashId(1711939200000);
    expect(first).not.toEqual(second);
    expect(first.startsWith('CRASH-')).toBe(true);
    expect(second.startsWith('CRASH-')).toBe(true);
  });
});

describe('privacy scrubber', () => {
  it('scrubs sensitive paths and secrets from text', () => {
    const sample = 'User home /Users/tester/Downloads and token=abcdef1234567890';
    const result = scrubSensitiveText(sample);
    expect(result).not.toContain('/Users/tester');
    expect(result).toContain(REDACTION_TEXT);
  });

  it('redacts deeply nested secrets', () => {
    const payload = {
      service: {
        credentials: {
          apiKey: 'abcdef1234567890',
          nested: { path: String.raw`C:\Users\victim\Desktop\secret.txt` },
        },
      },
    };

    const result = scrubSensitiveData(payload);
    const stringified = JSON.stringify(result);
    expect(stringified).not.toContain('victim');
    expect(stringified).toContain(REDACTION_TEXT);
  });
});

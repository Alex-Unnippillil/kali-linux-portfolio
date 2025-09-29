import { inspectHeader } from '../components/apps/volatility/profileDetection';

const encoder = new TextEncoder();

describe('inspectHeader heuristics', () => {
  const buildBuffer = (content: string) => encoder.encode(content);

  test('detects Windows 10 profile with high confidence', () => {
    const header = `VolatilityHeader\nBuild: 19041\nMajorVersion: 10\nMachine: AMD64\nntoskrnl.exe`;
    const result = inspectHeader(buildBuffer(header));

    expect(result.profile?.slug).toBe('Win10x64_19041');
    expect(result.confidence.level).toBe('high');
    expect(result.confidence.score).toBeGreaterThanOrEqual(0.75);
    expect(result.note).toMatch(/19041/);
  });

  test('detects Linux Ubuntu sample', () => {
    const header = `ELF\nLinux version 5.8.0-53-generic (buildd@lcy01) (Ubuntu 5.8.0)\nCPU: x86_64`;
    const result = inspectHeader(buildBuffer(header));

    expect(result.profile?.slug).toBe('LinuxUbuntu2004x64');
    expect(result.confidence.level).toBe('high');
    expect(result.family).toBe('linux');
  });

  test('falls back to suggestions when signature is ambiguous', () => {
    const header = `Captured from Windows host\nMachine: x86\nKernel artifacts present`;
    const result = inspectHeader(buildBuffer(header));

    expect(result.profile).toBeNull();
    expect(result.confidence.level).toBe('none');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.note).toMatch(/Windows artefacts/i);
  });
});

import {
  createLogGenerator,
  DEFAULT_LOG_SEED,
  FakeLogEntry,
  formatLogEntry,
  generateLogs,
} from '../utils/faker/logs';
import {
  DEFAULT_SERVICE_SEED,
  generateServiceReport,
} from '../utils/faker/services';
import {
  DEFAULT_SERIAL_SEED,
  formatSerialFrame,
  generateSerialFrames,
} from '../utils/faker/serial';

describe('faker generators', () => {
  it('produces deterministic log sequences with sanitized messages', () => {
    const logsA = generateLogs({ seed: DEFAULT_LOG_SEED, count: 5 });
    const logsB = generateLogs({ seed: DEFAULT_LOG_SEED, count: 5 });
    expect(logsA).toEqual(logsB);
    logsA.forEach((entry: FakeLogEntry, idx: number) => {
      const formatted = formatLogEntry(entry);
      expect(formatted.trim()).toBe(formatted);
      expect(formatted).not.toMatch(/[<>]/);
      if (idx > 0) {
        expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(
          new Date(logsA[idx - 1].timestamp).getTime()
        );
      }
    });
    const generator = createLogGenerator({ seed: 'sanity-check' });
    const first = generator();
    const second = generator();
    expect(second.id).not.toBe(first.id);
  });

  it('produces consistent service reports with reusable script examples', () => {
    const report = generateServiceReport({
      seed: DEFAULT_SERVICE_SEED,
      hostCount: 2,
    });
    expect(report.hosts.length).toBeGreaterThan(0);
    report.hosts.forEach((host) => {
      expect(host.ip).toMatch(/^(10|192)\./);
      host.ports.forEach((port) => {
        expect(port.state).toBe('open');
        expect(port.summary.trim()).toBe(port.summary);
        port.scripts.forEach((script) => {
        expect(report.scriptExamples).toHaveProperty(script.name);
          expect(script.output).not.toMatch(/[<>]/);
        });
      });
    });
  });

  it('formats serial frames with deterministic payloads', () => {
    const frames = generateSerialFrames({
      seed: DEFAULT_SERIAL_SEED,
      count: 4,
    });
    const framesAgain = generateSerialFrames({
      seed: DEFAULT_SERIAL_SEED,
      count: 4,
    });
    expect(frames).toEqual(framesAgain);
    frames.forEach((frame) => {
      const formatted = formatSerialFrame(frame);
      expect(formatted).toContain(frame.ascii);
      expect(frame.hex).toBe(
        frame.ascii
          .split('')
          .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(' ')
          .toUpperCase()
      );
      expect(formatted).not.toMatch(/[<>]/);
    });
  });
});

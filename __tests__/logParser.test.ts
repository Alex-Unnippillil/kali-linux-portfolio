import { parseLogs, redactLine } from '../utils/logParser';

describe('log parser', () => {
  it('parses timestamp and marker', () => {
    const text = '2024-01-01 12:00:00 INFO Hello world';
    expect(parseLogs(text)).toEqual([
      {
        timestamp: '2024-01-01 12:00:00',
        marker: 'INFO',
        message: 'Hello world',
      },
    ]);
  });

  it('redacts emails and IP addresses', () => {
    const line = 'Contact user@example.com from 192.168.0.1';
    expect(redactLine(line)).toBe('Contact [REDACTED] from [REDACTED]');
  });
});

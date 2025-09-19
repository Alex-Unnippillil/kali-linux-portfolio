import { redactSensitive } from '@/lib/redact';

describe('redactSensitive', () => {
  it('masks email addresses and reports counts', () => {
    const { text, stats } = redactSensitive('Reach me at analyst@corp.example for access.');
    expect(text).toBe('Reach me at <email> for access.');
    expect(stats.emails).toBe(1);
    expect(stats.ipAddresses).toBe(0);
    expect(stats.ids).toBe(0);
    expect(stats.total).toBe(1);
  });

  it('masks IPv4 and IPv6 addresses', () => {
    const sample = 'Src 10.0.0.8 connects to 2001:db8::1 over TLS.';
    const { text, stats } = redactSensitive(sample);
    expect(text).toBe('Src <ip> connects to <ip> over TLS.');
    expect(stats.ipAddresses).toBe(2);
    expect(stats.total).toBe(2);
  });

  it('masks IDs in JSON and labelled fields', () => {
    const payload = '{"userId":"42"} Session ID: ABC-123';
    const { text, stats } = redactSensitive(payload);
    expect(text).toBe('{"userId": "<id>"} Session ID: <id>');
    expect(stats.ids).toBe(2);
  });

  it('replaces GUIDs and combines counts', () => {
    const guid = 'Request 550e8400-e29b-41d4-a716-446655440000 from ops@example.com';
    const { text, stats } = redactSensitive(guid);
    expect(text).toBe('Request <id> from <email>');
    expect(stats.ids).toBe(1);
    expect(stats.emails).toBe(1);
    expect(stats.total).toBe(2);
  });

  it('returns zero counts for benign text', () => {
    const { text, stats } = redactSensitive('Nothing to redact here.');
    expect(text).toBe('Nothing to redact here.');
    expect(stats).toEqual({ emails: 0, ipAddresses: 0, ids: 0, total: 0 });
  });
});

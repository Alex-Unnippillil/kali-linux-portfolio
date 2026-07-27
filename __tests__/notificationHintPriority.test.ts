import { derivePriorityFromHints } from '../utils/notifications/ruleEngine';

describe('derivePriorityFromHints', () => {
  it('uses x-kali-priority hints when present', () => {
    const result = derivePriorityFromHints({ 'x-kali-priority': 'Critical ' });
    expect(result).toEqual({ priority: 'critical', source: 'hint:x-kali-priority' });
  });

  it('maps urgency hints to priorities with the correct source', () => {
    const result = derivePriorityFromHints({ urgency: 2 });
    expect(result).toEqual({ priority: 'critical', source: 'hint:urgency' });
  });

  it('resolves standard priority hints and preserves the source label', () => {
    const result = derivePriorityFromHints({ priority: 'low' });
    expect(result).toEqual({ priority: 'low', source: 'hint:priority' });
  });

  it('normalizes numeric hints for custom priority mappings', () => {
    const result = derivePriorityFromHints({ 'x-kali-priority': 1 });
    expect(result).toEqual({ priority: 'high', source: 'hint:x-kali-priority' });
  });

  it('falls back to standard priority hints when custom hints are invalid', () => {
    const result = derivePriorityFromHints({ 'x-kali-priority': 'urgent', priority: 'high' });
    expect(result).toEqual({ priority: 'high', source: 'hint:priority' });
  });

  it('returns null when hints do not map to a known priority', () => {
    expect(derivePriorityFromHints({ 'x-kali-priority': 'urgent' })).toBeNull();
    expect(derivePriorityFromHints({ unknown: 'value' })).toBeNull();
  });
});

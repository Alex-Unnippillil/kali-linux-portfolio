import {
  classifyNotification,
  derivePriorityFromHints,
  getDefaultRuleSet,
} from '../utils/notifications/ruleEngine';

describe('notification rule engine', () => {
  it('prefers explicit priority overrides', () => {
    const result = classifyNotification({
      appId: 'custom-app',
      title: 'Manual override',
      body: 'Force critical display',
      priority: 'critical',
    });
    expect(result.priority).toBe('critical');
    expect(result.source).toBe('explicit');
  });

  it('respects kali priority hint from D-Bus metadata', () => {
    const result = classifyNotification({
      appId: 'demo',
      title: 'DBus hint test',
      hints: {
        'x-kali-priority': 'low',
      },
      body: 'Should collapse',
    });
    expect(result.priority).toBe('low');
    expect(result.source).toBe('hint');
  });

  it('promotes urgency hints to higher priorities', () => {
    const resultCritical = classifyNotification({
      appId: 'demo',
      title: 'Critical hint',
      hints: { urgency: 2 },
    });
    expect(resultCritical.priority).toBe('critical');

    const resultHigh = classifyNotification({
      appId: 'demo',
      title: 'High hint',
      hints: { urgency: 1 },
    });
    expect(resultHigh.priority).toBe('high');
  });

  it('elevates security tool failures via rule match', () => {
    const result = classifyNotification({
      appId: 'openvas',
      title: 'Scan finished with errors',
      body: 'Host scan failed due to timeout',
    });
    expect(result.priority).toBe('high');
    expect(result.source).toBe('rule');
  });

  it('keeps scan completions at normal priority', () => {
    const result = classifyNotification({
      appId: 'nmap',
      title: 'Scan complete',
      body: 'Scan completed with 0 hosts skipped',
    });
    expect(result.priority).toBe('normal');
  });

  it('collapses noisy CLI output to low priority by default', () => {
    const noisyOutputs = Array.from({ length: 5 }, (_, index) =>
      classifyNotification({
        appId: 'tool-noisy',
        title: `stdout chunk ${index + 1}`,
        body: `STDOUT line ${index + 1}: lorem ipsum`,
      }),
    );
    expect(noisyOutputs.every(result => result.priority === 'low')).toBe(true);
  });

  it('falls back to the configured default priority', () => {
    const result = classifyNotification({
      appId: 'calendar',
      title: 'Meeting reminder',
    });
    expect(result.priority).toBe(getDefaultRuleSet().defaultPriority);
  });

  it('derives urgency levels from hint helper', () => {
    const high = derivePriorityFromHints({ urgency: 1 });
    expect(high?.priority).toBe('high');

    const low = derivePriorityFromHints({ urgency: 0 });
    expect(low?.priority).toBe('low');
  });
});

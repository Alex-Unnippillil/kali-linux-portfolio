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

describe('notification rule engine edge cases', () => {
  it('normalizes urgency and priority hints across multiple formats', () => {
    expect(derivePriorityFromHints({ urgency: 'critical' })?.priority).toBe('critical');
    expect(derivePriorityFromHints({ urgency: 'normal' })?.priority).toBe('normal');
    expect(derivePriorityFromHints({ 'urgency-level': 2 })?.priority).toBe('critical');
    expect(derivePriorityFromHints({ 'urgency-level': '0' })?.priority).toBe('low');

    expect(derivePriorityFromHints({ priority: '2' })?.priority).toBe('critical');
    expect(derivePriorityFromHints({ priority: 1 })?.priority).toBe('high');
    expect(derivePriorityFromHints({ importance: 'High' })?.priority).toBe('high');
    expect(derivePriorityFromHints({ importance: 0 })?.priority).toBe('low');
  });

  it('exhaustively normalizes priority hints and urgency fallbacks', () => {
    const priorityCases: Array<{ hints: Record<string, unknown>; expected: string | null }> = [
      { hints: { priority: 'critical' }, expected: 'critical' },
      { hints: { priority: 'HIGH' }, expected: 'high' },
      { hints: { priority: 'normal' }, expected: 'normal' },
      { hints: { priority: 'low' }, expected: 'low' },
      { hints: { priority: '0' }, expected: 'low' },
      { hints: { priority: true as unknown as string }, expected: null },
      { hints: { priority: undefined as unknown as string }, expected: null },
      { hints: { priority: ['critical'] as unknown as string[] }, expected: 'critical' },
      { hints: { importance: ['low'] as unknown as string[] }, expected: 'low' },
      { hints: { importance: true as unknown as string }, expected: null },
    ];

    priorityCases.forEach(({ hints, expected }) => {
      const result = derivePriorityFromHints(hints);
      if (expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result?.priority).toBe(expected);
      }
    });

    const urgencyVariants: Array<{ hints: Record<string, unknown>; expected: string | null }> = [
      { hints: { urgency: 'high' }, expected: 'high' },
      { hints: { urgency: 'critical' }, expected: 'critical' },
      { hints: { urgency: 'low' }, expected: 'low' },
      { hints: { urgency: 'normal' }, expected: 'normal' },
      { hints: { urgency: '2' }, expected: 'critical' },
      { hints: { urgency: '1' }, expected: 'high' },
      { hints: { urgency: '0' }, expected: 'low' },
      { hints: { urgency: undefined as unknown as string }, expected: null },
    ];

    urgencyVariants.forEach(({ hints, expected }) => {
      const result = derivePriorityFromHints(hints);
      if (expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result?.priority).toBe(expected);
      }
    });
  });

  it('returns null for malformed priority hints after normalization', () => {
    expect(derivePriorityFromHints({ priority: ['normal', 'low'] as unknown as string[] })).toBeNull();
    expect(
      derivePriorityFromHints({
        importance: { level: 'critical' } as unknown as string,
      }),
    ).toBeNull();
    expect(derivePriorityFromHints({ urgency: 'urgent' })).toBeNull();
  });

  it('matches complex rule constraints including prefixes, keywords, and hints', () => {
    const complexRuleSet = {
      version: 1,
      defaultPriority: 'low' as const,
      rules: [
        {
          id: 'complex-match',
          priority: 'critical' as const,
          match: {
            appIdPrefix: ['sec-'],
            bodyContains: ['breach'],
            titleContains: ['Alert'],
            keywords: ['breach'],
            hints: {
              channel: ['security', undefined as unknown as string],
              severity: ['critical', '2'],
            },
          },
        },
      ],
    };

    const matched = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Alert: Breach detected',
        body: 'Sensor reported breach error at node 4',
        hints: { channel: 'Security', severity: '2' },
      },
      complexRuleSet,
    );

    expect(matched).toEqual({
      priority: 'critical',
      matchedRuleId: 'complex-match',
      source: 'rule',
    });

    const missingHint = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Alert: Breach detected',
        body: 'Sensor reported breach error at node 4',
        hints: { channel: 'operations' },
      },
      complexRuleSet,
    );

    expect(missingHint).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });

    const prefixMiss = classifyNotification(
      {
        appId: 'ops-monitor',
        title: 'Alert: Breach detected',
        body: 'Sensor reported breach error at node 4',
        hints: { channel: 'Security', severity: 'critical' },
      },
      complexRuleSet,
    );

    expect(prefixMiss).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });

    const titleMiss = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Status update',
        body: 'Sensor reported breach error at node 4',
        hints: { channel: 'Security', severity: 'critical' },
      },
      complexRuleSet,
    );

    expect(titleMiss).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });

    const keywordMiss = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Alert: System ready',
        body: 'All services running nominal checks completed',
        hints: { channel: 'Security', severity: 'critical' },
      },
      complexRuleSet,
    );

    expect(keywordMiss).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });

    const undefinedHints = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Alert: Breach detected',
        body: 'Sensor reported breach error at node 4',
      },
      complexRuleSet,
    );

    expect(undefinedHints).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });

    const undefinedCandidates = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Alert: Breach detected',
        body: 'Sensor reported breach error at node 4',
        hints: { channel: undefined as unknown as string, severity: undefined as unknown as string },
      },
      complexRuleSet,
    );

    expect(undefinedCandidates).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });

    const missingBody = classifyNotification(
      {
        appId: 'sec-monitor',
        title: 'Alert: Breach detected',
        hints: { channel: 'Security', severity: 'critical' },
      },
      complexRuleSet,
    );

    expect(missingBody).toEqual({ priority: 'low', matchedRuleId: null, source: 'default' });
  });
});

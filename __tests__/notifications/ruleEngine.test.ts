import {
  classifyNotification,
  derivePriorityFromHints,
  getDefaultRuleSet,
  PRIORITY_ORDER,
  NotificationPriority,
} from '../../utils/notifications/ruleEngine';
import { fixtureRuleIds, notificationRuleFixtures } from './__fixtures__/notificationRules';

describe('notification rule fixtures', () => {
  it('stay in sync with the published rule set', () => {
    const defaultRuleSet = getDefaultRuleSet();
    for (const expectedRule of notificationRuleFixtures.rules) {
      const actualRule = defaultRuleSet.rules.find(rule => rule.id === expectedRule.id);
      expect(actualRule).toBeDefined();
      expect(actualRule).toMatchObject(expectedRule);
    }
  });
});

describe('classifyNotification', () => {
  const ruleSet = notificationRuleFixtures;

  it('prefers explicit priority over hints and rules', () => {
    const result = classifyNotification(
      {
        appId: 'openvas',
        title: 'Manual override',
        body: 'Should remain critical',
        priority: 'critical',
        hints: { urgency: 0 },
      },
      ruleSet,
    );

    expect(result).toEqual({
      priority: 'critical',
      matchedRuleId: 'explicit',
      source: 'explicit',
    });
  });

  it('derives priority from hints before evaluating rules', () => {
    const result = classifyNotification(
      {
        appId: 'openvas',
        title: 'Hint should win',
        body: 'Even if the body mentions errors it should use hint',
        hints: { 'x-kali-priority': 'low' },
      },
      ruleSet,
    );

    expect(result.priority).toBe('low');
    expect(result.source).toBe('hint');
    expect(result.matchedRuleId).toBe('hint:x-kali-priority');
  });

  it('matches security tool failures and elevates the priority', () => {
    const result = classifyNotification(
      {
        appId: 'metasploit',
        title: 'Exploit failed',
        body: 'Exploit failed because of missing module',
      },
      ruleSet,
    );

    expect(result).toEqual({ priority: 'high', matchedRuleId: 'security-tool-failure', source: 'rule' });
  });

  it('keeps successful scans at normal priority', () => {
    const result = classifyNotification(
      {
        appId: 'nmap',
        title: 'Scan complete',
        body: 'Scan completed and report exported to disk',
      },
      ruleSet,
    );

    expect(result).toEqual({ priority: 'normal', matchedRuleId: 'security-tool-complete', source: 'rule' });
  });

  it('collapses noisy CLI output to low priority', () => {
    const result = classifyNotification(
      {
        appId: 'console',
        title: 'stdout chunk',
        body: 'STDOUT line 1: debug trace log',
      },
      ruleSet,
    );

    expect(result).toEqual({ priority: 'low', matchedRuleId: 'noisy-cli-output', source: 'rule' });
  });

  it('treats chatty background updates as low priority when titles match', () => {
    const result = classifyNotification(
      {
        appId: 'sync-daemon',
        title: 'Heartbeat ping from daemon',
      },
      ruleSet,
    );

    expect(result).toEqual({ priority: 'low', matchedRuleId: 'chatty-background', source: 'rule' });
  });

  it('falls back to the rule set default when nothing matches', () => {
    const result = classifyNotification(
      {
        appId: 'calendar',
        title: 'Team sync reminder',
      },
      ruleSet,
    );

    expect(result).toEqual({ priority: ruleSet.defaultPriority, matchedRuleId: null, source: 'default' });
  });
});

describe('derivePriorityFromHints', () => {
  it('supports explicit Kali priority hint', () => {
    const derived = derivePriorityFromHints({ 'x-kali-priority': 'critical' });
    expect(derived).toEqual({ priority: 'critical', source: 'hint:x-kali-priority' });
  });

  it('promotes urgency hints regardless of numeric or string input', () => {
    const critical = derivePriorityFromHints({ urgency: 2 });
    const high = derivePriorityFromHints({ urgency: '1' });
    const low = derivePriorityFromHints({ urgency: 0 });

    expect(critical).toEqual({ priority: 'critical', source: 'hint:urgency' });
    expect(high).toEqual({ priority: 'high', source: 'hint:urgency' });
    expect(low).toEqual({ priority: 'low', source: 'hint:urgency' });
  });

  it('checks urgency-level when urgency is absent', () => {
    const derived = derivePriorityFromHints({ 'urgency-level': 'high' });
    expect(derived).toEqual({ priority: 'high', source: 'hint:urgency-level' });
  });

  it('falls back to priority and importance hints', () => {
    const fromPriority = derivePriorityFromHints({ priority: 'critical' });
    const fromImportance = derivePriorityFromHints({ importance: 'high' });

    expect(fromPriority).toEqual({ priority: 'critical', source: 'hint:priority' });
    expect(fromImportance).toEqual({ priority: 'high', source: 'hint:importance' });
  });

  it('returns null when no known hints are present', () => {
    expect(derivePriorityFromHints({})).toBeNull();
    expect(derivePriorityFromHints(undefined)).toBeNull();
  });
});

describe('priority ordering', () => {
  it('lists priorities from most to least urgent without duplicates', () => {
    expect(PRIORITY_ORDER).toEqual(['critical', 'high', 'normal', 'low']);
    const unique = new Set(PRIORITY_ORDER);
    expect(unique.size).toBe(PRIORITY_ORDER.length);
  });

  it('supports sorting arbitrary notification priorities by severity', () => {
    const values: NotificationPriority[] = ['low', 'critical', 'normal', 'high'];
    const order = new Map(PRIORITY_ORDER.map((priority, index) => [priority, index]));
    const sorted = [...values].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

    expect(sorted).toEqual(['critical', 'high', 'normal', 'low']);
  });
});

describe('rule regression guards', () => {
  it('ensures the fixture list stays updated when new rules are added', () => {
    const defaultRuleSet = getDefaultRuleSet();
    const fixtureSet = new Set(fixtureRuleIds);
    const missingRules = defaultRuleSet.rules
      .map(rule => rule.id)
      .filter(ruleId => !fixtureSet.has(ruleId));

    expect(missingRules).toHaveLength(0);
  });
});

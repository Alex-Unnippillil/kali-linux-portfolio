import { NotificationRuleSet } from '../../../utils/notifications/ruleEngine';

export const notificationRuleFixtures: NotificationRuleSet = {
  version: 1,
  defaultPriority: 'normal',
  rules: [
    {
      id: 'hint-urgency-critical',
      priority: 'critical',
      match: {
        hints: {
          urgency: [2, '2', 'critical'],
          'urgency-level': ['critical'],
        },
      },
    },
    {
      id: 'hint-urgency-high',
      priority: 'high',
      match: {
        hints: {
          urgency: [1, '1', 'high'],
          'urgency-level': ['high'],
        },
      },
    },
    {
      id: 'security-tool-failure',
      priority: 'high',
      match: {
        appId: ['openvas', 'nmap', 'metasploit', 'msfconsole'],
        bodyContains: ['failed', 'error', 'critical', 'exploit', 'vulnerability'],
      },
    },
    {
      id: 'security-tool-complete',
      priority: 'normal',
      match: {
        appId: ['openvas', 'nmap', 'metasploit', 'msfconsole'],
        bodyContains: ['completed', 'finished', 'report', 'exported'],
      },
    },
    {
      id: 'noisy-cli-output',
      priority: 'low',
      match: {
        appId: ['terminal', 'console', 'shell', 'logs', 'tool-noisy'],
        bodyContains: ['stdout', 'stderr', 'log', 'debug', 'trace', 'line'],
      },
    },
    {
      id: 'chatty-background',
      priority: 'low',
      match: {
        appId: ['update-service', 'sync-daemon', 'telemetry'],
        titleContains: ['heartbeat', 'status', 'ping'],
      },
    },
  ],
};

export const fixtureRuleIds = notificationRuleFixtures.rules.map(rule => rule.id);

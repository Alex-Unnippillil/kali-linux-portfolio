import type { TestInfo } from '@playwright/test';

export type QuarantinedTest = {
  /** Regex applied to the Playwright test title. */
  titlePattern: RegExp;
  /** Optional regex applied to the source file path. */
  filePattern?: RegExp;
  /** Explanation that will surface in reporters and skip messages. */
  reason: string;
  /** Optional link to tracking issue, doc entry, etc. */
  ticket?: string;
};

const defaultQuarantinedTests: QuarantinedTest[] = [
  {
    titlePattern: /loads \/apps\/weather_widget$/,
    reason:
      'Weather widget intermittently times out in CI when the upstream weather provider throttles requests (see test-log.md).',
    ticket: 'docs/test-log.md',
  },
];

const quarantineList = defaultQuarantinedTests;

export function getQuarantineMatch(testInfo: TestInfo) {
  return quarantineList.find((entry) => {
    const titleMatch = entry.titlePattern.test(testInfo.title);
    const fileMatch = entry.filePattern ? entry.filePattern.test(testInfo.file) : true;
    return titleMatch && fileMatch;
  });
}

export function listQuarantinedTests(): QuarantinedTest[] {
  return quarantineList.slice();
}

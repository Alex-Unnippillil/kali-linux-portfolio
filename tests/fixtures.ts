import { expect as baseExpect, test as base } from '@playwright/test';
import { getQuarantineMatch } from '../playwright/flaky-tests';

const runQuarantined = process.env.RUN_QUARANTINED === 'true';

const test = base.extend({});

test.beforeEach(async ({}, testInfo) => {
  const quarantine = getQuarantineMatch(testInfo);
  if (quarantine && !runQuarantined) {
    testInfo.annotations.push({ type: 'quarantined', description: quarantine.reason });
    if (quarantine.ticket) {
      testInfo.annotations.push({ type: 'tracking', description: quarantine.ticket });
    }
    testInfo.skip(`Quarantined flaky test: ${quarantine.reason}`);
  }
});

export { test };
export const expect = baseExpect;

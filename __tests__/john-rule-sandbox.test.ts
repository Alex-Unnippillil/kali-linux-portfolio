import {
  estimateRuleSet,
  simulateRuleSetAsync,
} from '../modules/john/rule-sandbox';

describe('john rule sandbox simulator', () => {
  it('estimates candidates for common rule set patterns', () => {
    const result = estimateRuleSet({
      baseWords: ['password', 'hello'],
      rules: [':', 'c', '$[0-9]'],
    });

    expect(result.ruleBreakdown).toHaveLength(3);
    expect(result.totalCandidates).toBe(24);
    expect(result.ruleBreakdown.map((entry) => entry.candidates)).toEqual([2, 2, 20]);
  });

  it('supports combined prefix, suffix and duplicate steps', () => {
    const result = estimateRuleSet({
      baseWords: ['test'],
      rules: ['^!$!', '^![0-1]d'],
    });

    expect(result.ruleBreakdown).toHaveLength(2);
    expect(result.totalCandidates).toBe(3);
    expect(result.ruleBreakdown[0].candidates).toBe(1);
    expect(result.ruleBreakdown[1].candidates).toBe(2);
  });

  it('chunks long simulations to avoid blocking the UI thread', async () => {
    jest.useFakeTimers();
    try {
      const rules = Array.from({ length: 5 }, (_, index) => `$[0-${index}]`);
      const promise = simulateRuleSetAsync(
        { baseWords: ['one'], rules },
        { chunkSize: 1 }
      );

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.runAllTimers();
      await promise;
      expect(resolved).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

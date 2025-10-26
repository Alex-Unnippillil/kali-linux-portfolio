import { describe, expect, test } from '@jest/globals';
import { describeReason, resolvePackagePlan, type PackageManifest } from '../utils/packagePlanner';

describe('package planner', () => {
  const repository: Record<string, PackageManifest> = {
    alpha: { name: 'alpha', depends: ['beta'] },
    beta: { name: 'beta', depends: ['gamma', 'delta'] },
    gamma: { name: 'gamma', depends: [] },
    delta: { name: 'delta', depends: [] },
    loop: { name: 'loop', depends: ['core'] },
    core: { name: 'core', depends: ['loop'] },
    app: { name: 'app', depends: ['missing-lib'] },
  };

  test('returns dependencies before the requested package', () => {
    const plan = resolvePackagePlan({
      install: ['alpha'],
      installed: ['gamma'],
      repository,
    });

    expect(plan.actions.map((action) => action.name)).toEqual([
      'gamma',
      'delta',
      'beta',
      'alpha',
    ]);

    const gamma = plan.actions.find((action) => action.name === 'gamma');
    expect(gamma?.action).toBe('already-installed');
    expect(describeReason(gamma!.reason)).toBe('Required by beta');

    const alpha = plan.actions.find((action) => action.name === 'alpha');
    expect(alpha?.reason.type).toBe('explicit');
    expect(describeReason(alpha!.reason)).toBe('Requested by user');
  });

  test('promotes dependency reason when package is also requested explicitly', () => {
    const plan = resolvePackagePlan({
      install: ['alpha', 'beta'],
      repository,
    });

    const beta = plan.actions.find((action) => action.name === 'beta');
    expect(beta?.reason.type).toBe('explicit');
    expect(describeReason(beta!.reason)).toBe('Requested by user');
  });

  test('surfaces missing packages with parent context', () => {
    const plan = resolvePackagePlan({
      install: ['app', 'ghost'],
      repository,
    });

    expect(plan.missing).toEqual(
      expect.arrayContaining([
        { name: 'missing-lib', requiredBy: 'app' },
        { name: 'ghost', requiredBy: null },
      ]),
    );
  });

  test('records dependency cycles', () => {
    const plan = resolvePackagePlan({
      install: ['loop'],
      repository,
    });

    expect(plan.cycles.length).toBeGreaterThan(0);
    expect(plan.cycles[0]).toContain('loop');
    expect(plan.cycles[0]).toContain('core');
  });
});

import {
  describeConflict,
  evaluateToggle,
  getHeldPackages,
} from '../apps/recon-ng/packagePlanner';

describe('package planner', () => {
  it('reports held packages with reasons', () => {
    const warnings = getHeldPackages(['DNS Enumeration', 'Port Scan']);
    expect(warnings).toEqual([
      expect.objectContaining({
        name: 'DNS Enumeration',
        reason: expect.stringContaining('Held'),
      }),
    ]);
  });

  it('flags conflicts when removing a pinned package', () => {
    const plan = ['DNS Enumeration', 'WHOIS Lookup', 'Reverse IP Lookup'];
    const evaluation = evaluateToggle(plan, 'Reverse IP Lookup');
    expect(evaluation.isRemoval).toBe(true);
    expect(evaluation.conflicts).toHaveLength(1);
    expect(evaluation.conflicts[0]).toMatchObject({
      package: 'Reverse IP Lookup',
      type: 'pinned-package',
    });
    expect(describeConflict(evaluation.conflicts[0])).toMatch(/pinned/i);
  });

  it('detects pinned dependents when removing shared dependencies', () => {
    const plan = [
      'DNS Enumeration',
      'WHOIS Lookup',
      'Reverse IP Lookup',
      'Port Scan',
    ];
    const evaluation = evaluateToggle(plan, 'WHOIS Lookup');
    expect(evaluation.conflicts).toHaveLength(1);
    const conflict = evaluation.conflicts[0];
    expect(conflict.type).toBe('pinned-dependent');
    expect(conflict.dependents).toContain('Reverse IP Lookup');
    expect(describeConflict(conflict)).toMatch(/depends on/i);
  });
});


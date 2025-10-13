import {
  assignExperiment,
  assignExperimentVariant,
  experiments,
  getExperimentDefinition,
  listExperiments,
} from '../lib/experiments';

describe('experiment registry', () => {
  it('lists registered experiments with metadata', () => {
    const defs = listExperiments();
    expect(defs).toHaveLength(Object.keys(experiments).length);
    expect(defs[0]).toHaveProperty('metrics');
    expect(defs[0]).toHaveProperty('variants');
  });

  it('retrieves specific experiment definitions', () => {
    const experiment = getExperimentDefinition('launcher-density');
    expect(experiment?.id).toBe('launcher-density');
    expect(experiment?.variants).toHaveLength(3);
  });

  it('assigns deterministic variants for a unit', () => {
    const first = assignExperimentVariant('window-chrome', 'user-123');
    const second = assignExperimentVariant('window-chrome', 'user-123');

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.id).toBe(second?.id);
  });

  it('defaults to the control variant when no unit id is provided', () => {
    const variant = assignExperimentVariant('launcher-density', '');
    expect(variant?.id).toBe('control');
  });

  it('respects weight balance across many assignments', () => {
    const counts: Record<string, number> = { control: 0, compact: 0, comfortable: 0 };
    for (let index = 0; index < 5000; index += 1) {
      const variant = assignExperimentVariant('launcher-density', `user-${index}`);
      if (variant) {
        counts[variant.id] += 1;
      }
    }

    const total = counts.control + counts.compact + counts.comfortable;
    expect(total).toBe(5000);

    // Allow a generous ±5% tolerance around the target share.
    expect(counts.control / total).toBeGreaterThan(0.45);
    expect(counts.control / total).toBeLessThan(0.55);

    expect(counts.compact / total).toBeGreaterThan(0.25);
    expect(counts.compact / total).toBeLessThan(0.35);

    expect(counts.comfortable / total).toBeGreaterThan(0.15);
    expect(counts.comfortable / total).toBeLessThan(0.25);
  });

  it('returns experiment and variant payload together', () => {
    const assignment = assignExperiment('window-chrome', 'user-42');
    expect(assignment?.experiment.id).toBe('window-chrome');
    expect(assignment?.variant).toBeDefined();
  });
});

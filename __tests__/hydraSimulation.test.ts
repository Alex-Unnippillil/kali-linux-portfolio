import { createHydraSimulation, normalizeHydraSeed } from '../components/apps/hydra/simulation';

describe('Hydra simulation seeding', () => {
  const config = {
    userList: 'alice\nbob',
    passList: 'spring\n2024',
    backoffThreshold: 5,
    lockoutThreshold: 10,
  } as const;

  it('produces identical event sequences for the same seed', () => {
    const seed = 'seed-123';
    const simA = createHydraSimulation({ ...config, seed });
    const simB = createHydraSimulation({ ...config, seed });
    expect(simA.events).toEqual(simB.events);
  });

  it('varies event sequence when seed changes', () => {
    const simA = createHydraSimulation({ ...config, seed: 'seed-one' });
    const simB = createHydraSimulation({ ...config, seed: 'seed-two' });
    expect(simA.events).not.toEqual(simB.events);
  });

  it('normalizes blank seeds to the default value', () => {
    expect(normalizeHydraSeed('')).toBe(normalizeHydraSeed(undefined));
  });
});

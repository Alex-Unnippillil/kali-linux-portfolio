/** @jest-environment node */
// @vitest-environment node
import { hashEntry, verifyChain } from '../apps/evidence-notebook/utils';

describe('evidence notebook hash chaining', () => {
  it('detects tampering in chain', async () => {
    const t1 = '2024-01-01T00:00:00Z';
    const h1 = await hashEntry('first note', '', t1);
    const t2 = '2024-01-01T00:01:00Z';
    const h2 = await hashEntry('second note', h1, t2);
    const entries = [
      { data: 'first note', timestamp: t1, hash: h1 },
      { data: 'second note', timestamp: t2, hash: h2 },
    ];
    expect(await verifyChain(entries)).toBe(true);
    const tampered = [...entries];
    tampered[1] = { ...tampered[1], data: 'evil' };
    expect(await verifyChain(tampered)).toBe(false);
  });
});

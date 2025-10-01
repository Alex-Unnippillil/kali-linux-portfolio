import {
  deterministicStringify,
  deterministicEquals,
  parseDeterministicJSON,
} from '../utils/serdes';

describe('deterministicStringify', () => {
  it('sorts keys at every depth', () => {
    const payload = { b: 1, a: { d: 2, c: 3 } };
    expect(deterministicStringify(payload)).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it('produces identical output for equivalent permutations', () => {
    const first = { a: 1, z: { y: [3, 2, 1], x: { c: true, a: null } } };
    const second = { z: { x: { a: null, c: true }, y: [3, 2, 1] }, a: 1 };

    const serializedFirst = deterministicStringify(first);
    const serializedSecond = deterministicStringify(second);

    expect(serializedFirst).toBe(serializedSecond);
    expect(serializedFirst).toMatchSnapshot();
  });

  it('remains compatible with vanilla JSON consumers', () => {
    const data = {
      title: 'Snapshot',
      nested: { values: [1, 2, { note: 'same data' }] },
      flag: true,
    };

    const deterministic = deterministicStringify(data);
    const vanilla = JSON.stringify(data);

    expect(deterministic).not.toBeUndefined();
    expect(JSON.parse(deterministic!)).toEqual(JSON.parse(vanilla!));
  });

  it('serializes bigint values without throwing', () => {
    const serialized = deterministicStringify({ value: 123n });
    expect(serialized).toBe('{"value":{"$$deterministicType":"bigint","value":"123"}}');

    const revived = parseDeterministicJSON(serialized!);
    expect(revived).toEqual({ value: 123n });
  });

  it('serializes dates using ISO strings', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    expect(deterministicStringify({ date })).toBe('{"date":"2020-01-01T00:00:00.000Z"}');
  });
});

describe('deterministicEquals', () => {
  it('ignores insertion order differences', () => {
    const a = { alpha: 1, nested: { z: 0, y: [1, 2, 3] } };
    const b = { nested: { y: [1, 2, 3], z: 0 }, alpha: 1 };

    expect(deterministicEquals(a, b)).toBe(true);
  });

  it('detects meaningful changes', () => {
    const baseline = { value: 1 };
    const mutated = { value: 2 };

    expect(deterministicEquals(baseline, mutated)).toBe(false);
  });
});

import seedrandom from 'seedrandom';
import { random, reset, serialize, deserialize } from '../rng';

describe('rng.deserialize', () => {
  afterEach(() => {
    reset();
  });

  it('restores RNG from a valid state string', () => {
    reset('seed');
    random();
    random();
    const state = serialize();
    const next = random();
    reset('other');
    random();
    deserialize(state);
    expect(random()).toBe(next);
  });

  it('resets RNG when state is invalid JSON', () => {
    reset('seed');
    random();
    deserialize('not-json');
    const expected = seedrandom('', { state: true })();
    expect(random()).toBe(expected);
  });

  it('resets RNG when parsed state is missing fields', () => {
    reset('seed');
    random();
    const malformed = JSON.stringify({ foo: 'bar' });
    deserialize(malformed);
    const expected = seedrandom('', { state: true })();
    expect(random()).toBe(expected);
  });
});

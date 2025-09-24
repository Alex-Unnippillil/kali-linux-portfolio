import { matchesKey } from '../hooks/useGameInput';

describe('matchesKey', () => {
  it('treats "Space" binding as the space bar key', () => {
    const event = { key: ' ' } as unknown as KeyboardEvent;
    expect(matchesKey('Space', event)).toBe(true);
  });

  it('matches space binding when event reports code only', () => {
    const event = { key: 'Shift', code: 'Space' } as unknown as KeyboardEvent;
    expect(matchesKey(' ', event)).toBe(true);
  });

  it('matches by event.code when the key differs', () => {
    const event = { key: 'z', code: 'KeyZ' } as unknown as KeyboardEvent;
    expect(matchesKey('KeyZ', event)).toBe(true);
  });

  it('returns false when key and code do not match', () => {
    const event = { key: 'a', code: 'KeyA' } as unknown as KeyboardEvent;
    expect(matchesKey('ArrowUp', event)).toBe(false);
  });
});

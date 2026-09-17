import { ENTRY_PREFERENCE_KEY, prefersDesktop, rememberDesktop } from '../lib/portfolio-preferences';
describe('optional desktop preference', () => {
  afterEach(() => { jest.restoreAllMocks(); localStorage.clear(); });
  it('requires explicit opt-in and can be cleared', () => {
    expect(prefersDesktop()).toBe(false); rememberDesktop(true);
    expect(localStorage.getItem(ENTRY_PREFERENCE_KEY)).toBe('desktop');
    expect(prefersDesktop()).toBe(true); rememberDesktop(false); expect(prefersDesktop()).toBe(false);
  });
  it('tolerates unavailable storage', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(prefersDesktop()).toBe(false); expect(() => rememberDesktop(true)).not.toThrow();
  });
});

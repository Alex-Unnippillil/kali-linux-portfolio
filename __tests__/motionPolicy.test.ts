import { beforeEach, describe, expect, test, jest } from '@jest/globals';

describe('motion policy atom', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const setup = (stored: boolean | null, prefers: boolean) => {
    window.localStorage.clear();
    if (stored !== null) {
      window.localStorage.setItem('reduced-motion', stored ? 'true' : 'false');
    }
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({
      matches: prefers,
      addEventListener: jest.fn(),
    });
  };

  test('uses stored preference when available', () => {
    setup(true, false);
    jest.isolateModules(() => {
      const { motionPolicyAtom } = require('../hooks/motionPolicy');
      expect(motionPolicyAtom.get()).toBe(true);
    });
  });

  test('falls back to system preference when no stored value', () => {
    setup(null, true);
    jest.isolateModules(() => {
      const { motionPolicyAtom } = require('../hooks/motionPolicy');
      expect(motionPolicyAtom.get()).toBe(true);
    });
  });

  test('system preference applies when stored value is false', () => {
    setup(false, true);
    jest.isolateModules(() => {
      const { motionPolicyAtom } = require('../hooks/motionPolicy');
      expect(motionPolicyAtom.get()).toBe(true);
    });
  });
});

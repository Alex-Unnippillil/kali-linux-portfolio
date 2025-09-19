jest.mock('idb-keyval', () => {
  const actual = jest.requireActual('idb-keyval');
  return {
    ...actual,
    set: jest.fn(actual.set),
    del: jest.fn(actual.del),
  };
});

import * as idbKeyval from 'idb-keyval';

type SettingsStoreModule = typeof import('../utils/settingsStore');

let defaults: SettingsStoreModule['defaults'];
let getAccent: SettingsStoreModule['getAccent'];
let getDensity: SettingsStoreModule['getDensity'];
let setAccent: SettingsStoreModule['setAccent'];
let setDensity: SettingsStoreModule['setDensity'];

beforeAll(async () => {
  const module: SettingsStoreModule = await import('../utils/settingsStore');
  ({ defaults, getAccent, getDensity, setAccent, setDensity } = module);
});

describe('settingsStore storage resilience', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('cleans up after IndexedDB quota errors', async () => {
    const quotaError = new DOMException('quota exceeded', 'QuotaExceededError');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const setMock = idbKeyval.set as jest.Mock;
    const delMock = idbKeyval.del as jest.Mock;
    setMock.mockRejectedValueOnce(quotaError);
    delMock.mockResolvedValue(undefined);

    await expect(setAccent('#ffffff')).resolves.toBeUndefined();
    expect(delMock).toHaveBeenCalledWith('accent');
    expect(warnSpy).toHaveBeenCalledWith(
      '[settingsStore] Failed to persist accent in IndexedDB',
      quotaError
    );
    expect(await getAccent()).toBe(defaults.accent);

    warnSpy.mockRestore();
  });

  it('resets localStorage keys on quota errors', async () => {
    localStorage.setItem('density', 'compact');
    const quotaError = new DOMException('quota exceeded', 'QuotaExceededError');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const storageProto = Object.getPrototypeOf(window.localStorage);
    const setSpy = jest.spyOn(storageProto, 'setItem').mockImplementation(function () {
      throw quotaError;
    });
    const removeSpy = jest.spyOn(storageProto, 'removeItem');

    await expect(setDensity('compact')).resolves.toBeUndefined();
    expect(removeSpy).toHaveBeenCalledWith('density');
    expect(warnSpy).toHaveBeenCalledWith(
      '[settingsStore] Failed to persist density in localStorage',
      quotaError
    );
    expect(await getDensity()).toBe(defaults.density);

    removeSpy.mockRestore();
    setSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

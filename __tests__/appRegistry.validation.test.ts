import { parseRegistryEntries } from '../lib/appRegistry';

describe('parseRegistryEntries', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('throws a descriptive error when an entry is missing an id', () => {
    expect(() =>
      parseRegistryEntries([
        {
          title: 'Broken App',
        },
      ]),
    ).toThrow(/App entry is missing an id/);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('App entry is missing an id'),
    );
  });

  it('throws a descriptive error when an entry is missing a title', () => {
    expect(() =>
      parseRegistryEntries([
        {
          id: 'missing-title',
        },
      ]),
    ).toThrow(/App entry is missing a title/);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('App entry is missing a title'),
    );
  });

  it('returns parsed entries when the registry is valid', () => {
    const entries = parseRegistryEntries([
      {
        id: 'valid-app',
        title: 'Valid App',
        icon: 'valid.png',
      },
    ]);

    expect(entries).toEqual([
      {
        id: 'valid-app',
        title: 'Valid App',
        icon: 'valid.png',
      },
    ]);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

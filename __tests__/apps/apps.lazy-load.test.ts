import apps, { games, utilities } from '../../apps.config';

describe('apps.config load hints', () => {
  const findApp = (collection: any[], id: string) =>
    collection.find((app) => app.id === id);

  it('marks heavy applications for lazy loading', () => {
    const heavyAppIds = ['ghidra', 'metasploit', 'wireshark'];
    heavyAppIds.forEach((id) => {
      const entry =
        findApp(apps, id) || findApp(games, id) || findApp(utilities, id);
      expect(entry).toBeDefined();
      expect(entry?.loadHints).toEqual(
        expect.objectContaining({
          strategy: 'lazy',
          prefetchOnHover: true,
          prefetchOnVisible: true,
        })
      );
    });
  });

  it('does not add lazy hints to lightweight tools', () => {
    const calculator = findApp(apps, 'calculator');
    expect(calculator).toBeDefined();
    expect(calculator?.loadHints).toBeUndefined();
  });
});

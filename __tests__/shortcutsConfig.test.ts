import { GLOBAL_SHORTCUTS, resolveShortcuts } from '../hooks/useShortcuts';

describe('shortcut registry', () => {
  test('has unique identifiers and bindings', () => {
    const ids = new Set<string>();
    const bindings = new Set<string>();
    for (const shortcut of GLOBAL_SHORTCUTS) {
      expect(ids.has(shortcut.id)).toBe(false);
      ids.add(shortcut.id);
      expect(bindings.has(shortcut.binding)).toBe(false);
      bindings.add(shortcut.binding);
    }
  });

  test('surfacing overrides reveals potential conflicts', () => {
    const overrides = new Map<string, string>([
      ['system.settings', 'A'],
      ['help.shortcuts', 'A'],
    ]);
    const resolved = resolveShortcuts(overrides);
    const conflicts = resolved.filter((shortcut) =>
      resolved.some(
        (candidate) =>
          candidate !== shortcut && candidate.keys === shortcut.keys
      )
    );
    expect(conflicts).toHaveLength(2);
  });
});

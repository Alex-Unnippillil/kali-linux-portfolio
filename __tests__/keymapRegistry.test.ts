import {
  applyShortcutUpdate,
  computeShortcutBindings,
  getDefaultShortcut,
  keyboardEventToCombo,
  KeymapConfig,
  KEYMAP_SCHEMA_VERSION,
  normalizeCombo,
  resolveKeymap,
  ShortcutId,
  ShortcutUpdateOutcome,
} from '../apps/settings/keymapRegistry';

const createConfig = (overrides: Partial<Record<ShortcutId, string>> = {}): KeymapConfig => ({
  version: KEYMAP_SCHEMA_VERSION,
  overrides,
});

describe('keymapRegistry', () => {
  it('normalizes modifier ordering', () => {
    expect(normalizeCombo('shift+ctrl+a')).toBe('Ctrl+Shift+A');
    expect(normalizeCombo('Alt + Meta + b')).toBe('Alt+Meta+B');
    expect(normalizeCombo('Shift+?')).toBe('?');
  });

  it('computes bindings with defaults when no overrides exist', () => {
    const config = createConfig();
    const bindings = computeShortcutBindings(config);
    bindings.forEach((binding) => {
      expect(binding.keys).toBe(binding.default);
      expect(binding.isDefault).toBe(true);
      expect(binding.conflicts).toHaveLength(0);
    });
  });

  it('updates bindings and reverts conflicts to defaults', () => {
    let config = createConfig();

    [config] = applyShortcutUpdate(config, 'open-settings', 'Ctrl+K');
    expect(resolveKeymap(config)['open-settings']).toBe('Ctrl+K');

    let outcome: ShortcutUpdateOutcome;
    [config, outcome] = applyShortcutUpdate(config, 'show-shortcuts', 'Ctrl+K');

    expect(outcome.reverted).toContain('open-settings');
    const resolved = resolveKeymap(config);
    expect(resolved['show-shortcuts']).toBe('Ctrl+K');
    expect(resolved['open-settings']).toBe(
      getDefaultShortcut('open-settings'),
    );
  });

  it('derives combos from keyboard events', () => {
    const questionMark = new KeyboardEvent('keydown', {
      key: '?',
      shiftKey: true,
    });
    expect(keyboardEventToCombo(questionMark)).toBe('?');

    const clipboard = new KeyboardEvent('keydown', {
      key: 'v',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(keyboardEventToCombo(clipboard)).toBe('Ctrl+Shift+V');
  });
});

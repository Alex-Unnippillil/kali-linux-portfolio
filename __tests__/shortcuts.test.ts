import { formatShortcutEvent, isTypingTarget } from '../utils/shortcuts';

describe('shortcut helpers', () => {
  it('formats ctrl comma shortcuts', () => {
    expect(
      formatShortcutEvent({
        ctrlKey: true,
        key: ',',
      })
    ).toBe('Ctrl+,');
  });

  it('ignores modifier-only keys', () => {
    expect(formatShortcutEvent({ ctrlKey: true, key: 'Control' })).toBe('');
  });

  it('detects typing targets', () => {
    const input = document.createElement('input');
    const div = document.createElement('div');

    expect(isTypingTarget(input)).toBe(true);
    expect(isTypingTarget(div)).toBe(false);
  });
});

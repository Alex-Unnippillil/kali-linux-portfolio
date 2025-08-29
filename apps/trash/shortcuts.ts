import { registerShortcut } from '../../utils/shortcutRegistry';

export function bindEmptyShortcut(handler: () => void) {
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && e.shiftKey) {
      e.preventDefault();
      handler();
    }
  };
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}

registerShortcut({ keys: 'Shift+Delete', description: 'Empty trash' });

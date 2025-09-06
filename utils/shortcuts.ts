export interface ShortcutHandlers {
  switchWorkspace: (direction: number) => void;
  cycleWindows: (direction: number) => void;
  close: () => void;
  endCycle?: () => void;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function bindShortcuts(handlers: ShortcutHandlers) {
  const keydown = (e: KeyboardEvent) => {
    if (isEditable(e.target)) return;
    if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      handlers.switchWorkspace(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.altKey && !e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      handlers.cycleWindows(e.shiftKey ? -1 : 1);
    } else if (e.altKey && !e.ctrlKey && e.key === 'F4') {
      e.preventDefault();
      handlers.close();
    }
  };

  const keyup = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
      handlers.endCycle?.();
    }
  };

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  return () => {
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
  };
}

export default bindShortcuts;

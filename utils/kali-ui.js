let previousActive;
let trapContainer;

function getFocusable(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  return Array.from(container.querySelectorAll(selectors.join(',')));
}

export function trapFocus(container) {
  if (!container) return;
  trapContainer = container;
  previousActive = document.activeElement;
  const focusable = getFocusable(container);
  if (focusable.length) {
    focusable[0].focus();
  }
  container.addEventListener('keydown', handleKey);
}

function handleKey(e) {
  if (e.key !== 'Tab' || !trapContainer) return;
  const focusable = getFocusable(trapContainer);
  if (focusable.length === 0) return;
  const idx = focusable.indexOf(document.activeElement);
  if (e.shiftKey) {
    if (idx <= 0) {
      e.preventDefault();
      focusable[focusable.length - 1].focus();
    }
  } else {
    if (idx === focusable.length - 1) {
      e.preventDefault();
      focusable[0].focus();
    }
  }
}

export function releaseFocus() {
  if (trapContainer) {
    trapContainer.removeEventListener('keydown', handleKey);
    trapContainer = null;
  }
  if (previousActive && typeof previousActive.focus === 'function') {
    previousActive.focus();
  }
  previousActive = null;
}

const focusUtils = { trapFocus, releaseFocus };

export default focusUtils;

import React from 'react';

/**
 * Utility functions for managing desktop icons.
 */
export function autoArrange(): void {
  const container = document.getElementById('desktop');
  if (!container) return;
  const icons = Array.from(
    container.querySelectorAll<HTMLElement>('#desktop [data-context="app"]')
  );
  icons
    .sort((a, b) => {
      const aLabel = (a.getAttribute('aria-label') || '').toLowerCase();
      const bLabel = (b.getAttribute('aria-label') || '').toLowerCase();
      return aLabel.localeCompare(bLabel);
    })
    .forEach((icon, index) => {
      icon.style.order = String(index);
    });
}

export function refreshIcons(): void {
  const icons = document.querySelectorAll<HTMLElement>(
    '#desktop [data-context="app"]'
  );
  icons.forEach((icon) => {
    icon.classList.add('icon-refresh');
    setTimeout(() => {
      icon.classList.remove('icon-refresh');
    }, 300);
  });
}

// Placeholder React component (not used directly but helps TypeScript treat file as TSX)
export default function DesktopIcons(): React.JSX.Element | null {
  return null;
}

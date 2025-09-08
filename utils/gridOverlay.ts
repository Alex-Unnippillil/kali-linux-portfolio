const OVERLAY_ID = 'grid-overlay-style';
let styleEl: HTMLStyleElement | null = null;

export function toggleGridOverlay(): void {
  if (typeof document === 'undefined') return;

  if (styleEl) {
    styleEl.remove();
    styleEl = null;
    return;
  }

  styleEl = document.createElement('style');
  styleEl.id = OVERLAY_ID;
  styleEl.textContent = `
    body::before {
      content: '';
      pointer-events: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background-image:
        linear-gradient(to right, rgba(255,0,0,0.3) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,0,0,0.3) 1px, transparent 1px);
      background-size: 1rem 1rem;
    }
  `;
  document.head.appendChild(styleEl);
}

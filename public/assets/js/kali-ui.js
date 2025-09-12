(function () {
  const ACCENT_KEY = 'kali:accent';
  const root = document.documentElement;
  const defaultAccent = getComputedStyle(root).getPropertyValue('--color-accent').trim();
  const altAccent = getComputedStyle(root).getPropertyValue('--accent-2').trim();

  function applyAccent(color) {
    root.style.setProperty('--color-accent', color);
    try {
      localStorage.setItem(ACCENT_KEY, color === altAccent ? 'purple' : 'default');
    } catch (_) {
      /* ignore */
    }
  }

  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    if (stored === 'purple') {
      applyAccent(altAccent);
    }
  } catch (_) {
    /* ignore */
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('[data-accent-toggle]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = getComputedStyle(root).getPropertyValue('--color-accent').trim();
      const next = current === altAccent ? defaultAccent : altAccent;
      applyAccent(next);
    });
  });
})();

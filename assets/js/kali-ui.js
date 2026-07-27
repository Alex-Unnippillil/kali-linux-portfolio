(function () {
  const THEME_KEY = 'kali:theme';
  const THEMES = ['dark', 'light', 'undercover'];

  const menu = document.querySelector('[data-menu]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const themeBtn = document.querySelector('[data-theme-toggle]');
  const clockEl = document.querySelector('[data-clock]');
  const searchInput = document.querySelector('[data-search]');
  const searchItems = Array.from(document.querySelectorAll('[data-search-item]'));

  let releaseTrap = null;

  function trapFocus(container) {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const focusable = Array.from(container.querySelectorAll(selectors));
    if (!focusable.length) return () => {};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function handle(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    container.addEventListener('keydown', handle);
    return () => container.removeEventListener('keydown', handle);
  }

  function openMenu() {
    if (!menu || !menuBtn) return;
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    releaseTrap = trapFocus(menu);
    const first = menu.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
  }

  function closeMenu() {
    if (!menu || !menuBtn) return;
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    if (releaseTrap) releaseTrap();
    menuBtn.focus();
  }

  function toggleMenu() {
    if (!menu || !menuBtn) return;
    if (menu.hidden) openMenu();
    else closeMenu();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    if (themeBtn) {
      themeBtn.textContent = theme;
      themeBtn.setAttribute('aria-pressed', String(theme !== 'light'));
    }
  }

  function cycleTheme() {
    const current = (function () {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch {
        return null;
      }
    })();
    let index = THEMES.indexOf(current || '');
    if (index === -1) index = 0;
    const next = THEMES[(index + 1) % THEMES.length];
    applyTheme(next);
  }

  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}
    if (!stored) stored = 'dark';
    applyTheme(stored);
  }

  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString();
  }

  if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
    if (e.key === 'm') toggleMenu();
    if (e.key === 't') cycleTheme();
    if (e.key === '/' && searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

  if (searchInput && searchItems.length) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.toLowerCase();
      searchItems.forEach((el) => {
        const match = el.textContent.toLowerCase().includes(term);
        el.hidden = !match;
      });
    });
  }

  if (clockEl) {
    updateClock();
    setInterval(updateClock, 1000);
  }

  initTheme();
})();


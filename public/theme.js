(function () {
  var THEME_KEY = 'app:theme';
  var FALLBACK_THEME = 'kali';
  var DARK_THEMES = ['dark', 'neon', 'matrix'];

  var normalizeTheme = function (theme) {
    if (!theme) return FALLBACK_THEME;
    return theme === 'default' ? FALLBACK_THEME : theme;
  };

  try {
    var stored = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
      if (stored === 'default') {
        window.localStorage.setItem(THEME_KEY, FALLBACK_THEME);
        stored = FALLBACK_THEME;
      }
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = stored ? normalizeTheme(stored) : prefersDark ? 'dark' : FALLBACK_THEME;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', DARK_THEMES.includes(theme));
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = FALLBACK_THEME;
    document.documentElement.classList.remove('dark');
  }
})();

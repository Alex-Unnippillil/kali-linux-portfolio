(function () {
  var THEME_KEY = 'app:theme';
  try {
    var stored = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = stored || (prefersDark ? 'dark' : 'default');
    var resolved = theme === 'system' ? (prefersDark ? 'dark' : 'default') : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = theme;
    var darkThemes = ['dark', 'neon', 'matrix', 'high-contrast'];
    document.documentElement.classList.toggle('dark', darkThemes.includes(resolved));
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
  }
})();

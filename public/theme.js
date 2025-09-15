(function () {
  var THEME_KEY = 'app:theme';
  var THEMES = ['light', 'dark', 'high-contrast'];
  var DARK_THEMES = ['dark', 'high-contrast'];

  try {
    var stored = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = prefersDark ? 'dark' : 'light';
    if (stored && THEMES.indexOf(stored) !== -1) {
      theme = stored;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', DARK_THEMES.indexOf(theme) !== -1);
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.classList.add('dark');
  }
})();

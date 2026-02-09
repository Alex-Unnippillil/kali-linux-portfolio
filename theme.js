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
    document.documentElement.dataset.theme = theme;
    var darkThemes = ['default', 'dark', 'neon', 'matrix'];
    document.documentElement.classList.toggle('dark', darkThemes.includes(theme));
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
  }
})();

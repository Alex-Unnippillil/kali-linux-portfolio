(function () {
  var THEME_KEY = 'app:theme';
  var COLOR_KEY = 'reduced-color';
  try {
    var stored = null;
    var colorPref = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
      colorPref = window.localStorage.getItem(COLOR_KEY);
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = stored || (prefersDark ? 'dark' : 'default');
    document.documentElement.dataset.theme = theme;
    var darkThemes = ['dark', 'neon', 'matrix'];
    document.documentElement.classList.toggle('dark', darkThemes.includes(theme));
    if (colorPref === 'true') {
      document.documentElement.dataset.color = 'reduced';
    }
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
  }
})();

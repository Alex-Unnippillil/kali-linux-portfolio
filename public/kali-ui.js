(function () {
  var THEME_KEY = 'app:theme';
  var ACCENT_KEY = 'accent';
  try {
    var storedTheme = null;
    var storedAccent = null;
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      storedTheme = window.localStorage.getItem(THEME_KEY);
      storedAccent = window.localStorage.getItem(ACCENT_KEY);
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = storedTheme || (prefersDark ? 'dark' : 'default');
    document.documentElement.dataset.theme = theme;
    var darkThemes = ['dark', 'neon', 'matrix'];
    document.documentElement.classList.toggle('dark', darkThemes.includes(theme));

    if (storedAccent) {
      document.documentElement.style.setProperty('--color-primary', storedAccent);
    }
  } catch (e) {
    console.error('Failed to apply theme/accent', e);
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
  }
})();

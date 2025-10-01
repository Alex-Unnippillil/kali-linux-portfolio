(function () {
  var THEME_KEY = 'app:theme';
  var DIR_KEY = 'app:direction';
  try {
    var stored = null;
    var storedDir = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
      storedDir = window.localStorage.getItem(DIR_KEY);
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = stored || (prefersDark ? 'dark' : 'default');
    var dir = storedDir === 'rtl' ? 'rtl' : 'ltr';

    document.documentElement.dataset.theme = theme;
    var darkThemes = ['dark', 'neon', 'matrix'];
    document.documentElement.classList.toggle('dark', darkThemes.includes(theme));
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.dataset.direction = dir;
    document.documentElement.classList.toggle('direction-rtl', dir === 'rtl');
    document.documentElement.classList.toggle('direction-ltr', dir === 'ltr');
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.dataset.direction = 'ltr';
    document.documentElement.classList.remove('direction-rtl');
    document.documentElement.classList.add('direction-ltr');
  }
})();

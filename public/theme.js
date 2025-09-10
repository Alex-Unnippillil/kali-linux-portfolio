
(function () {
  var THEME_KEY = 'app:theme';
  var darkThemes = ['dark', 'neon', 'matrix', 'kali-dark'];

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    var stored = null;
    if (typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
    }

    var prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'kali-dark' : 'kali-light');

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle(
      'dark',
      darkThemes.includes(theme)
    );
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'kali-dark';
    document.documentElement.classList.add('dark');
  }
})();

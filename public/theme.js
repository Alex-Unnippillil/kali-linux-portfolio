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
    var theme = stored || 'auto';
    var resolved = theme === 'auto' ? (prefersDark ? 'kali-dark' : 'kali-light') : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.classList.toggle('dark', resolved === 'kali-dark');
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'kali-dark';
    document.documentElement.classList.add('dark');
  }
})();

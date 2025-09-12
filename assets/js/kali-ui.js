(function () {
  const THEME_KEY = 'app:theme';
  try {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (storedTheme) {
      document.documentElement.dataset.theme = storedTheme;
      return;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
})();

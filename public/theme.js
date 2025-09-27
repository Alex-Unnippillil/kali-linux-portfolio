(function () {
  var THEME_KEY = 'app:theme';
  var SYSTEM_THEME = 'system';
  var DARK_THEMES = ['dark', 'neon', 'matrix'];
  var PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';

  function isDarkTheme(theme) {
    return DARK_THEMES.indexOf(theme) !== -1;
  }

  function resolveSystemTheme() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return 'light';
    }
    return window.matchMedia(PREFERS_DARK_QUERY).matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    if (typeof document === 'undefined') return;
    var effective = theme === SYSTEM_THEME ? resolveSystemTheme() : theme;
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.theme = effective;
    var darkClassActive = isDarkTheme(effective);
    var prefersDarkColors = effective !== 'light';
    document.documentElement.classList.toggle('dark', darkClassActive);
    document.documentElement.style.setProperty(
      'color-scheme',
      prefersDarkColors ? 'dark' : 'light'
    );
  }

  try {
    var stored = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
    }
    var theme = stored || SYSTEM_THEME;
    applyTheme(theme);

    if (theme === SYSTEM_THEME && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      var media = window.matchMedia(PREFERS_DARK_QUERY);
      var handler = function () {
        applyTheme(SYSTEM_THEME);
      };
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', handler);
      } else if (typeof media.addListener === 'function') {
        media.addListener(handler);
      }
    }
  } catch (e) {
    console.error('Failed to apply theme', e);
    applyTheme('default');
  }
})();

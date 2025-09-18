(function () {
  var THEME_KEY = 'app:theme';
  var HIGH_CONTRAST_KEY = 'high-contrast';
  var DEFAULT_THEME = 'default';
  var DARK_THEMES = ['dark', 'neon', 'matrix'];

  function safeGetItem(key) {
    if (
      typeof window === 'undefined' ||
      typeof window.localStorage === 'undefined'
    ) {
      return null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function prefers(query) {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia(query).matches;
    } catch (err) {
      return false;
    }
  }

  function applyColorScheme(theme) {
    var isDark = DARK_THEMES.indexOf(theme) !== -1;
    var colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = colorScheme;
    document.documentElement.dataset.colorScheme = colorScheme;
  }

  function applyHighContrast(value) {
    document.documentElement.classList.toggle('high-contrast', value);
    document.documentElement.dataset.contrast = value ? 'high' : 'standard';
  }

  try {
    var storedTheme = safeGetItem(THEME_KEY);
    var prefersDark = prefers('(prefers-color-scheme: dark)');
    var theme = storedTheme || (prefersDark ? 'dark' : DEFAULT_THEME);
    applyColorScheme(theme);

    var storedContrast = safeGetItem(HIGH_CONTRAST_KEY);
    var highContrast =
      storedContrast === null
        ? prefers('(prefers-contrast: more)')
        : storedContrast === 'true';
    applyHighContrast(highContrast);
  } catch (e) {
    console.error('Failed to apply theme', e);
    applyColorScheme(DEFAULT_THEME);
    applyHighContrast(false);
  }
})();

(function () {
  var THEME_KEY = 'app:theme';
  var DARK_THEMES = ['kali-dark', 'kali-blue-deep'];
  var DEFAULT_DARK = 'kali-dark';
  var DEFAULT_LIGHT = 'kali-blue-deep';

  var syncDesktopTheme = function (theme) {
    var desktop = document.getElementById('desktop');
    if (!desktop) return false;
    desktop.setAttribute('data-theme', theme);
    return true;
  };

  var applyTheme = function (theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', DARK_THEMES.indexOf(theme) !== -1);
    if (!syncDesktopTheme(theme) && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function (_, obs) {
        if (syncDesktopTheme(theme)) {
          obs.disconnect();
        }
      });
      var target = document.documentElement || document;
      observer.observe(target, { childList: true, subtree: true });
    }
  };

  try {
    var stored = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      stored = window.localStorage.getItem(THEME_KEY);
    }

    var prefersDark = false;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    var theme = stored || (prefersDark ? DEFAULT_DARK : DEFAULT_LIGHT);
    applyTheme(theme);
  } catch (e) {
    console.error('Failed to apply theme', e);
    applyTheme(DEFAULT_DARK);
  }
})();

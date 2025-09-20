(function () {
  var THEME_KEY = 'app:theme';
  try {
    var updateThemeColorMeta = function () {
      try {
        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;
        var meta = head.querySelector('meta[name="theme-color"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'theme-color');
          head.appendChild(meta);
        }
        var computed = window
          .getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent')
          .trim();
        meta.setAttribute('content', computed || '#1793d1');
      } catch (metaError) {
        console.error('Failed to update theme-color meta tag', metaError);
      }
    };
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
    var darkThemes = ['dark', 'neon', 'matrix'];
    document.documentElement.classList.toggle('dark', darkThemes.includes(theme));
    updateThemeColorMeta();
  } catch (e) {
    console.error('Failed to apply theme', e);
    document.documentElement.dataset.theme = 'default';
    document.documentElement.classList.remove('dark');
    try {
      var fallbackMeta = document.querySelector('meta[name="theme-color"]');
      if (fallbackMeta) fallbackMeta.setAttribute('content', '#1793d1');
    } catch (metaError) {
      console.error('Failed to set fallback theme-color meta tag', metaError);
    }
  }
})();

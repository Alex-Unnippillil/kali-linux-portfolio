(function () {
  var THEME_KEY = 'app:theme';
  var CONTRAST_KEY = 'high-contrast';
  var MOTION_KEY = 'reduced-motion';
  var root = document.documentElement;
  root.classList.remove('high-contrast');
  root.classList.remove('reduced-motion');

  try {
    var storedTheme = null;
    var storedContrast = null;
    var storedMotion = null;

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      storedTheme = window.localStorage.getItem(THEME_KEY);
      storedContrast = window.localStorage.getItem(CONTRAST_KEY);
      storedMotion = window.localStorage.getItem(MOTION_KEY);
    }

    var prefersDark = false;
    var prefersHighContrast = false;
    var prefersReducedMotion = false;

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
      prefersReducedMotion = window
        .matchMedia('(prefers-reduced-motion: reduce)')
        .matches;
    }

    var theme = storedTheme || (prefersDark ? 'dark' : 'default');
    root.dataset.theme = theme;
    var darkThemes = ['dark', 'neon', 'matrix'];
    root.classList.toggle('dark', darkThemes.includes(theme));

    var highContrast = storedContrast === 'true';
    if (storedContrast === null) {
      highContrast = prefersHighContrast;
    }
    root.dataset.contrast = highContrast ? 'high' : 'standard';

    var reducedMotion = storedMotion === 'true';
    if (storedMotion === null) {
      reducedMotion = prefersReducedMotion;
    }
    root.dataset.motion = reducedMotion ? 'reduced' : 'standard';
  } catch (e) {
    console.error('Failed to apply theme', e);
    root.dataset.theme = 'default';
    root.dataset.contrast = 'standard';
    root.dataset.motion = 'standard';
    root.classList.remove('dark');
  }
})();

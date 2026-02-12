(function () {
  const THEME_KEY = 'app:theme';
  const DARK_THEMES = ['dark', 'neon', 'matrix'];

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', DARK_THEMES.includes(theme));
  };

  const setStoredTheme = (theme) => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore storage errors */
    }
    applyTheme(theme);
  };

  const init = () => {
    let theme = null;
    try {
      theme = window.localStorage.getItem(THEME_KEY);
    } catch {
      theme = null;
    }

    if (!theme) {
      let prefersDark = false;
      try {
        prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {
        prefersDark = false;
      }

      if (prefersDark) {
        theme = 'dark';
      } else {
        const hour = new Date().getHours();
        theme = hour >= 18 || hour < 7 ? 'dark' : 'default';
      }
    }

    applyTheme(theme || 'default');
  };

  // expose setter for manual selection persistence
  window.kaliTheme = {
    set: setStoredTheme,
  };

  init();
})();

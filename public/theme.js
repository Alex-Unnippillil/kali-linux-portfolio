(function () {
  var THEME_KEY = 'app:theme';
  try {
    var stored = localStorage.getItem(THEME_KEY);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'default');
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();

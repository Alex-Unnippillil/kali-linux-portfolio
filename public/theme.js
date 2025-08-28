(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored ? stored : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();

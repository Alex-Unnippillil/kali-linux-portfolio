(function () {
  try {
    document.documentElement.dataset.theme = 'kali';
    var scheme = localStorage.getItem('color-scheme');
    if (scheme) {
      document.documentElement.dataset.colorScheme = scheme;
    }
  } catch (e) {}
})();

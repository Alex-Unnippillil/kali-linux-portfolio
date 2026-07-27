(function () {
  function findSearchInput() {
    var selectors = [
      '.all-apps-anim input',
      '.window-switcher input',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function handleSlash(e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    var input = findSearchInput();
    if (!input) return;
    e.preventDefault();
    input.focus();
    input.value = '';
    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {}
  }

  window.addEventListener('keydown', handleSlash);
})();

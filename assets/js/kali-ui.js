(function () {
  const vimMap = {
    h: 'ArrowLeft',
    j: 'ArrowDown',
    k: 'ArrowUp',
    l: 'ArrowRight',
  };

  function isOverlayActive() {
    return Boolean(
      document.querySelector('.kali-drawer.active, .kali-palette.active')
    );
  }

  document.addEventListener('keydown', (e) => {
    const arrow = vimMap[e.key];
    if (!arrow || !isOverlayActive()) return;

    const grid = document.querySelector('.kali-grid');
    const drawer = document.querySelector('.kali-drawer');
    if (
      !document.activeElement.closest('.kali-grid') &&
      !document.activeElement.closest('.kali-drawer')
    ) {
      if (grid) {
        const firstLink = grid.querySelector('a');
        firstLink?.focus();
      } else if (drawer) {
        const firstItem = drawer.querySelector(
          'li a, li button, .drawer-item'
        );
        firstItem?.focus();
      }
    }

    e.preventDefault();
    const evt = new KeyboardEvent('keydown', {
      key: arrow,
      bubbles: true,
    });
    document.activeElement.dispatchEvent(evt);
  });
})();

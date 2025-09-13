(function () {
  function init() {
    const links = document.querySelectorAll('.wswitch a');
    if (!links.length) return;
    const sections = Array.from(links).map((link) => {
      const id = link.getAttribute('href').replace('#', '');
      return document.getElementById(id);
    });
    function update() {
      let current = null;
      sections.forEach((section) => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (
          rect.top <= window.innerHeight / 2 &&
          rect.bottom >= window.innerHeight / 2
        ) {
          current = section.id;
        }
      });
      links.forEach((link) => {
        const href = link.getAttribute('href').replace('#', '');
        if (href === current) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

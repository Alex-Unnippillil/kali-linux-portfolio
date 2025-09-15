(function () {
  async function loadSchemes() {
    try {
      const response = await globalThis.fetch('/assets/data/term-schemes.json');
      if (!response.ok) return;
      const schemes = await response.json();
      buildDrawer(schemes);
    } catch (err) {
      console.error('Failed to load terminal schemes', err);
    }
  }

  function buildDrawer(schemes) {
    const doc = globalThis.document;
    if (!doc) return;

    const drawer = doc.createElement('aside');
    drawer.id = 'term-scheme-drawer';
    drawer.style.position = 'fixed';
    drawer.style.bottom = '1rem';
    drawer.style.right = '-180px';
    drawer.style.width = '180px';
    drawer.style.background = '#111';
    drawer.style.color = '#fff';
    drawer.style.padding = '0.5rem';
    drawer.style.borderRadius = '4px 0 0 4px';
    drawer.style.transition = 'right 0.3s ease';
    drawer.style.zIndex = '1000';

    const toggle = doc.createElement('button');
    toggle.textContent = 'Themes';
    toggle.style.position = 'absolute';
    toggle.style.left = '-60px';
    toggle.style.top = '0';
    toggle.style.height = '100%';
    toggle.style.writingMode = 'vertical-rl';
    toggle.style.transform = 'rotate(180deg)';
    toggle.style.background = '#111';
    toggle.style.color = '#fff';
    toggle.style.border = 'none';
    toggle.style.cursor = 'pointer';

    const select = doc.createElement('select');
    select.style.width = '100%';
    Object.keys(schemes).forEach((name) => {
      const option = doc.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    drawer.appendChild(toggle);
    drawer.appendChild(select);
    doc.body.appendChild(drawer);

    toggle.addEventListener('click', () => {
      const open = drawer.style.right === '0px';
      drawer.style.right = open ? '-180px' : '0px';
    });

    select.addEventListener('change', () => applyScheme(schemes[select.value]));
    applyScheme(schemes[select.value] || schemes[Object.keys(schemes)[0]]);
  }

  function applyScheme(scheme) {
    const doc = globalThis.document;
    if (!doc) return;
    const terminals = doc.querySelectorAll('.terminal, .xterm');
    terminals.forEach((el) => {
      Object.entries(scheme).forEach(([key, value]) => {
        el.style.setProperty(key, value);
      });
    });
  }

  if (globalThis.addEventListener) {
    globalThis.addEventListener('DOMContentLoaded', loadSchemes);
  }
})();

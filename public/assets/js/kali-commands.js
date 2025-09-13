(function () {
  const index = [];

  function buildIndex() {
    index.length = 0;

    document.querySelectorAll('a[href]').forEach((a) => {
      const text = a.textContent.trim();
      if (!text) return;
      index.push({ type: 'link', text, href: a.href });
    });

    document
      .querySelectorAll('h1, h2, h3, h4, h5, h6')
      .forEach((h) => {
        const text = h.textContent.trim();
        if (!text) return;
        const href = h.id ? `#${h.id}` : '';
        index.push({ type: 'heading', text, href });
      });

    document
      .querySelectorAll('[data-drawer-item], [role="menuitem"]')
      .forEach((el) => {
        const text = el.textContent.trim();
        if (!text) return;
        const href = el.getAttribute('href') || el.dataset.href || '';
        index.push({ type: 'drawer', text, href });
      });
  }

  function rank(item, query) {
    const text = item.text.toLowerCase();
    const idx = text.indexOf(query);
    if (idx === -1) return Infinity;
    const typeBias = item.type === 'link' ? 0 : item.type === 'drawer' ? 1 : 2;
    return idx + typeBias;
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index
      .map((item) => ({ item, score: rank(item, q) }))
      .filter((r) => r.score !== Infinity)
      .sort((a, b) => a.score - b.score)
      .map((r) => r.item);
  }

  let overlay;
  let input;
  let list;
  let results = [];
  let selection = 0;

  function attachStyles() {
    const style = document.createElement('style');
    style.textContent = `
#kali-cmd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  align-items: flex-start;
  justify-content: center;
  z-index: 10000;
}
#kali-cmd-panel {
  margin-top: 10vh;
  background: #1f2937;
  color: #fff;
  width: 20rem;
  border-radius: 0.25rem;
  font-family: system-ui, sans-serif;
}
#kali-cmd-input {
  width: 100%;
  padding: 0.5rem;
  background: #000;
  color: #fff;
  border: none;
  outline: none;
}
#kali-cmd-list {
  max-height: 10rem;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}
#kali-cmd-list li {
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
#kali-cmd-list li.active {
  background: #374151;
}
`;
    document.head.appendChild(style);
  }

  function createPalette() {
    overlay = document.createElement('div');
    overlay.id = 'kali-cmd-overlay';
    overlay.innerHTML = `
      <div id="kali-cmd-panel">
        <input id="kali-cmd-input" type="text" placeholder="Search" />
        <ul id="kali-cmd-list"></ul>
      </div>
    `;
    document.body.appendChild(overlay);
    input = overlay.querySelector('#kali-cmd-input');
    list = overlay.querySelector('#kali-cmd-list');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    input.addEventListener('input', updateResults);
    input.addEventListener('keydown', handleKey);
  }

  function openPalette() {
    if (!overlay) {
      attachStyles();
      createPalette();
    }
    buildIndex();
    results = [];
    selection = 0;
    overlay.style.display = 'flex';
    input.value = '';
    updateResults();
    setTimeout(() => input.focus(), 0);
  }

  function closePalette() {
    if (overlay) overlay.style.display = 'none';
  }

  function updateResults() {
    results = search(input.value);
    selection = 0;
    renderResults();
  }

  function renderResults() {
    list.innerHTML = '';
    results.slice(0, 10).forEach((r, i) => {
      const li = document.createElement('li');
      li.textContent = r.text;
      li.className = i === selection ? 'active' : '';
      li.addEventListener('mouseenter', () => {
        selection = i;
        renderResults();
      });
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        navigate();
      });
      list.appendChild(li);
    });
  }

  function handleKey(e) {
    if (e.key === 'Enter') {
      navigate();
    } else if (e.key === 'Escape') {
      closePalette();
    } else if (e.key === 'ArrowDown') {
      if (selection < results.length - 1) {
        selection += 1;
        renderResults();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (selection > 0) {
        selection -= 1;
        renderResults();
      }
      e.preventDefault();
    }
  }

  function navigate() {
    const target = results[selection];
    if (target) {
      closePalette();
      if (target.href) window.location.href = target.href;
    }
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    }
  });
})();

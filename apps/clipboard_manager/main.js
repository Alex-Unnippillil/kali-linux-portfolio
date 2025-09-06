/* eslint-env browser */
import { isBrowser } from '../../utils/env';

if (isBrowser()) {
  const historyKey = 'clipboardHistory';
  let history = JSON.parse(safeLocalStorage?.getItem(historyKey) || '[]');

  const list = document.getElementById('history');
  const clearBtn = document.getElementById('clear');
  const searchInput = document.getElementById('search');
  const typeFilter = document.getElementById('type-filter');

  const isUrl = (text) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const isHash = (text) => /^[a-fA-F0-9]{32,64}$/.test(text);

  function render() {
    list.innerHTML = '';
    const search = searchInput?.value.toLowerCase() || '';
    const type = typeFilter?.value || 'all';

    const filtered = history
      .filter((item) => {
        const matchesSearch = item.text.toLowerCase().includes(search);
        let matchesType = true;
        if (type === 'url') matchesType = isUrl(item.text);
        else if (type === 'hash') matchesType = isHash(item.text);
        else if (type === 'text') matchesType = !isUrl(item.text) && !isHash(item.text);
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (a.pinned === b.pinned) return 0;
        return a.pinned ? -1 : 1;
      });

    filtered.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      li.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(item.text);
        } catch (err) {
          console.error('Failed to copy text:', err);
        }
      });
      const pinBtn = document.createElement('button');
      pinBtn.className = 'pin';
      pinBtn.textContent = item.pinned ? '★' : '☆';
      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.pinned = !item.pinned;
        save();
        render();
      });
      li.appendChild(pinBtn);
      list.appendChild(li);
    });
  }

  function save() {
    safeLocalStorage?.setItem(historyKey, JSON.stringify(history));
  }

  clearBtn?.addEventListener('click', () => {
    history = history.filter((item) => item.pinned);
    save();
    render();
  });

  searchInput?.addEventListener('input', render);
  typeFilter?.addEventListener('change', render);

  document.addEventListener('copy', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (history.length === 0 || history[0].text !== text)) {
        history.unshift({ text, pinned: false });
        save();
        render();
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
    }
  });

  // initial render
  render();
}

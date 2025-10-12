/* eslint-env browser */
const historyKey = 'clipboardHistory';
let history = JSON.parse(localStorage.getItem(historyKey)) || [];


if (isBrowser) {
  const historyKey = 'clipboardHistory';
  let history = JSON.parse(safeLocalStorage?.getItem(historyKey) || '[]');

  const list = document.getElementById('history');
  const clearBtn = document.getElementById('clear');

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }

  function render() {
    list.innerHTML = '';
    history.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      li.className = 'clipboard-item';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Copy ${item}`);

      li.addEventListener('click', () => {
        void copyToClipboard(item);
      });

      li.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          void copyToClipboard(item);
        }
      });
      list.appendChild(li);
    });
  }

  function save() {
    safeLocalStorage?.setItem(historyKey, JSON.stringify(history));
  }

  clearBtn?.addEventListener('click', () => {
    history = [];
    save();
    render();
  });

  document.addEventListener('copy', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (history.length === 0 || history[0] !== text)) {
        history.unshift(text);
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

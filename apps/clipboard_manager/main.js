/* eslint-env browser */

if (isBrowser) {
  const historyKey = 'clipboardHistory';
  let history = JSON.parse(safeLocalStorage?.getItem(historyKey) || '[]');
  let maxItems = 20;
  let clearLabel = 'Clear history';

  const list = document.getElementById('history');
  const clearBtn = document.getElementById('clear');

  function render() {
    list.innerHTML = '';
    history.slice(0, maxItems).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      li.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(item);
        } catch (err) {
          console.error('Failed to copy text:', err);
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
        if (history.length > maxItems) {
          history = history.slice(0, maxItems);
        }
        save();
        render();
      }
    } catch (err) {
      console.error('Clipboard read failed:', err);
    }
  });

  fetch('clipman.json')
    .then((r) => r.json())
    .then((cfg) => {
      if (typeof cfg.maxItems === 'number') maxItems = cfg.maxItems;
      if (cfg.clearLabel && clearBtn) clearBtn.textContent = cfg.clearLabel;
    })
    .catch(() => {})
    .finally(() => {
      if (clearBtn && !clearBtn.textContent) clearBtn.textContent = clearLabel;
      render();
    });
}


/* eslint-env browser */
const historyKey = 'clipboardHistory';
let history = JSON.parse(localStorage.getItem(historyKey)) || [];


if (isBrowser) {
  const historyKey = 'clipboardHistory';
  let history = JSON.parse(safeLocalStorage?.getItem(historyKey) || '[]');

  const list = document.getElementById('history');
  const clearBtn = document.getElementById('clear');

  const setHTML = window.__appSetTrustedHTML || ((element, value) => {
    element.innerHTML = value;
  });

  function render() {
    setHTML(list, '');
    history.forEach((item) => {
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

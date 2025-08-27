/* eslint-env browser */
const historyKey = 'clipboardHistory';
let history = JSON.parse(localStorage.getItem(historyKey)) || [];

const list = document.getElementById('history');
const clearBtn = document.getElementById('clear');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

function render() {
  list.innerHTML = '';
  history.forEach((item) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = item;
    span.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item);
        showToast('Copied');
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    });
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item);
        showToast('Copied');
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    });
    li.appendChild(span);
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function save() {
  localStorage.setItem(historyKey, JSON.stringify(history));
}

clearBtn.addEventListener('click', () => {
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

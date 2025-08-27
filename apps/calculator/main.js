const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const sciToggle = document.getElementById('toggle-scientific');
const preciseToggle = document.getElementById('toggle-precise');
const scientific = document.getElementById('scientific');
const historyEl = document.getElementById('history');

const HISTORY_KEY = 'calc-history';
let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
let preciseMode = true;
let undoStack = [];

math.config({ number: 'BigNumber', precision: 64 });
preciseToggle.textContent = 'Precise Mode: On';
preciseToggle.setAttribute('aria-pressed', 'true');

sciToggle.addEventListener('click', () => {
  const isHidden = scientific.classList.toggle('hidden');
  sciToggle.setAttribute('aria-pressed', (!isHidden).toString());
});

preciseToggle.addEventListener('click', () => {
  preciseMode = !preciseMode;
  preciseToggle.textContent = `Precise Mode: ${preciseMode ? 'On' : 'Off'}`;
  preciseToggle.setAttribute('aria-pressed', preciseMode.toString());
  math.config(
    preciseMode
      ? { number: 'BigNumber', precision: 64 }
      : { number: 'number' }
  );
});

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value || btn.textContent;

    if (action === 'clear') {
      undoStack.push(display.textContent);
      display.textContent = '';
      return;
    }

    if (action === 'equals') {
      const expr = display.textContent;
      const result = evaluate(expr);
      addHistory(expr, result);
      undoStack.push(expr);
      display.textContent = result;
      return;
    }

    undoStack.push(display.textContent);
    display.textContent += value;
  });
});

function evaluate(expression) {
  try {
    const result = math.evaluate(expression);
    return math.format(result, { precision: 14 });
  } catch (e) {
    return 'Error';
  }
}

function addHistory(expr, result) {
  history.unshift({ expr, result });
  history = history.slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = '';
  history.forEach(({ expr, result }) => {
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    const text = document.createElement('span');
    text.textContent = `${expr} = ${result}`;
    const copy = document.createElement('button');
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(`${expr} = ${result}`);
    });
    entry.appendChild(text);
    entry.appendChild(copy);
    historyEl.appendChild(entry);
  });
}

function undo() {
  if (undoStack.length) {
    display.textContent = undoStack.pop();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
    return;
  }

  const key = e.key;
  if (/^[0-9.+\-*/()]$/.test(key)) {
    e.preventDefault();
    undoStack.push(display.textContent);
    display.textContent += key;
    return;
  }

  if (key === 'Enter' || key === '=') {
    e.preventDefault();
    const expr = display.textContent;
    const result = evaluate(expr);
    addHistory(expr, result);
    undoStack.push(expr);
    display.textContent = result;
    return;
  }

  if (key === 'Backspace') {
    e.preventDefault();
    undoStack.push(display.textContent);
    display.textContent = display.textContent.slice(0, -1);
    return;
  }

  if (key === 'Escape') {
    e.preventDefault();
    undoStack.push(display.textContent);
    display.textContent = '';
    return;
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    handleArrowNavigation(e);
  }
});

function handleArrowNavigation(e) {
  const containers = [
    document.querySelector('.buttons'),
    document.getElementById('scientific'),
  ];
  for (const container of containers) {
    if (container.classList.contains('hidden')) continue;
    if (container.contains(document.activeElement)) {
      const btns = Array.from(container.querySelectorAll('.btn'));
      const index = btns.indexOf(document.activeElement);
      const columns = 4;
      let nextIndex = index;
      switch (e.key) {
        case 'ArrowRight':
          if ((index + 1) % columns !== 0) nextIndex = index + 1;
          break;
        case 'ArrowLeft':
          if (index % columns !== 0) nextIndex = index - 1;
          break;
        case 'ArrowDown':
          if (index + columns < btns.length) nextIndex = index + columns;
          break;
        case 'ArrowUp':
          if (index - columns >= 0) nextIndex = index - columns;
          break;
      }
      btns[nextIndex]?.focus();
      e.preventDefault();
      break;
    }
  }
}

renderHistory();


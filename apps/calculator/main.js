const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const sciToggle = document.getElementById('toggle-scientific');
const preciseToggle = document.getElementById('toggle-precise');
const progToggle = document.getElementById('toggle-programmer');
const historyToggle = document.getElementById('toggle-history');
const scientific = document.getElementById('scientific');
const programmer = document.getElementById('programmer');
const baseSelect = document.getElementById('base-select');
const historyEl = document.getElementById('history');
const parenIndicator = document.getElementById('paren-indicator');
const printBtn = document.getElementById('print-tape');

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = 0;
let undoStack = [];
let history = [];
const HISTORY_KEY = 'calc-history';

function setPreciseMode(on) {
  preciseMode = on;
  if (preciseToggle) {
    preciseToggle.textContent = `Precise Mode: ${preciseMode ? 'On' : 'Off'}`;
    preciseToggle.setAttribute('aria-pressed', preciseMode.toString());
  }
  math.config(preciseMode ? { number: 'Fraction' } : { number: 'number' });
}

preciseToggle?.addEventListener('click', () => setPreciseMode(!preciseMode));

sciToggle?.addEventListener('click', () => {
  const isHidden = scientific.classList.toggle('hidden');
  sciToggle?.setAttribute('aria-pressed', (!isHidden).toString());
});

function setProgrammerMode(on) {
  programmerMode = on;
  programmer?.classList.toggle('hidden', !programmerMode);
  progToggle?.setAttribute('aria-pressed', programmerMode.toString());
}

progToggle?.addEventListener('click', () => setProgrammerMode(!programmerMode));

historyToggle?.addEventListener('click', () => {
  const isHidden = historyEl.classList.toggle('hidden');
  historyToggle?.setAttribute('aria-pressed', (!isHidden).toString());
});

baseSelect?.addEventListener('change', () => {
  currentBase = parseInt(baseSelect.value, 10);
  validateBaseInput();
});

printBtn?.addEventListener('click', printTape);

display?.addEventListener('input', () => {
  updateParenBalance();
  validateBaseInput();
});

function updateParenBalance() {
  const open = (display.value.match(/\(/g) || []).length;
  const close = (display.value.match(/\)/g) || []).length;
  const diff = open - close;
  parenIndicator.textContent = diff === 0 ? '' : diff > 0 ? `(${diff})` : 'Unbalanced';
}

function validateBaseInput(expr = display.value) {
  if (!programmerMode) {
    display.setCustomValidity('');
    return true;
  }
  const numbers = expr.match(/-?[0-9A-F]+/gi) || [];
  const validChars = '0123456789ABCDEF'.slice(0, currentBase);
  for (const num of numbers) {
    const clean = num.replace(/^-/, '').toUpperCase();
    if (![...clean].every((ch) => validChars.includes(ch))) {
      const msg = `Invalid digit for base ${currentBase}`;
      display.setCustomValidity(msg);
      return false;
    }
  }
  display.setCustomValidity('');
  return true;
}

function insertAtCursor(text) {
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;
  const before = display.value.slice(0, start);
  const after = display.value.slice(end);
  display.value = before + text + after;
  const pos = start + text.length;
  display.selectionStart = display.selectionEnd = pos;
}

function flashButton(btn) {
  if (!btn) return;
  btn.classList.add('active-key');
  setTimeout(() => btn.classList.remove('active-key'), 150);
}

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value || btn.textContent;

    if (action === 'clear') {
      undoStack.push(display.value);
      display.value = '';
      updateParenBalance();
      validateBaseInput();
      return;
    }

    if (action === 'backspace') {
      undoStack.push(display.value);
      display.value = display.value.slice(0, -1);
      updateParenBalance();
      validateBaseInput();
      return;
    }

    if (action === 'equals') {
      const expr = display.value;
      const result = evaluate(expr);
      if (result === null) return;
      addHistory(expr, result);
      undoStack.push(expr);
      display.value = result;
      lastResult = result;
      return;
    }

    if (action === 'ans') {
      insertAtCursor(formatBase(lastResult));
      return;
    }

    if (action === 'print') {
      printTape();
      return;
    }

    undoStack.push(display.value);
    insertAtCursor(value);
    updateParenBalance();
    validateBaseInput();
    display.focus();
  });
});

function convertBase(val, from, to) {
  const num = parseInt(val, from);
  if (isNaN(num)) return '0';
  const sign = num < 0 ? '-' : '';
  return sign + Math.abs(num).toString(to);
}

function formatBase(value, base = currentBase) {
  return convertBase(String(value), 10, base).toUpperCase();
}

function evaluate(expression) {
  try {
    if (programmerMode) {
      if (!validateBaseInput(expression)) {
        display.reportValidity?.();
        return null;
      }
      const decimalExpr = expression.replace(/\b[0-9A-F]+\b/gi, (m) =>
        parseInt(m, currentBase)
      );
      const result = math.evaluate(decimalExpr, { Ans: lastResult });
      lastResult = result;
      return formatBase(result);
    }
    const result = math.evaluate(expression, { Ans: lastResult });
    lastResult = result;
    return result.toString();
  } catch (e) {
    return 'Error';
  }
}

function renderHistory() {
  if (!historyEl) return;
  historyEl.innerHTML = '';
  history.forEach(({ expr, result }) => {
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    const text = document.createElement('span');
    text.textContent = `${expr} = ${result}`;
    entry.appendChild(text);
    historyEl.appendChild(entry);
  });
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistory(expr, result) {
  history.unshift({ expr, result });
  history = history.slice(0, 10);
  saveHistory();
  renderHistory();
}

function loadHistory() {
  if (!historyEl) return;
  history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history = history.slice(0, 10);
  renderHistory();
}

function printTape() {
  const text = history.map((h) => `${h.expr} = ${h.result}`).join('\n');
  const win = window.open('', '', 'width=400,height=600');
  win.document.write(`<pre>${text}</pre>`);
  win.print();
}

function undo() {
  if (undoStack.length) {
    display.value = undoStack.pop();
    updateParenBalance();
    validateBaseInput();
  }
}

function findButtonForKey(key) {
  if (/^[0-9]$/.test(key)) {
    return document.querySelector(`.btn[data-value="${key}"]`);
  }
  const valueMap = {
    '.': '.','+': '+','-': '-','*': '*','/': '/',
  };
  if (key in valueMap) {
    return document.querySelector(`.btn[data-value="${valueMap[key]}"]`);
  }
  if (key === 'Enter' || key === '=') {
    return document.querySelector('.btn[data-action="equals"]');
  }
  if (key === 'Backspace') {
    return document.querySelector('.btn[data-action="backspace"]');
  }
  return null;
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
    return;
  }

  const btn = findButtonForKey(e.key);
  if (btn) {
    e.preventDefault();
    flashButton(btn);
    btn.click();
    display.focus();
    return;
  }

  if (e.target !== display && /^[-+*/0-9A-F().&|^~<>]$/i.test(e.key)) {
    e.preventDefault();
    undoStack.push(display.value);
    insertAtCursor(e.key);
    updateParenBalance();
    validateBaseInput();
    display.focus();
  }
});

display?.focus();
loadHistory();

if (typeof module !== 'undefined') {
  module.exports = {
    evaluate,
    addHistory,
    loadHistory,
    HISTORY_KEY,
    setPreciseMode,
    setProgrammerMode,
    convertBase,
  };
}


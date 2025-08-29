const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const sciToggle = document.getElementById('toggle-scientific');
const preciseToggle = document.getElementById('toggle-precise');
const progToggle = document.getElementById('toggle-programmer');
const historyToggle = document.getElementById('toggle-history');
const scientific = document.getElementById('scientific');
const programmer = document.getElementById('programmer');
const standard = document.getElementById('standard');
const baseSelect = document.getElementById('base-select');
const historyEl = document.getElementById('history');
const parenIndicator = document.getElementById('paren-indicator');
const printBtn = document.getElementById('print-tape');

let preciseMode = false;
let programmerMode = false;
let scientificMode = false;
let currentBase = 10;
let lastResult = 0;
let undoStack = [];
let history = [];
let memory = 0;
let tapeFS;
const TAPE_FILE = 'calculator-tape.txt';
const HISTORY_KEY = 'calc-history';
const MODE_KEY = 'calc-mode';

function setPreciseMode(on) {
  preciseMode = on;
  if (preciseToggle) {
    preciseToggle.textContent = `Precise Mode: ${preciseMode ? 'On' : 'Off'}`;
    preciseToggle.setAttribute('aria-pressed', preciseMode.toString());
  }
  // switch math.js number type and maintain memory/last result types
  math.config(
    preciseMode
      ? { number: 'BigNumber', precision: 64 }
      : { number: 'number' }
  );
  if (preciseMode) {
    memory = math.bignumber(memory);
    lastResult = math.bignumber(lastResult);
  } else {
    memory = math.number(memory);
    lastResult = math.number(lastResult);
  }
  saveMode();
}

preciseToggle?.addEventListener('click', () => setPreciseMode(!preciseMode));

sciToggle?.addEventListener('click', () => {
  const isHidden = scientific.classList.toggle('hidden');
  scientificMode = !isHidden;
  sciToggle?.setAttribute('aria-pressed', scientificMode.toString());
  saveMode();
});

function setProgrammerMode(on) {
  programmerMode = on;
  programmer?.classList.toggle('hidden', !programmerMode);
  standard?.classList.toggle('hidden', programmerMode);
  progToggle?.setAttribute('aria-pressed', programmerMode.toString());
  saveMode();
}

progToggle?.addEventListener('click', () => setProgrammerMode(!programmerMode));

historyToggle?.addEventListener('click', () => {
  const isHidden = historyEl.classList.toggle('hidden');
  historyToggle?.setAttribute('aria-pressed', (!isHidden).toString());
});

baseSelect?.addEventListener('change', () => {
  currentBase = parseInt(baseSelect.value, 10);
  validateBaseInput();
  saveMode();
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

    if (action === 'mplus') {
      memoryAdd();
      return;
    }

    if (action === 'mminus') {
      memorySubtract();
      return;
    }

    if (action === 'mr') {
      memoryRecall();
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

function bitwiseAnd(a, b) {
  return (a | 0) & (b | 0);
}

function bitwiseOr(a, b) {
  return (a | 0) | (b | 0);
}

function bitwiseXor(a, b) {
  return (a | 0) ^ (b | 0);
}

function bitwiseNot(a) {
  return ~ (a | 0);
}

function shiftLeft(a, b) {
  return (a | 0) << (b | 0);
}

function shiftRight(a, b) {
  return (a | 0) >> (b | 0);
}

// --- Shunting-yard based parser ---
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'operator' || tokens[tokens.length - 1].value === '(')) {
      // unary minus
      const next = expr[i + 1];
      if (/\d|\./.test(next)) {
        let num = '-';
        i++;
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          num += expr[i];
          i++;
        }
        tokens.push({ type: 'number', value: num });
        continue;
      }
      tokens.push({ type: 'number', value: '0' });
      tokens.push({ type: 'operator', value: '-' });
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const id = expr.slice(i).match(/^[A-Za-z]+/)[0];
      tokens.push({ type: 'id', value: id });
      i += id.length;
      continue;
    }
    if ('+-*/^()'.includes(ch)) {
      tokens.push({ type: ch === '(' || ch === ')' ? 'paren' : 'operator', value: ch });
    }
    i++;
  }
  return tokens;
}

function toRPN(tokens) {
  const output = [];
  const ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssoc = { '^': true };
  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'id') {
      output.push(token);
    } else if (token.type === 'operator') {
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (
          top.type === 'operator' &&
          ((rightAssoc[token.value]
            ? prec[token.value] < prec[top.value]
            : prec[token.value] <= prec[top.value]))
        ) {
          output.push(ops.pop());
        } else {
          break;
        }
      }
      ops.push(token);
    } else if (token.value === '(') {
      ops.push(token);
    } else if (token.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') {
        output.push(ops.pop());
      }
      ops.pop();
    }
  }
  while (ops.length) output.push(ops.pop());
  return output;
}

function evalRPN(rpn) {
  const stack = [];
  for (const token of rpn) {
    if (token.type === 'number') {
      const num = preciseMode
        ? math.bignumber(token.value)
        : Number(token.value);
      stack.push(num);
    } else if (token.type === 'id') {
      const val = token.value.toLowerCase() === 'ans' ? lastResult : 0;
      stack.push(preciseMode ? math.bignumber(val) : Number(val));
    } else if (token.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      let res;
      if (preciseMode) {
        switch (token.value) {
          case '+':
            res = math.add(a, b);
            break;
          case '-':
            res = math.subtract(a, b);
            break;
          case '*':
            res = math.multiply(a, b);
            break;
          case '/':
            res = math.divide(a, b);
            break;
          case '^':
            res = math.pow(a, b);
            break;
        }
      } else {
        switch (token.value) {
          case '+':
            res = a + b;
            break;
          case '-':
            res = a - b;
            break;
          case '*':
            res = a * b;
            break;
          case '/':
            res = a / b;
            break;
          case '^':
            res = a ** b;
            break;
        }
      }
      stack.push(res);
    }
  }
  return stack.pop();
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
    const tokens = tokenize(expression);
    const rpn = toRPN(tokens);
    const result = evalRPN(rpn);
    lastResult = result;
    return preciseMode ? result.toString() : String(result);
  } catch (e) {
    return 'Error';
  }
}

function memoryAdd() {
  const val = evaluate(display.value);
  if (val === null || val === 'Error') return;
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? math.bignumber(val)
      : parseFloat(val);
  memory = preciseMode ? math.add(memory, num) : memory + num;
}

function memorySubtract() {
  const val = evaluate(display.value);
  if (val === null || val === 'Error') return;
  const num = programmerMode
    ? parseInt(val, currentBase)
    : preciseMode
      ? math.bignumber(val)
      : parseFloat(val);
  memory = preciseMode ? math.subtract(memory, num) : memory - num;
}

function memoryRecall() {
  const val = preciseMode ? memory.toString() : memory;
  display.value = formatBase(val);
  updateParenBalance();
  validateBaseInput();
  display.focus();
}

function copyHistory() {
  const text = history.map((h) => `${h.expr} = ${h.result}`).join('\n');
  navigator.clipboard?.writeText(text);
}

function undoHistory() {
  if (history.length) {
    history.shift();
    saveHistory();
    renderHistory();
  }
}

function renderHistory() {
  if (!historyEl) return;
  historyEl.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'history-header';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Search';
  header.appendChild(search);

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', copyHistory);
  header.appendChild(copyBtn);

  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.addEventListener('click', () => tapeFS?.download(TAPE_FILE));
  header.appendChild(downloadBtn);

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', undoHistory);
  header.appendChild(undoBtn);

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => {
    history = [];
    saveHistory();
    renderHistory();
  });
  header.appendChild(clearBtn);
  historyEl.appendChild(header);
  const list = document.createElement('div');
  list.id = 'history-list';
  historyEl.appendChild(list);

  function renderList(filter = '') {
    list.innerHTML = '';
    const term = filter.toLowerCase();
    history
      .filter(({ expr, result }) =>
        `${expr} = ${result}`.toLowerCase().includes(term)
      )
      .forEach(({ expr, result }) => {
        const entry = document.createElement('div');
        entry.className = 'history-entry';
        entry.addEventListener('click', () => {
          display.value = expr;
          updateParenBalance();
          validateBaseInput();
          display.focus();
        });
        const text = document.createElement('span');
        text.textContent = `${expr} = ${result}`;
        entry.appendChild(text);
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard?.writeText(`${expr} = ${result}`);
        });
        entry.appendChild(copyBtn);
        list.appendChild(entry);
      });
  }

  renderList();
  search.addEventListener('input', () => renderList(search.value));
}

async function saveHistory() {
  const text = history.map((h) => `${h.expr} = ${h.result}`).join('\n');
  if (tapeFS) {
    await tapeFS.write(text);
  } else {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

function saveMode() {
  localStorage.setItem(
    MODE_KEY,
    JSON.stringify({ preciseMode, programmerMode, scientificMode, currentBase })
  );
}

function addHistory(expr, result) {
  history.unshift({ expr, result });
  history = history.slice(0, 10);
  saveHistory();
  renderHistory();
}

async function loadHistory() {
  if (!historyEl) return;
  if (tapeFS) {
    const text = await tapeFS.read();
    history = text
      ? text
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [expr, result] = line.split(' = ');
            return { expr, result };
          })
      : [];
  } else {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  }
  history = history.slice(0, 10);
  renderHistory();
}

function loadMode() {
  const saved = JSON.parse(localStorage.getItem(MODE_KEY) || '{}');
  setPreciseMode(!!saved.preciseMode);
  setProgrammerMode(!!saved.programmerMode);
  scientificMode = !!saved.scientificMode;
  scientific?.classList.toggle('hidden', !scientificMode);
  sciToggle?.setAttribute('aria-pressed', scientificMode.toString());
  currentBase = saved.currentBase || 10;
  if (baseSelect) baseSelect.value = currentBase.toString();
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
  if (e.key.toLowerCase() === 'm') {
    e.preventDefault();
    if (e.ctrlKey && e.shiftKey) {
      memorySubtract();
      flashButton(document.querySelector('.btn[data-action="mminus"]'));
    } else if (e.ctrlKey) {
      memoryAdd();
      flashButton(document.querySelector('.btn[data-action="mplus"]'));
    } else {
      memoryRecall();
      flashButton(document.querySelector('.btn[data-action="mr"]'));
    }
    display.focus();
    return;
  }

  if (e.ctrlKey && e.shiftKey) {
    switch (e.key.toLowerCase()) {
      case 'c':
        e.preventDefault();
        copyHistory();
        return;
      case 'z':
        e.preventDefault();
        undoHistory();
        return;
      case 'l':
        e.preventDefault();
        history = [];
        saveHistory();
        renderHistory();
        return;
      case 'h':
        e.preventDefault();
        historyToggle?.click();
        return;
      case 's':
        e.preventDefault();
        sciToggle?.click();
        return;
    }
  }

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
loadMode();

(async () => {
  const { useOPFS } = await import('../../hooks/useOPFS');
  tapeFS = await useOPFS(TAPE_FILE);
  await loadHistory();
})();

if (typeof module !== 'undefined') {
  module.exports = {
    evaluate,
    addHistory,
    loadHistory,
    HISTORY_KEY,
    setPreciseMode,
    setProgrammerMode,
    convertBase,
    bitwiseAnd,
    bitwiseOr,
    bitwiseXor,
    bitwiseNot,
    shiftLeft,
    shiftRight,
  };
}


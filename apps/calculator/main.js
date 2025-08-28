import { evaluateExpression, parseExpression } from './parser.js';

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
const exportBtn = document.getElementById('export-tape');
const graphToggle = document.getElementById('toggle-graph');
const graphPanel = document.getElementById('graph-panel');
const graphCanvas = document.getElementById('graph-canvas');
const graphCopy = document.getElementById('graph-copy');

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let lastResult = 0;
let undoStack = [];
let tape = [];
let editIndex = null;
const TAPE_KEY = 'calc-tape';

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
exportBtn?.addEventListener('click', exportTape);

graphToggle?.addEventListener('click', () => {
  const isHidden = graphPanel.classList.toggle('hidden');
  graphToggle?.setAttribute('aria-pressed', (!isHidden).toString());
  if (!isHidden) drawGraph();
});

display?.addEventListener('input', () => {
  updateParenBalance();
  validateBaseInput();
  if (!graphPanel.classList.contains('hidden')) {
    drawGraph();
  }
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
      addTape(expr, result);
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

    if (action === 'export') {
      exportTape();
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

function evaluate(expression, scope = {}) {
  try {
    if (programmerMode) {
      if (!validateBaseInput(expression)) {
        display.reportValidity?.();
        return null;
      }
      const decimalExpr = expression.replace(/\b[0-9A-F]+\b/gi, (m) =>
        parseInt(m, currentBase)
      );
      const result = evaluateExpression(decimalExpr, { Ans: lastResult });
      lastResult = result;
      return formatBase(result);
    }
    const result = evaluateExpression(expression, { Ans: lastResult, ...scope });
    lastResult = result;
    return result.toString();
  } catch (e) {
    return 'Error';
  }
}

function renderTape() {
  if (!historyEl) return;
  historyEl.innerHTML = '';
  tape.forEach(({ expr, result }, i) => {
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    const text = document.createElement('span');
    text.textContent = `${expr} = ${result}`;
    entry.appendChild(text);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      display.value = expr;
      editIndex = i;
      updateParenBalance();
      validateBaseInput();
      display.focus();
    });
    entry.appendChild(editBtn);

    const replayBtn = document.createElement('button');
    replayBtn.textContent = 'Replay';
    replayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const res = evaluate(expr);
      if (res !== null) {
        addTape(expr, res);
        display.value = res;
      }
    });
    entry.appendChild(replayBtn);

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(`${expr} = ${result}`);
    });
    entry.appendChild(copyBtn);

    historyEl.appendChild(entry);
  });
}

function saveTape() {
  localStorage.setItem(TAPE_KEY, JSON.stringify(tape));
}

function addTape(expr, result) {
  if (editIndex !== null) {
    tape[editIndex] = { expr, result };
    editIndex = null;
  } else {
    tape.unshift({ expr, result });
  }
  tape = tape.slice(0, 20);
  saveTape();
  renderTape();
}

function loadTape() {
  if (!historyEl) return;
  tape = JSON.parse(localStorage.getItem(TAPE_KEY) || '[]');
  tape = tape.slice(0, 20);
  renderTape();
}

function printTape() {
  const text = tape.map((h) => `${h.expr} = ${h.result}`).join('\n');
  const win = window.open('', '', 'width=400,height=600');
  win.document.write(`<pre>${text}</pre>`);
  win.print();
}

function exportTape() {
  const text = JSON.stringify(tape, null, 2);
  navigator.clipboard?.writeText(text);
}

let graphRange = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

function drawGraph() {
  if (!graphCanvas) return;
  const ctx = graphCanvas.getContext('2d');
  const width = graphCanvas.width;
  const height = graphCanvas.height;
  ctx.clearRect(0, 0, width, height);
  const expr = display.value;
  let evalFn;
  try {
    evalFn = parseExpression(expr);
  } catch {
    return;
  }
  const scope = { Ans: lastResult };

  // axes
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  const x0 = ((0 - graphRange.xmin) / (graphRange.xmax - graphRange.xmin)) * width;
  const y0 = height - ((0 - graphRange.ymin) / (graphRange.ymax - graphRange.ymin)) * height;
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(width, y0);
  ctx.moveTo(x0, 0);
  ctx.lineTo(x0, height);
  ctx.stroke();

  ctx.strokeStyle = '#0074d9';
  ctx.beginPath();
  let first = true;
  const step = (graphRange.xmax - graphRange.xmin) / width;
  for (let x = graphRange.xmin; x <= graphRange.xmax; x += step) {
    scope.x = x;
    let y;
    try {
      y = evalFn(scope);
    } catch {
      y = NaN;
    }
    if (typeof y !== 'number' || !isFinite(y)) {
      first = true;
      continue;
    }
    const cx = ((x - graphRange.xmin) / (graphRange.xmax - graphRange.xmin)) * width;
    const cy = height - ((y - graphRange.ymin) / (graphRange.ymax - graphRange.ymin)) * height;
    if (first) {
      ctx.moveTo(cx, cy);
      first = false;
    } else {
      ctx.lineTo(cx, cy);
    }
  }
  ctx.stroke();
}

function onGraphZoom(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 1.2 : 0.8;
  const cx = (graphRange.xmin + graphRange.xmax) / 2;
  const cy = (graphRange.ymin + graphRange.ymax) / 2;
  const xRange = ((graphRange.xmax - graphRange.xmin) * factor) / 2;
  const yRange = ((graphRange.ymax - graphRange.ymin) * factor) / 2;
  graphRange.xmin = cx - xRange;
  graphRange.xmax = cx + xRange;
  graphRange.ymin = cy - yRange;
  graphRange.ymax = cy + yRange;
  drawGraph();
}

function copyGraph() {
  if (!graphCanvas) return;
  graphCanvas.toBlob((blob) => {
    if (!blob) return;
    const item = new ClipboardItem({ 'image/png': blob });
    navigator.clipboard?.write([item]);
  });
}

graphCanvas?.addEventListener('wheel', onGraphZoom);
graphCopy?.addEventListener('click', copyGraph);

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
loadTape();

if (typeof module !== 'undefined') {
  module.exports = {
    evaluate,
    addTape,
    loadTape,
    TAPE_KEY,
    setPreciseMode,
    setProgrammerMode,
    convertBase,
    parseExpression,
  };
}


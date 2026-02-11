const engine = require('./engine/index.ts');

let preciseMode = false;
let programmerMode = false;
let currentBase = 10;
let angleUnit = 'rad';
let bitWidth = 64;
let lastResult = '0';
let memory = 0;

const config = () => ({
  mode: programmerMode ? 'programmer' : 'scientific',
  preciseMode,
  base: currentBase,
  angleUnit,
  bitWidth,
  ans: lastResult,
});

function evaluate(expression, variables = {}) {
  let persisted = {};
  if (typeof window !== 'undefined') {
    try { persisted = JSON.parse(window.localStorage.getItem('calc-vars') || '{}'); } catch { persisted = {}; }
  }
  const result = engine.evaluate(expression, { ...config(), variables: { ...persisted, ...variables } });
  lastResult = result;
  return result;
}

function setPreciseMode(on) { preciseMode = Boolean(on); }
function setProgrammerMode(on) { programmerMode = Boolean(on); }
function setBase(base) { currentBase = base; }
function setAngleUnit(unit) { angleUnit = unit === 'deg' ? 'deg' : 'rad'; }
function setBitWidth(next) { bitWidth = Number(next) || 64; }
function convertBase(val, from, to) { return Number.parseInt(val, from).toString(to).toUpperCase(); }
function formatBase(value) { return engine.formatResult(value, { mode: 'programmer', base: currentBase, bitWidth }); }
function getLastResult() { return lastResult; }

function memoryAdd(expr) {
  memory += Number(evaluate(expr));
  return memory;
}
function memorySubtract(expr) {
  memory -= Number(evaluate(expr));
  return memory;
}
function memoryRecall() {
  return String(memory);
}

module.exports = {
  ...engine,
  evaluate,
  setPreciseMode,
  setProgrammerMode,
  setBase,
  setAngleUnit,
  setBitWidth,
  convertBase,
  formatBase,
  getLastResult,
  memoryAdd,
  memorySubtract,
  memoryRecall,
};

const { JSDOM } = require('jsdom');
const { TextEncoder, TextDecoder } = require('util');

function setupDom() {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <input id="display" />
      <div class="buttons"></div>
      <button id="toggle-scientific"></button>
      <button id="toggle-precise"></button>
      <button id="toggle-programmer"></button>
      <button id="toggle-history"></button>
      <div id="scientific"></div>
      <div id="programmer"></div>
      <select id="base-select"></select>
      <div id="history"></div>
      <div id="paren-indicator"></div>
      <button id="print-tape"></button>
    </body></html>`,
    { url: 'https://example.org' }
  );
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.navigator = dom.window.navigator;
  global.math = require('mathjs');
}

describe('calculator', () => {
  beforeEach(() => {
    jest.resetModules();
    setupDom();
  });

  test('1.1 + 2.2 equals 3.3', () => {
    const calc = require('../apps/calculator/main.js');
    calc.setPreciseMode(true);
    expect(calc.evaluate('1.1+2.2')).toBe('3.3');
  });

  test('history capped at 10', () => {
    const calc = require('../apps/calculator/main.js');
    for (let i = 0; i < 12; i++) {
      calc.addHistory(String(i), String(i));
    }
    const stored = JSON.parse(localStorage.getItem(calc.HISTORY_KEY));
    expect(stored).toHaveLength(10);
  });

  test('Enter evaluates', () => {
    const calc = require('../apps/calculator/main.js');
    const display = document.getElementById('display');
    display.value = '1+1';
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));
    expect(display.value).toBe('2');
  });

  test('base conversions round trip', () => {
    const calc = require('../apps/calculator/main.js');
    const hex = 'FF';
    const bin = calc.convertBase(hex, 16, 2);
    expect(calc.convertBase(bin, 2, 16).toUpperCase()).toBe(hex);
  });
});


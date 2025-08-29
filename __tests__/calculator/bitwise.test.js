const { TextEncoder, TextDecoder } = require('util');
const { JSDOM } = require('jsdom');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

function setupDom() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <input id="display" />
    <button id="toggle-precise"></button>
    <button id="toggle-scientific"></button>
    <button id="toggle-programmer"></button>
    <button id="toggle-history"></button>
    <div id="scientific"></div>
    <div id="programmer"></div>
    <div id="standard"></div>
    <select id="base-select"></select>
    <div id="history"></div>
    <div id="paren-indicator"></div>
    <button id="print-tape"></button>
  </body></html>`, { url: 'https://example.com' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.navigator = dom.window.navigator;
  const { create, all } = require('mathjs');
  global.math = create(all);
}

describe('bitwise and base conversion', () => {
  beforeEach(() => {
    jest.resetModules();
    setupDom();
  });

  test('bitwise operations work', () => {
    const calc = require('../../apps/calculator/main.js');
    expect(calc.bitwiseAnd(6, 3)).toBe(2);
    expect(calc.bitwiseOr(6, 3)).toBe(7);
    expect(calc.bitwiseXor(6, 3)).toBe(5);
    expect(calc.bitwiseNot(6)).toBe(~6);
    expect(calc.shiftLeft(3, 2)).toBe(12);
    expect(calc.shiftRight(8, 2)).toBe(2);
  });

  test('base conversions round trip', () => {
    const calc = require('../../apps/calculator/main.js');
    const hex = 'FF';
    const bin = calc.convertBase(hex, 16, 2);
    expect(calc.convertBase(bin, 2, 16).toUpperCase()).toBe(hex);
  });
});
